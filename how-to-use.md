# How to Use MaintainIQ

MaintainIQ is an AI-powered maintenance platform for facilities and asset-heavy teams. Every physical asset gets a unique **QR code**; anyone with a phone can scan it to view the asset and report a problem — no login required. Behind that simple scan is a full work-order engine with AI triage, SLA tracking, preventive maintenance, cost analytics, and realtime alerts.

This guide walks through the product from the perspective of each user: **reporter** (anyone), **technician**, and **admin/facility manager**.

---

## 1. The Core Loop (in 60 seconds)

1. An asset is created in the system → a unique QR code is generated.
2. Someone scans the QR (on the asset sticker) with their phone camera.
3. They tap **Report an Issue**, describe the problem (or attach a photo/voice note), and submit.
4. MaintainIQ's AI triages it (title, category, priority, likely causes) and creates a work order.
5. An admin/technician is notified, assigns it, works it, and closes it.
6. The reporter tracks status live via a shareable tracking link.

---

## 2. For Reporters (No Account Needed)

### Scan & view an asset
- Open your phone camera and point it at the asset's QR sticker, or visit `https://<your-domain>/assets/<ASSET_CODE>` directly.
- The public page shows the asset name, category, location, condition, status, and recent activity.

### Report an issue
- Tap **Report an Issue**.
- Describe the problem in your own words. You can write in **Roman Urdu / Urdu** — the AI translates and structures it into English.
- Optionally attach a **photo or voice note** (voice/photo intake uploads the media and creates the work order).
- Provide a name/contact if you want email updates (optional).
- Review the AI's suggested title, category, and priority, then **Confirm & Save**.
- You'll see an **issue number** and a **Track Status** button. Bookmark the tracking page to follow progress.

### Track your report
- Visit `https://<your-domain>/track/<ISSUE_NUMBER>` (also linked from the header nav).
- See current status, priority, and last-updated time. You'll also receive email updates each time the status changes.

---

## 3. For Technicians

1. Open **Dashboard → Issues** (the Dispatch Board).
2. Each issue shows priority, status, **SLA** (Due in Xh / Due Soon / Breached), and type (Reactive or Preventive).
   - **SLA** is computed automatically from priority (Critical 4h, High 8h, Medium 24h, Low 72h) and starts when the issue is assigned.
3. Open an issue to:
   - Move it through the status state machine (`assigned → inspection_started → maintenance_in_progress → resolved`, etc.).
   - Add a **maintenance record** (notes, work performed, parts replaced, cost, final condition).
   - Generate an **AI Maintenance Summary** from your notes.
4. Assigned work appears under your technician ID; you can only update issues assigned to you.

---

## 4. For Admins / Facility Managers

### Assets
- **Dashboard → Assets** lists every asset with a scannable QR (tap to enlarge — vector, so it stays sharp).
- **Edit** opens an inline modal; **Delete** starts a **30-second undoable countdown** so accidental deletions are recoverable.
- **Add Asset** lets you set a **Parent Asset** to model hierarchy (e.g., Building → HVAC Unit → Compressor). Child assets are listed on the parent's detail page.
- **Bulk QR Print** (`/dashboard/qr-print`) selects assets and prints a sheet of QR labels for sticking on equipment.
- The asset detail page shows AI **Health Analysis** and **Preventive Recommendations**.

### Preventive Maintenance
- **Dashboard → Preventive** shows assets due (or overdue) for service within a chosen window (14/30/60/90 days).
- Click **Generate Work Orders** to auto-create *preventive* work orders for everything due. Already-open preventive work orders are skipped, so re-running is safe.
- For production, schedule this (e.g., a daily cron calling `POST /api/issues/generate-preventive`) to keep the board populated automatically.

### Dispatch & SLA
- The **Dispatch Board** (Issues) is filterable by status, priority, SLA state, and work-order type.
- Breached SLAs are highlighted in red and counted in the header.
- `GET /api/issues/sla-breach` returns the current breach list (wire it to a cron + alert for proactive monitoring).

### Cost & ROI Analytics
- **Dashboard → Analytics** summarizes maintenance spend:
  - **Total Spend**, **Avg Cost / Issue**, **MTTR** (mean time to resolve), and open/resolved counts.
  - **Top Assets by Cost** and **Top Locations by Cost** bar breakdowns — instantly see where the money goes.

### Real-time & Alerts
- Status and maintenance changes broadcast over WebSocket (dashboard updates live).
- If `SLACK_WEBHOOK_URL` (or `NOTIFY_WEBHOOK_URL`) is configured, **critical issues** and **SLA breaches** post to your Slack/Teams channel automatically.
- If SMTP is configured, reporters and assignees get email on assignment, resolution, every status change, and on initial report.

---

## 5. Mobile / Field Use (PWA)

MaintainIQ is installable as a Progressive Web App:
- Visit the app on a phone/tablet, then **Add to Home Screen**.
- It opens in standalone mode and works offline for cached pages (service worker in `public/sw.js`).
- Ideal for technicians scanning QR codes and updating work orders from the floor.

---

## 6. Quick Reference: New Workflows Added

| Workflow | Where | What happens |
|----------|-------|--------------|
| Undoable delete | Assets list | Delete → 30s countdown with **Undo**; asset removed only after timer expiry |
| Parent/child assets | Add/Edit Asset | Model equipment hierarchy; children listed on parent detail |
| Preventive work orders | Preventive page | One click generates due/overdue PM work orders |
| SLA tracking | Dispatch Board + issue detail | Auto SLA due time on assign; ok / due-soon / breached states |
| Cost analytics | Analytics page | Spend, MTTR, top assets & locations |
| Voice/photo intake | `POST /api/issues/report-media` | Attach media to a report (Cloudinary, if configured) |
| Slack/Teams alerts | Config-gated | Critical issues & SLA breaches posted to webhook |
| Bulk QR print | QR Print page | Print a sheet of asset QR labels |
| Requester emails | Automatic | Reporter notified on every status change + on report |

---

## 7. Tips & Best Practices

- **Print QR labels early** — bulk-print and stick them on assets so reporters can scan instantly.
- **Generate preventive work orders on a schedule** (cron/daily) rather than only on demand, to shift from reactive to planned maintenance.
- **Watch the SLA column** daily; the breached count in the Dispatch Board header is your at-a-glance health check.
- **Use the Analystics page** monthly to justify budgets — top-cost assets are your highest-ROI upgrade candidates.
- **Set up Slack + email** so reporters and technicians never have to poll the dashboard.

---

## 8. Admin Setup Reminder

Roles are set in Clerk (`public_metadata.role` = `admin` or `technician`). Backend env vars (`DATABASE_URL`, `CLERK_JWKS_URL`, `AI_API_KEY`, `CLOUDINARY_*`, `SMTP_*`, `SLACK_WEBHOOK_URL`) enable the corresponding integrations — each is **optional and degrades gracefully** when absent. After pulling new code, run `alembic upgrade head` to apply database migrations.

For full installation, environment variables, API reference, and deployment, see **README.md**.
