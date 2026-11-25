const assert = require("node:assert/strict");
const test = require("node:test");
const {
  createIntuneGraphClient,
  normalizeManagedDevice,
  validateIntuneConfig,
} = require("./intune-client.cjs");

test("validates and normalizes Entra IDs", () => {
  assert.deepEqual(
    validateIntuneConfig({
      tenantId: "11111111-2222-4333-8444-555555555555",
      clientId: "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee",
    }),
    {
      tenantId: "11111111-2222-4333-8444-555555555555",
      clientId: "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee",
    },
  );
  assert.throws(
    () => validateIntuneConfig({ tenantId: "tenant", clientId: "app" }),
    /Tenant ID must be/,
  );
});

test("normalizes only the inventory fields used by the dashboard", () => {
  const result = normalizeManagedDevice({
    id: "device-id",
    deviceName: "HCC-LAB-A-01",
    operatingSystem: "Windows",
    osVersion: "11",
    userPrincipalName: "student@example.edu",
    serialNumber: "sensitive-serial",
  });

  assert.equal(result.name, "HCC-LAB-A-01");
  assert.equal(result.operatingSystem, "Windows");
  assert.equal("userPrincipalName" in result, false);
  assert.equal("serialNumber" in result, false);
});

test("reads managed-device pages with read-only fields and follows Graph pagination", async () => {
  const requestedUrls = [];
  const client = createIntuneGraphClient({
    getAccessToken: async () => "test-access-token",
    fetchImpl: async (url, options) => {
      requestedUrls.push({ url: new URL(url), options });
      if (requestedUrls.length === 1) {
        return new Response(
          JSON.stringify({
            value: [{ id: "device-1", deviceName: "HCC-LAB-A-01" }],
            "@odata.nextLink":
              "https://graph.microsoft.com/v1.0/deviceManagement/managedDevices?$skiptoken=next",
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        );
      }
      return new Response(
        JSON.stringify({ value: [{ id: "device-2", deviceName: "HCC-LAB-A-02" }] }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    },
  });

  const devices = await client.listManagedDevices();

  assert.deepEqual(devices.map((device) => device.id), ["device-1", "device-2"]);
  assert.equal(requestedUrls.length, 2);
  assert.equal(
    requestedUrls[0].url.searchParams.get("$select").includes("serialNumber"),
    false,
  );
  assert.equal(
    requestedUrls[0].options.headers.Authorization,
    "Bearer test-access-token",
  );
});

test("rejects pagination links outside Microsoft Graph", async () => {
  const client = createIntuneGraphClient({
    getAccessToken: async () => "test-access-token",
    fetchImpl: async () =>
      new Response(
        JSON.stringify({
          value: [],
          "@odata.nextLink": "https://example.com/collect",
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
  });

  await assert.rejects(client.listManagedDevices(), /unexpected pagination URL/);
});

test("reports Graph authorization and service errors", async () => {
  const client = createIntuneGraphClient({
    getAccessToken: async () => "test-access-token",
    fetchImpl: async () =>
      new Response(
        JSON.stringify({ error: { message: "Admin consent is required." } }),
        { status: 403, headers: { "content-type": "application/json" } },
      ),
  });

  await assert.rejects(
    client.listManagedDevices(),
    /Intune request failed \(403\): Admin consent is required/,
  );
});
