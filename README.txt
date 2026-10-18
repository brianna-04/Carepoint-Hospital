CAREPOINT HOSPITAL — HIGH SCHOOL DEMO

Run with VS Code Live Server:
1. Open this folder in VS Code.
2. Install the Live Server extension.
3. Right-click index.html > Open with Live Server.
4. Do not open the HTML using file:// because shared components use fetch().

Nurse demo login: nurse / demo123

STRUCTURE
index.html                  Home and public waitlist
patient.html                Patient check-in
patient-output.html         Patient confirmation
nurse-login.html            Nurse sign-in and resume shift choice
nurse-input.html            Nurse shift details
nurse-dashboard.html        Patient dashboard
components/header.html      Shared header
components/footer.html      Shared footer
css/style.css               Styles
js/layout.js                Loads header/footer
js/app.js                   Check-in, queue, login and dashboard logic

The waiting list shows temporary IDs only and orders waiting check-ins by
submission time. The list is not medical triage. The dashboard controls
patient status. A nurse who signs out can log back in and resume their
saved shift in the same browser tab/session.

Patient entries are stored in localStorage and nurse session information in
sessionStorage. No server/database or real authentication exists. Do not
enter real patient information. This is for fictional classroom data only.
