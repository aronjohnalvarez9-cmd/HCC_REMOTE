# HCC Remote

HCC Remote is a cross-platform desktop dashboard for read-only Microsoft Intune inventory and supervised lab support. When not connected to a tenant, it shows clearly labeled sample data.

HCC Remote does not install a device agent, stream screens, or send remote-control commands. Use Microsoft Intune Remote Help for support sessions; users must approve attended screen sharing or control.

## Connect Microsoft Intune

An Intune administrator must first register a single-tenant public desktop app in Microsoft Entra:

1. Create an app registration for **Mobile and desktop applications** in the school tenant.
2. Enable public-client/device-code authentication for the registration.
3. Add the Microsoft Graph **delegated** permission `DeviceManagementManagedDevices.Read.All` and grant tenant admin consent.
4. Copy the tenant ID and app client ID.
5. In HCC Remote, select **Connect Intune**, enter those two IDs, and sign in using the on-screen Microsoft device-code flow.

Do not create a client secret for this public desktop app. The app stores only the tenant and client IDs in its local application settings. Access tokens stay in memory and are discarded when HCC Remote exits. Device inventory requests are read-only and return only the fields needed by the dashboard; user names, serial numbers, and network addresses are not requested.

The connected dashboard shows devices visible to the signed-in Intune account, their compliance state, OS/model, category, management agent, and last Intune sync. Intune sync is not a live screen feed; inventory and check-in freshness depend on the device and Intune service.

If sign-in fails, ask your tenant administrator to verify the app registration, Graph delegated permission, admin consent, Intune role/scope, and device enrollment. HCC Remote displays Microsoft Graph errors rather than falling back to success-shaped demo data.

## Windows and macOS support

- Enroll school-owned Windows computers in Intune and give each PC an IT-assigned asset name, such as `HCC-LAB-A-01`.
- Enroll Macs through Apple School Manager and Automated Device Enrollment into Intune. A Mac that is not enrolled and has not checked in will not appear in the live inventory.
- Deploy Microsoft Remote Help through the school’s management process. For macOS, the user must grant the required Screen Recording and Accessibility permissions. When helping from the Windows master, use the Remote Help web helper for macOS sessions.
- Start an attended support session from Intune Remote Help. The person at the computer can verify the helper and approve or decline. Keep unattended support disabled for student labs.
- Remote Help requires licenses for both helpers and users in addition to an Intune subscription. Confirm eligibility and supported OS versions with your school’s Microsoft administrator.

## Run locally

Requires Node.js 22 and npm.

```powershell
npm ci
npm run dev
```

## Tests and installers

```powershell
npm test
npm run build

# Run the platform-specific installer build on its native OS.
npm run dist:win
npm run dist:mac
```

The GitHub Actions workflow builds Windows and macOS installers on native runners. Run **Build desktop installers** manually for workflow artifacts, or push a `v*` tag for a GitHub Release.

## Operational guidance

- Use separate school Entra accounts, MFA, least-privilege Intune roles, and scope assignments to the lab device groups.
- HCC Remote calls Microsoft Graph over the signed-in account; never place tokens or secrets in the desktop renderer, source repository, or installer.
- Remote Help requires access to Microsoft cloud endpoints over HTTPS/443. Have school IT validate proxy/firewall settings and pilot latency before rollout.
- Do not expose RDP, VNC, or custom remote-control ports to the public internet.
- Sign Windows installers and notarize macOS builds before broad distribution.

Official setup references: [Microsoft Remote Help planning](https://learn.microsoft.com/en-us/intune/remote-help/plan), [Microsoft Graph managed devices API](https://learn.microsoft.com/en-us/graph/api/intune-devices-manageddevice-list?view=graph-rest-1.0), and [Apple Platform Deployment](https://support.apple.com/guide/deployment/welcome/web).
