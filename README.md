# Hotel Mis Sueños — Internal Dashboard Frontend

This is the GitHub Pages frontend version of the existing Google Apps Script internal hotel dashboard.

## What stays in Apps Script
- Google Sheets reads/writes
- Login and permissions
- Inventory backend
- Maintenance backend
- Cash backend
- Revenue/RMS backend
- Rate approvals
- Cloudbeds push

## What is in GitHub
- `index.html`
- `css/styles.css`
- `js/config.js`
- `js/api.js`
- `js/app.js`

## Setup
1. Add `apps-script/Api.gs` as a new file in the existing Apps Script project.
2. Deploy Apps Script as a Web App.
3. Copy the Web App URL.
4. Paste it in `js/config.js` as `HMS_CONFIG.API_URL`.
5. Push this folder to GitHub Pages.

## Important
Do not put Cloudbeds keys, Google Sheet IDs, passwords, or webhook secrets in this GitHub repo.
