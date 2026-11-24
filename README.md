# HCC Remote

HCC Remote is a cross-platform desktop dashboard prototype for supervised computer labs. It currently uses local sample data; it does not discover, monitor, authenticate to, or control real computers.

## Prototype features

- Search and filter named lab workstations.
- View sample operating system, room, status, and last-seen details.
- Show an explicit approval-required state before a hypothetical support session.
- Run as an Electron desktop app on Windows and macOS.

The visible approval dialog is illustrative only: no request is sent and no session can be started. This prototype does not install a background service, register itself to launch at startup, or include remote-control or account-authentication code.

## Run locally

Requires Node.js 22 and npm.

```powershell
npm install
npm run dev
```

## Build installers

Build on the target operating system:

```powershell
# Windows: creates an NSIS .exe installer
npm run dist:win

# macOS: creates a .dmg installer
npm run dist:mac
```

The GitHub Actions workflow builds both installers on their native runners. Run it manually from the Actions tab to download workflow artifacts, or push a `v*` tag to create a GitHub Release with both installers attached.

## Recommended production design

- Use managed organizational identities for the master console (prefer Entra ID or Active Directory-backed SSO with MFA and role-based authorization); do not share a single Windows password between administrators.
- Give each enrolled workstation an administrator-assigned asset name and certificate-backed identity. Keep enrollment and revocation under IT control.
- Require a visible local user approval for interactive screen sharing, show the connected administrator, and provide a clear end-session control. Keep an auditable record of who requested and approved access.
- Use OS-supported remote support protocols or a vetted, signed remote-support product rather than implementing a custom remote-control transport. Keep remote support opt-in and separately configurable from inventory monitoring.
- Treat startup behavior as an explicit, organization-managed policy with notice and uninstall controls; this prototype does not implement startup launch.
- To reduce latency, host any approved relay close to the labs, prefer direct LAN paths when policy allows, adapt video quality to measured bandwidth, and measure p50/p95 input-to-display latency on the actual lab network before rollout.
- Sign Windows installers and notarize macOS builds before distributing them. Protect update signing keys and publish checksums with releases.

For a real deployment, the next step is a requirements and threat-model review covering device enrollment, identity provider, consent policy, network boundaries, audit retention, and supported Windows/macOS versions.
