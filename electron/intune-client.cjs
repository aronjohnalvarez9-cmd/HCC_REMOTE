const GRAPH_ENDPOINT =
  "https://graph.microsoft.com/v1.0/deviceManagement/managedDevices";
const DEVICE_FIELDS = [
  "id",
  "deviceName",
  "managedDeviceName",
  "operatingSystem",
  "osVersion",
  "lastSyncDateTime",
  "complianceState",
  "deviceCategoryDisplayName",
  "model",
  "managementAgent",
];
const GUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function validateIntuneConfig(value) {
  if (!value || typeof value !== "object") {
    throw new Error("Enter your Microsoft Entra tenant ID and app client ID.");
  }

  const tenantId = typeof value.tenantId === "string" ? value.tenantId.trim() : "";
  const clientId = typeof value.clientId === "string" ? value.clientId.trim() : "";

  if (!GUID_PATTERN.test(tenantId)) {
    throw new Error("Tenant ID must be a Microsoft Entra GUID.");
  }
  if (!GUID_PATTERN.test(clientId)) {
    throw new Error("App client ID must be a GUID.");
  }

  return { tenantId, clientId };
}

function normalizeManagedDevice(device) {
  if (!device || typeof device !== "object" || typeof device.id !== "string") {
    throw new Error("Intune returned a device without a valid ID.");
  }

  return {
    id: device.id,
    name:
      (typeof device.deviceName === "string" && device.deviceName.trim()) ||
      (typeof device.managedDeviceName === "string" &&
        device.managedDeviceName.trim()) ||
      "Unnamed device",
    operatingSystem:
      typeof device.operatingSystem === "string" ? device.operatingSystem : "",
    osVersion: typeof device.osVersion === "string" ? device.osVersion : "",
    lastSyncDateTime:
      typeof device.lastSyncDateTime === "string"
        ? device.lastSyncDateTime
        : null,
    complianceState:
      typeof device.complianceState === "string"
        ? device.complianceState
        : "unknown",
    category:
      typeof device.deviceCategoryDisplayName === "string"
        ? device.deviceCategoryDisplayName
        : "",
    model: typeof device.model === "string" ? device.model : "",
    managementAgent:
      typeof device.managementAgent === "string" ? device.managementAgent : "",
  };
}

function createIntuneGraphClient({ getAccessToken, fetchImpl = globalThis.fetch }) {
  if (typeof getAccessToken !== "function" || typeof fetchImpl !== "function") {
    throw new Error("An access-token provider and fetch implementation are required.");
  }

  return {
    async listManagedDevices() {
      const token = await getAccessToken();
      if (typeof token !== "string" || token.length === 0) {
        throw new Error("Microsoft sign-in did not provide an access token.");
      }

      const firstPage = new URL(GRAPH_ENDPOINT);
      firstPage.searchParams.set("$select", DEVICE_FIELDS.join(","));
      firstPage.searchParams.set("$top", "100");

      const devices = [];
      let nextUrl = firstPage.toString();
      let pageCount = 0;

      while (nextUrl) {
        pageCount += 1;
        if (pageCount > 100) {
          throw new Error("Intune returned too many pages; narrow the device scope.");
        }

        const pageUrl = new URL(nextUrl);
        if (
          pageUrl.origin !== "https://graph.microsoft.com" ||
          !pageUrl.pathname.startsWith("/v1.0/deviceManagement/managedDevices")
        ) {
          throw new Error("Intune returned an unexpected pagination URL.");
        }

        const response = await fetchImpl(pageUrl, {
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${token}`,
          },
        });

        let body;
        try {
          body = await response.json();
        } catch {
          throw new Error(`Microsoft Graph returned an unreadable response (${response.status}).`);
        }

        if (!response.ok) {
          const message =
            body &&
            body.error &&
            typeof body.error.message === "string"
              ? body.error.message
              : response.statusText;
          throw new Error(`Intune request failed (${response.status}): ${message}`);
        }
        if (!body || !Array.isArray(body.value)) {
          throw new Error("Microsoft Graph returned an invalid device list.");
        }

        devices.push(...body.value.map(normalizeManagedDevice));
        nextUrl =
          typeof body["@odata.nextLink"] === "string"
            ? body["@odata.nextLink"]
            : "";
      }

      return devices;
    },
  };
}

module.exports = {
  createIntuneGraphClient,
  normalizeManagedDevice,
  validateIntuneConfig,
};
