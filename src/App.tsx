import { useMemo, useState } from "react";

type DeviceStatus = "Online" | "Attention" | "Offline";

type Device = {
  name: string;
  room: string;
  status: DeviceStatus;
  user: string;
  os: string;
  lastSeen: string;
  address: string;
};

const devices: Device[] = [
  { name: "HCC-LAB-01", room: "Computer Lab A", status: "Online", user: "Available", os: "Windows 11", lastSeen: "Just now", address: "10.20.1.101" },
  { name: "HCC-LAB-02", room: "Computer Lab A", status: "Online", user: "M. Santos", os: "Windows 11", lastSeen: "1 min ago", address: "10.20.1.102" },
  { name: "HCC-LAB-03", room: "Computer Lab A", status: "Attention", user: "Available", os: "Windows 10", lastSeen: "3 min ago", address: "10.20.1.103" },
  { name: "HCC-LAB-04", room: "Computer Lab A", status: "Online", user: "Available", os: "Windows 11", lastSeen: "Just now", address: "10.20.1.104" },
  { name: "HCC-LAB-05", room: "Computer Lab B", status: "Offline", user: "—", os: "Windows 11", lastSeen: "Yesterday", address: "10.20.2.105" },
  { name: "HCC-LAB-06", room: "Computer Lab B", status: "Online", user: "J. Cruz", os: "macOS 15", lastSeen: "2 min ago", address: "10.20.2.106" },
  { name: "HCC-LAB-07", room: "Computer Lab B", status: "Online", user: "Available", os: "Windows 11", lastSeen: "Just now", address: "10.20.2.107" },
  { name: "HCC-LAB-08", room: "Computer Lab B", status: "Online", user: "Available", os: "Windows 11", lastSeen: "1 min ago", address: "10.20.2.108" },
];

const statusClass: Record<DeviceStatus, string> = {
  Online: "online",
  Attention: "attention",
  Offline: "offline",
};

function App() {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"All devices" | DeviceStatus>("All devices");
  const [selected, setSelected] = useState(devices[0]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const today = new Intl.DateTimeFormat("en", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date()).toUpperCase();
  const greetingHour = new Date().getHours();
  const greeting = greetingHour < 12 ? "Good morning" : greetingHour < 18 ? "Good afternoon" : "Good evening";

  const filteredDevices = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return devices.filter((device) => {
      const matchesQuery =
        !normalizedQuery ||
        `${device.name} ${device.room} ${device.os}`.toLowerCase().includes(normalizedQuery);
      return matchesQuery && (filter === "All devices" || device.status === filter);
    });
  }, [filter, query]);
  const activeDevice =
    filteredDevices.find((device) => device.name === selected.name) ??
    filteredDevices[0] ??
    selected;

  const onlineCount = devices.filter((device) => device.status === "Online").length;
  const attentionCount = devices.filter((device) => device.status === "Attention").length;
  const offlineCount = devices.filter((device) => device.status === "Offline").length;

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
        <button className="nav-item" onClick={() => setFilter("Attention")}><span className="nav-icon">◷</span> Activity</button>

        <div className="sidebar-spacer" />
        <div className="connection-card">
          <div className="connection-icon">⌁</div>
          <div>
            <strong>Local demo</strong>
            <span>Sample data only</span>
          </div>
          <span className="connection-dot" />
        </div>
        <div className="profile">
          <div className="avatar">LA</div>
          <div className="profile-copy">
            <strong>Lab Administrator</strong>
            <span>Windows account · demo</span>
          </div>
          <span className="profile-menu">···</span>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div className="breadcrumbs">Workspace <span>/</span> <strong>Overview</strong></div>
          <div className="topbar-right">
            <span className="demo-pill"><span /> DEMO ENVIRONMENT</span>
            <button className="help-button" aria-label="Help">?</button>
          </div>
        </header>

        <div className="page-content">
          <section className="welcome-row">
            <div>
              <div className="eyebrow">{today}</div>
              <h1>{greeting}, Administrator <span className="wave">✦</span></h1>
              <p className="subtitle">Here’s the current status of your computer labs.</p>
            </div>
            <button className="primary-button" onClick={() => setDialogOpen(true)}>
              <span className="plus">+</span> Request assistance
            </button>
          </section>

          <section className="stat-grid" aria-label="Device summary">
            <StatCard label="Total devices" value={devices.length} detail="Across 2 lab rooms" icon="▣" tone="blue" />
            <StatCard label="Online now" value={onlineCount} detail="Ready and reporting" icon="●" tone="green" />
            <StatCard label="Needs attention" value={attentionCount} detail="Review device status" icon="!" tone="amber" />
            <StatCard label="Offline" value={offlineCount} detail="Last seen yesterday" icon="◌" tone="gray" />
          </section>

          <section className="devices-section">
            <div className="section-heading">
              <div>
                <h2>Lab devices <span className="device-total">{devices.length}</span></h2>
                <p>Named workstations across your computer labs</p>
              </div>
              <button className="quiet-button" onClick={() => { setQuery(""); setFilter("All devices"); }}>↻ <span>Refresh list</span></button>
            </div>

            <div className="device-toolbar">
              <label className="search-box">
                <span>⌕</span>
                <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search devices, rooms..." />
              </label>
              <div className="filter-group" aria-label="Filter devices">
                {(["All devices", "Online", "Attention", "Offline"] as const).map((option) => (
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
                  <span>DEVICE</span><span>ROOM</span><span>STATUS</span><span>LAST SEEN</span><span />
                </div>
                {filteredDevices.length > 0 ? filteredDevices.map((device) => (
                  <button
                    className={`device-row ${activeDevice.name === device.name ? "row-selected" : ""}`}
                    key={device.name}
                    onClick={() => setSelected(device)}
                  >
                    <span className="device-name-cell"><span className="computer-icon">▣</span><span><strong>{device.name}</strong><small>{device.os}</small></span></span>
                    <span className="room-cell">{device.room}</span>
                    <span><StatusBadge status={device.status} /></span>
                    <span className="last-seen">{device.lastSeen}</span>
                    <span className="row-more">···</span>
                  </button>
                )) : <div className="empty-state">No devices match this search.</div>}
                <div className="table-footer">Showing <strong>{filteredDevices.length}</strong> of <strong>{devices.length}</strong> devices <span>Demo data · updates are not live</span></div>
              </div>

              <aside className="detail-card">
                <div className="detail-topline">
                  <span className="detail-label">DEVICE DETAILS</span>
                  <button className="detail-more" aria-label="More device options">···</button>
                </div>
                <div className="detail-device-icon">▣</div>
                <h3>{activeDevice.name}</h3>
                <p className="detail-room">{activeDevice.room}</p>
                <div className="detail-status"><StatusBadge status={activeDevice.status} /><span>·</span><span>{activeDevice.lastSeen}</span></div>
                <div className="detail-divider" />
                <DetailRow label="Assigned user" value={activeDevice.user} />
                <DetailRow label="Operating system" value={activeDevice.os} />
                <DetailRow label="Network address" value={activeDevice.address} />
                <DetailRow label="Consent status" value="Not requested" />
                <div className="consent-note">
                  <strong>Control requires approval</strong>
                  <span>A user at the device must approve any screen-sharing session. This demo does not connect to devices.</span>
                </div>
                <button className="outline-button" onClick={() => setDialogOpen(true)}>Request user approval <span>→</span></button>
              </aside>
            </div>
          </section>
          <footer className="page-footer"><span>HCC Remote <b>·</b> Prototype 0.1</span><span>Designed for supervised computer labs</span></footer>
        </div>
      </main>

      {dialogOpen && <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setDialogOpen(false); }}>
        <section className="approval-dialog" role="dialog" aria-modal="true" aria-labelledby="dialog-title">
          <button className="dialog-close" onClick={() => setDialogOpen(false)} aria-label="Close">×</button>
          <div className="dialog-icon">✓</div>
          <div className="eyebrow">SUPERVISED ACCESS</div>
          <h2 id="dialog-title">User approval required</h2>
          <p>In a production deployment, {activeDevice.name} would show a visible prompt to its current user. Screen sharing should start only after that user approves.</p>
          <div className="dialog-summary"><span>Selected device</span><strong>{activeDevice.name} · {activeDevice.room}</strong></div>
          <div className="prototype-notice">This is a UI prototype. No request was sent and no remote session can be started.</div>
          <button className="primary-button dialog-action" onClick={() => setDialogOpen(false)}>Got it</button>
        </section>
      </div>}
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

function StatusBadge({ status }: { status: DeviceStatus }) {
  return <span className={`status-badge ${statusClass[status]}`}><i />{status}</span>;
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return <div className="detail-row"><span>{label}</span><strong>{value}</strong></div>;
}

export default App;
