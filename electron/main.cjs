const fs = require("node:fs/promises");
const path = require("node:path");
const { app, BrowserWindow, ipcMain, shell } = require("electron");
const {
  InteractionRequiredAuthError,
  PublicClientApplication,
} = require("@azure/msal-node");
const {
  createIntuneGraphClient,
  validateIntuneConfig,
} = require("./intune-client.cjs");

const INTUNE_SCOPES = ["DeviceManagementManagedDevices.Read.All"];
const INTUNE_PORTAL = "https://intune.microsoft.com/";
const VERIFICATION_HOSTS = new Set([
  "microsoft.com",
  "www.microsoft.com",
  "login.microsoftonline.com",
]);

let mainWindow;
let msalClient;
let signedInAccount;

function assertMainFrame(event) {
  if (
    !mainWindow ||
    event.sender !== mainWindow.webContents ||
    event.senderFrame !== mainWindow.webContents.mainFrame
  ) {
    throw new Error("This request is only available to the HCC Remote window.");
  }
}

function settingsPath() {
  return path.join(app.getPath("userData"), "intune-settings.json");
}

async function getIntuneSettings() {
  try {
    const raw = await fs.readFile(settingsPath(), "utf8");
    return validateIntuneConfig(JSON.parse(raw));
  } catch (error) {
    if (error && error.code === "ENOENT") {
      return { tenantId: "", clientId: "" };
    }
    if (error instanceof SyntaxError) {
      throw new Error("Intune settings are invalid. Enter the tenant and client IDs again.");
    }
    throw error;
  }
}

async function saveIntuneSettings(value) {
  const settings = validateIntuneConfig(value);
  const file = settingsPath();
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, JSON.stringify(settings, null, 2), "utf8");
  return settings;
}

function createGraphClient(accessToken) {
  return createIntuneGraphClient({
    getAccessToken: async () => accessToken,
  });
}

async function connectToIntune() {
  const settings = validateIntuneConfig(await getIntuneSettings());
  const authority = `https://login.microsoftonline.com/${settings.tenantId}`;
  msalClient = new PublicClientApplication({
    auth: {
      clientId: settings.clientId,
      authority,
    },
  });

  const authResult = await msalClient.acquireTokenByDeviceCode({
    scopes: INTUNE_SCOPES,
    deviceCodeCallback: (deviceCode) => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send("intune:device-code", {
          userCode: deviceCode.userCode,
          verificationUri: deviceCode.verificationUri,
        });
      }
    },
  });

  if (!authResult || !authResult.accessToken || !authResult.account) {
    throw new Error("Microsoft sign-in did not return an account and access token.");
  }

  signedInAccount = authResult.account;
  const devices = await createGraphClient(authResult.accessToken).listManagedDevices();
  return {
    devices,
    accountName: signedInAccount.name || signedInAccount.username || "School account",
  };
}

async function refreshIntuneDevices() {
  if (!msalClient || !signedInAccount) {
    throw new Error("Connect to Intune with your school account first.");
  }

  let authResult;
  try {
    authResult = await msalClient.acquireTokenSilent({
      account: signedInAccount,
      scopes: INTUNE_SCOPES,
    });
  } catch (error) {
    if (
      error instanceof InteractionRequiredAuthError ||
      (error && error.errorCode === "interaction_required")
    ) {
      throw new Error("Your Intune sign-in needs renewal. Connect again to continue.");
    }
    throw error;
  }

  if (!authResult || !authResult.accessToken) {
    throw new Error("Microsoft sign-in did not return an access token. Connect again.");
  }

  return createGraphClient(authResult.accessToken).listManagedDevices();
}

function registerIntuneHandlers() {
  ipcMain.handle("intune:get-settings", (event) => {
    assertMainFrame(event);
    return getIntuneSettings();
  });

  ipcMain.handle("intune:save-settings", (event, settings) => {
    assertMainFrame(event);
    return saveIntuneSettings(settings);
  });

  ipcMain.handle("intune:connect", (event) => {
    assertMainFrame(event);
    return connectToIntune();
  });

  ipcMain.handle("intune:refresh", (event) => {
    assertMainFrame(event);
    return refreshIntuneDevices();
  });

  ipcMain.handle("intune:disconnect", (event) => {
    assertMainFrame(event);
    msalClient = undefined;
    signedInAccount = undefined;
  });

  ipcMain.handle("intune:open-portal", (event) => {
    assertMainFrame(event);
    return shell.openExternal(INTUNE_PORTAL);
  });

  ipcMain.handle("intune:open-verification", (event, value) => {
    assertMainFrame(event);
    let url;
    try {
      url = new URL(value);
    } catch {
      throw new Error("Microsoft sign-in provided an invalid verification URL.");
    }
    if (url.protocol !== "https:" || !VERIFICATION_HOSTS.has(url.hostname)) {
      throw new Error("Only Microsoft verification pages can be opened.");
    }
    return shell.openExternal(url.toString());
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 980,
    minHeight: 680,
    backgroundColor: "#f5f7fb",
    title: "HCC Remote",
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  mainWindow.webContents.setWindowOpenHandler(() => ({ action: "deny" }));

  const devServerUrl = process.env.VITE_DEV_SERVER_URL;
  if (devServerUrl) {
    mainWindow.loadURL(devServerUrl);
  } else {
    mainWindow.loadFile(path.join(__dirname, "..", "dist", "index.html"));
  }
}

registerIntuneHandlers();

app.whenReady().then(() => {
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
