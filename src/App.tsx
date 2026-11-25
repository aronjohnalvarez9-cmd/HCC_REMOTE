import { useEffect, useMemo, useState } from "react";
import type {
  DeviceCodeInfo,
  IntuneSettings,
  ManagedDevice,
} from "./hccRemote";

type Device = {
  id: string;
  name: string;
  category: string;
  status: string;
  os: string;
  lastSync: string;
  lastSyncTimestamp: number | null;
  model: string;
  managementAgent: string;
  assignedUser?: string;
};

const demoDevices: Device[] = [
  { id: "demo-01", name: "HCC-LAB-01", category: "Computer Lab A", status: "Online", os: "Windows 11", lastSync: "Just now", lastSyncTimestamp: Date.now(), model: "Sample workstation", managementAgent: "Demo", assignedUser: "Available" },
  { id: "demo-02", name: "HCC-LAB-02", category: "Computer Lab A", status: "Online", os: "Windows 11", lastSync: "1 min ago", lastSyncTimestamp: Date.now() - 60_000, model: "Sample workstation", managementAgent: "Demo", assignedUser: "M. Santos" },
  { id: "demo-03", name: "HCC-LAB-03", category: "Computer Lab A", status: "Attention", os: "Windows 10", lastSync: "3 min ago", lastSyncTimestamp: Date.now() - 180_000, model: "Sample workstation", managementAgent: "Demo", assignedUser: "Available" },
  { id: "demo-04", name: "HCC-LAB-04", category: "Computer Lab A", status: "Online", os: "Windows 11", lastSync: "Just now", lastSyncTimestamp: Date.now(), model: "Sample workstation", managementAgent: "Demo", assignedUser: "Available" },
  { id: "demo-05", name: "HCC-LAB-05", category: "Computer Lab B", status: "Offline", os: "Windows 11", lastSync: "Yesterday", lastSyncTimestamp: Date.now() - 86_400_000, model: "Sample workstation", managementAgent: "Demo", assignedUser: "—" },
  { id: "demo-06", name: "HCC-LAB-06", category: "Computer Lab B", status: "Online", os: "macOS 15", lastSync: "2 min ago", lastSyncTimestamp: Date.now() - 120_000, model: "Sample workstation", managementAgent: "Demo", assignedUser: "J. Cruz" },
  { id: "demo-07", name: "HCC-LAB-07", category: "Computer Lab B", status: "Online", os: "Windows 11", lastSync: "Just now", lastSyncTimestamp: Date.now(), model: "Sample workstation", managementAgent: "Demo", assignedUser: "Available" },
  { id: "demo-08", name: "HCC-LAB-08", category: "Computer Lab B", status: "Online", os: "Windows 11", lastSync: "1 min ago", lastSyncTimestamp: Date.now() - 60_000, model: "Sample workstation", managementAgent: "Demo", assignedUser: "Available" },
];

const statusClass: Record<string, string> = {
  Online: "online",
  Attention: "attention",
  Offline: "offline",
  Compliant: "compliant",
  Noncompliant: "noncompliant",
  "In grace period": "attention",
  "Needs review": "attention",
  Unknown: "offline",
};

function complianceLabel(value: string) {
  switch (value.toLowerCase()) {
    case "compliant":
      return "Compliant";
    case "noncompliant":
      return "Noncompliant";
    case "ingraceperiod":
      return "In grace period";
    case "conflict":
    case "error":
      return "Needs review";
    default:
      return "Unknown";
  }
}

function formatSyncTime(value: string | null) {
  if (!value) return "No sync recorded";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown";
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function mapIntuneDevice(device: ManagedDevice): Device {
  const timestamp = device.lastSyncDateTime
    ? new Date(device.lastSyncDateTime).getTime()
    : Number.NaN;
  const os = [device.operatingSystem, device.osVersion]
    .filter(Boolean)
    .join(" ");

  return {
    id: device.id,
    name: device.name,
    category: device.category || "Uncategorized",
    status: complianceLabel(device.complianceState),
    os: os || "Unknown OS",
    lastSync: formatSyncTime(device.lastSyncDateTime),
    lastSyncTimestamp: Number.isNaN(timestamp) ? null : timestamp,
    model: device.model || "Not reported",
    managementAgent: device.managementAgent || "Not reported",
  };
}

function errorText(error: unknown) {
  return error instanceof Error ? error.message : "An unexpected error occurred.";
}

function App() {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("All devices");
  const [selectedId, setSelectedId] = useState(demoDevices[0].id);
  const [supportDialogOpen, setSupportDialogOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settings, setSettings] = useState<IntuneSettings>({
    tenantId: "",
    clientId: "",
  });
  const [deviceCode, setDeviceCode] = useState<DeviceCodeInfo | null>(null);
  const [liveDevices, setLiveDevices] = useState<Device[] | null>(null);
  const [accountName, setAccountName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const today = new Intl.DateTimeFormat("en", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date()).toUpperCase();
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const isConnected = liveDevices !== null;
  const devices = liveDevices ?? demoDevices;

  useEffect(() => {
    let active = true;
    const unsubscribe = window.hccRemote.onDeviceCode(setDeviceCode);

    window.hccRemote
      .getIntuneSettings()
      .then((savedSettings) => {
        if (active) setSettings(savedSettings);
      })
      .catch((settingsError: unknown) => {
        if (active) setError(errorText(settingsError));
      });

    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  const filteredDevices = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return devices.filter((device) => {
      const matchesQuery =
        !normalizedQuery ||
        `${device.name} ${device.category} ${device.os}`
          .toLowerCase()
          .includes(normalizedQuery);
      const matchesFilter =
        filter === "All devices" ||
        (filter === "Needs review"
          ? ["Needs review", "Unknown", "In grace period"].includes(device.status)
          : device.status === filter);
      return matchesQuery && matchesFilter;
    });
  }, [devices, filter, query]);

  const activeDevice =
    filteredDevices.find((device) => device.id === selectedId) ??
    filteredDevices[0] ??
    devices.find((device) => device.id === selectedId) ??
    devices[0];

  const onlineCount = demoDevices.filter((device) => device.status === "Online").length;
  const attentionCount = demoDevices.filter((device) => device.status === "Attention").length;
  const offlineCount = demoDevices.filter((device) => device.status === "Offline").length;
  const compliantCount = devices.filter((device) => device.status === "Compliant").length;
  const reviewCount = devices.filter((device) =>
    ["Noncompliant", "Needs review", "Unknown", "In grace period"].includes(device.status),
  ).length;
  const staleCount = devices.filter(
    (device) =>
      device.lastSyncTimestamp === null ||
      Date.now() - device.lastSyncTimestamp > 7 * 24 * 60 * 60 * 1000,
  ).length;
  const hasMacDevices = devices.some((device) => device.os.toLowerCase().includes("mac"));

  const stats = isConnected
    ? [
        { label: "Managed devices", value: devices.length, detail: "Reported by Intune", icon: "▣", tone: "blue" },
        { label: "Compliant", value: compliantCount, detail: "Intune compliance state", icon: "●", tone: "green" },
        { label: "Needs review", value: reviewCount, detail: "Check compliance status", icon: "!", tone: "amber" },
        { label: "Stale check-ins", value: staleCount, detail: "No sync in 7+ days", icon: "◌", tone: "gray" },
      ]
    : [
        { label: "Total devices", value: devices.length, detail: "Sample data · 2 lab rooms", icon: "▣", tone: "blue" },
        { label: "Online now", value: onlineCount, detail: "Sample status only", icon: "●", tone: "green" },
        { label: "Needs attention", value: attentionCount, detail: "Sample status only", icon: "!", tone: "amber" },
        { label: "Offline", value: offlineCount, detail: "Sample status only", icon: "◌", tone: "gray" },
      ];

  async function connectToIntune() {
    setBusy(true);
    setError("");
    setDeviceCode(null);
    try {
      const saved = await window.hccRemote.saveIntuneSettings(settings);
      setSettings(saved);
      const connection = await window.hccRemote.connectIntune();
      const mappedDevices = connection.devices.map(mapIntuneDevice);
      setLiveDevices(mappedDevices);
      setAccountName(connection.accountName);
      setSelectedId(mappedDevices[0]?.id ?? "");
      setFilter("All devices");
      setSettingsOpen(false);
      setDeviceCode(null);
    } catch (connectionError: unknown) {
      setError(errorText(connectionError));
    } finally {
      setBusy(false);
    }
  }

  async function refreshIntune() {
    setBusy(true);
    setError("");
    try {
      const refreshedDevices = (await window.hccRemote.refreshIntune()).map(mapIntuneDevice);
      setLiveDevices(refreshedDevices);
      if (!refreshedDevices.some((device) => device.id === selectedId)) {
        setSelectedId(refreshedDevices[0]?.id ?? "");
      }
    } catch (refreshError: unknown) {
      setError(errorText(refreshError));
    } finally {
      setBusy(false);
    }
  }

  async function disconnectIntune() {
    setError("");
    try {
      await window.hccRemote.disconnectIntune();
      setLiveDevices(null);
      setAccountName("");
      setSelectedId(demoDevices[0].id);
      setFilter("All devices");
    } catch (disconnectError: unknown) {
      setError(errorText(disconnectError));
    }
  }

  async function openVerificationPage() {
    if (!deviceCode) return;
    try {
      await window.hccRemote.openVerificationUrl(deviceCode.verificationUri);
    } catch (verificationError: unknown) {
      setError(errorText(verificationError));
    }
  }

  async function openIntunePortal() {
    try {
      await window.hccRemote.openIntunePortal();
    } catch (portalError: unknown) {
      setError(errorText(portalError));
    }
  }

  const filterOptions = isConnected
    ? ["All devices", "Compliant", "Noncompliant", "Needs review"]
    : ["All devices", "Online", "Attention", "Offline"];

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">H</div>
          <div>
            <div className="brand-name">HCC Remote</div>
            <div className="brand-caption">LAB MANAGEMENT</div>
          </div>
        </div>

        <div className="nav-label">WORKSPACE</div>
        <button className="nav-item active"><span className="nav-icon">▦</span> Overview</button>
        <button className="nav-item" onClick={() => setFilter("All devices")}><span className="nav-icon">▣</span> Devices <span className="nav-count">{devices.length}</span></button>
        <button className="nav-item" onClick={() => setFilter(isConnected ? "Needs review" : "Attention")}><span className="nav-icon">◷</span> Activity</button>

        <div className="sidebar-spacer" />
        <div className="connection-card">
          <div className="connection-icon">⌁</div>
          <div>
            <strong>{isConnected ? "Intune connected" : "Local demo"}</strong>
            <span>{isConnected ? "Read-only inventory" : "Sample data only"}</span>
          </div>
          <span className={`connection-dot ${isConnected ? "" : "demo-dot"}`} />
        </div>
        <div className="profile">
          <div className="avatar">{isConnected ? "IT" : "LA"}</div>
          <div className="profile-copy">
            <strong>{isConnected ? accountName : "Lab Administrator"}</strong>
            <span>{isConnected ? "Microsoft Entra account" : "Not signed in"}</span>
          </div>
          <span className="profile-menu">···</span>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div className="breadcrumbs">Workspace <span>/</span> <strong>Overview</strong></div>
          <div className="topbar-right">
            <span className={`demo-pill ${isConnected ? "connected-pill" : ""}`}>
              <span /> {isConnected ? "INTUNE CONNECTED" : "DEMO DATA"}
            </span>
            {isConnected ? (
              <>
                <button className="intune-button" disabled={busy} onClick={refreshIntune}>
                  {busy ? "Refreshing…" : "Refresh"}
                </button>
                <button className="text-button" disabled={busy} onClick={disconnectIntune}>Disconnect</button>
              </>
            ) : (
              <button className="intune-button" onClick={() => { setError(""); setSettingsOpen(true); }}>
                Connect Intune
              </button>
            )}
            <button className="help-button" aria-label="Help" onClick={() => setSupportDialogOpen(true)}>?</button>
          </div>
        </header>

        <div className="page-content">
          <section className="welcome-row">
            <div>
              <div className="eyebrow">{today}</div>
              <h1>{greeting}, Administrator <span className="wave">✦</span></h1>
              <p className="subtitle">
                {isConnected
                  ? "Read-only device inventory from your Intune tenant."
                  : "Connect your school tenant to load managed device inventory."}
              </p>
            </div>
            <button className="primary-button" onClick={() => setSupportDialogOpen(true)}>
              <span className="plus">+</span> Open support options
            </button>
          </section>

          {!isConnected && (
            <div className="intune-banner">
              <strong>Connect to Microsoft Intune</strong>
              <span>Only read-only device inventory is requested. Demo entries are not real devices.</span>
              <button onClick={() => { setError(""); setSettingsOpen(true); }}>Set up connection <span>→</span></button>
            </div>
          )}

          {isConnected && !hasMacDevices && (
            <div className="intune-banner">
              <strong>No macOS devices returned by Intune</strong>
              <span>Enroll school-owned Macs through Apple School Manager and Intune. They will appear after enrollment and check-in.</span>
              <button onClick={openIntunePortal}>Open Intune <span>→</span></button>
            </div>
          )}

          {error && !settingsOpen && <div className="inline-error" role="alert">{error}</div>}

          <section className="stat-grid" aria-label="Device summary">
            {stats.map((stat) => <StatCard key={stat.label} {...stat} />)}
          </section>

          <section className="devices-section">
            <div className="section-heading">
              <div>
                <h2>Lab devices <span className="device-total">{devices.length}</span></h2>
                <p>{isConnected ? "Managed devices visible to your Intune account" : "Sample workstations · not connected to a tenant"}</p>
              </div>
              <button className="quiet-button" disabled={busy} onClick={isConnected ? refreshIntune : () => { setQuery(""); setFilter("All devices"); }}>
                ↻ <span>{isConnected ? "Refresh inventory" : "Reset demo"}</span>
              </button>
            </div>

            <div className="device-toolbar">
              <label className="search-box">
                <span>⌕</span>
                <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search devices, categories..." />
              </label>
              <div className="filter-group" aria-label="Filter devices">
                {filterOptions.map((option) => (
                  <button
                    key={option}
                    className={`filter-button ${filter === option ? "selected" : ""}`}
                    onClick={() => setFilter(option)}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>

            <div className="content-grid">
              <div className="table-card">
                <div className="table-head">
                  <span>DEVICE</span><span>CATEGORY</span><span>{isConnected ? "COMPLIANCE" : "STATUS"}</span><span>{isConnected ? "LAST INTUNE SYNC" : "LAST SEEN"}</span><span />
                </div>
                {filteredDevices.length > 0 ? filteredDevices.map((device) => (
                  <button
                    className={`device-row ${activeDevice?.id === device.id ? "row-selected" : ""}`}
                    key={device.id}
                    onClick={() => setSelectedId(device.id)}
                  >
                    <span className="device-name-cell"><span className="computer-icon">▣</span><span><strong>{device.name}</strong><small>{device.os}</small></span></span>
                    <span className="room-cell">{device.category}</span>
                    <span><StatusBadge status={device.status} /></span>
                    <span className="last-seen">{device.lastSync}</span>
                    <span className="row-more">···</span>
                  </button>
                )) : (
                  <div className="empty-state">
                    {isConnected
                      ? "No Intune-managed devices match this filter. Check enrollment, assignment scope, and consent."
                      : "No devices match this search."}
                  </div>
                )}
                <div className="table-footer">
                  Showing <strong>{filteredDevices.length}</strong> of <strong>{devices.length}</strong> devices
                  <span>{isConnected ? "Read-only Intune inventory · not a live screen feed" : "Demo data · updates are not live"}</span>
                </div>
              </div>

              {activeDevice && (
                <aside className="detail-card">
                  <div className="detail-topline">
                    <span className="detail-label">DEVICE DETAILS</span>
                    <button className="detail-more" aria-label="More device options">···</button>
                  </div>
                  <div className="detail-device-icon">▣</div>
                  <h3>{activeDevice.name}</h3>
                  <p className="detail-room">{activeDevice.category}</p>
                  <div className="detail-status"><StatusBadge status={activeDevice.status} /><span>·</span><span>{isConnected ? "Intune managed" : "Demo device"}</span></div>
                  <div className="detail-divider" />
                  <DetailRow label="Operating system" value={activeDevice.os} />
                  <DetailRow label="Model" value={activeDevice.model} />
                  <DetailRow label={isConnected ? "Last Intune sync" : "Last seen"} value={activeDevice.lastSync} />
                  {isConnected ? (
                    <DetailRow label="Management agent" value={activeDevice.managementAgent} />
                  ) : (
                    <DetailRow label="Assigned user" value={activeDevice.assignedUser ?? "—"} />
                  )}
                  <div className="consent-note">
                    <strong>Remote support uses Microsoft Remote Help</strong>
                    <span>Start support from Intune. The user must approve an attended session; use the Remote Help web helper from Windows for macOS.</span>
                  </div>
                  <button className="outline-button" onClick={openIntunePortal}>Open Intune admin center <span>→</span></button>
                </aside>
              )}
            </div>
          </section>
          <footer className="page-footer">
            <span>HCC Remote <b>·</b> Prototype 0.2</span>
            <span>{isConnected ? "Intune check-in data can be delayed; it is not real-time monitoring." : "Designed for supervised computer labs"}</span>
          </footer>
        </div>
      </main>

      {settingsOpen && (
        <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) setSettingsOpen(false); }}>
          <section className="approval-dialog setup-dialog" role="dialog" aria-modal="true" aria-labelledby="setup-title">
            <button className="dialog-close" disabled={busy} onClick={() => setSettingsOpen(false)} aria-label="Close">×</button>
            <div className="dialog-icon">↗</div>
            <div className="eyebrow">READ-ONLY MICROSOFT GRAPH ACCESS</div>
            <h2 id="setup-title">Connect your Intune tenant</h2>
            <p>Enter the IDs for a single-tenant public app registration. HCC Remote requests only the delegated <code>DeviceManagementManagedDevices.Read.All</code> permission. An Intune administrator must grant consent.</p>
            <label className="config-field">
              <span>Microsoft Entra tenant ID</span>
              <input value={settings.tenantId} onChange={(event) => setSettings({ ...settings, tenantId: event.target.value })} placeholder="00000000-0000-0000-0000-000000000000" autoComplete="off" />
            </label>
            <label className="config-field">
              <span>App client ID</span>
              <input value={settings.clientId} onChange={(event) => setSettings({ ...settings, clientId: event.target.value })} placeholder="00000000-0000-0000-0000-000000000000" autoComplete="off" />
            </label>
            {deviceCode && (
              <div className="device-code-panel">
                <span>Sign in with your school account, then enter this code:</span>
                <strong>{deviceCode.userCode}</strong>
                <button className="outline-button" onClick={openVerificationPage}>
                  Open Microsoft sign-in page <span>↗</span>
                </button>
              </div>
            )}
            {error && <div className="inline-error" role="alert">{error}</div>}
            <div className="setup-notice">No password or client secret is entered here. Access tokens stay in memory and are cleared when the app closes.</div>
            <button className="primary-button dialog-action" disabled={busy} onClick={connectToIntune}>
              {busy ? "Waiting for Microsoft sign-in…" : "Save settings & sign in"}
            </button>
          </section>
        </div>
      )}

      {supportDialogOpen && (
        <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setSupportDialogOpen(false); }}>
          <section className="approval-dialog" role="dialog" aria-modal="true" aria-labelledby="support-title">
            <button className="dialog-close" onClick={() => setSupportDialogOpen(false)} aria-label="Close">×</button>
            <div className="dialog-icon">✓</div>
            <div className="eyebrow">SUPERVISED SUPPORT</div>
            <h2 id="support-title">Use Microsoft Remote Help</h2>
            <p>Choose the enrolled device in Intune and start an attended Remote Help session. From the Windows master, use the Remote Help web helper for macOS. The person at the device can see who is connecting, approve or decline, and end the session.</p>
            <div className="prototype-notice">HCC Remote only displays Intune inventory. It does not stream screens or send control commands.</div>
            {error && <div className="inline-error" role="alert">{error}</div>}
            <button className="primary-button dialog-action" onClick={openIntunePortal}>Open Intune admin center</button>
          </section>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, detail, icon, tone }: { label: string; value: number; detail: string; icon: string; tone: string }) {
  return <article className="stat-card">
    <div className={`stat-icon ${tone}`}>{icon}</div>
    <div className="stat-label">{label}</div>
    <div className="stat-bottom"><strong>{value}</strong><span>{detail}</span></div>
  </article>;
}

function StatusBadge({ status }: { status: string }) {
  return <span className={`status-badge ${statusClass[status] ?? "offline"}`}><i />{status}</span>;
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return <div className="detail-row"><span>{label}</span><strong>{value}</strong></div>;
}

export default App;
