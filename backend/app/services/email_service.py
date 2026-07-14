import os
import smtplib
from email.message import EmailMessage
from threading import Thread


def _configured() -> bool:
    return bool(os.getenv("SMTP_HOST") and os.getenv("MAIL_FROM"))


def send_email(to: str, subject: str, body: str) -> None:
    if not to or not _configured():
        return

    def _send():
        try:
            msg = EmailMessage()
            msg["From"] = os.getenv("MAIL_FROM", "")
            msg["To"] = to
            msg["Subject"] = subject
            msg.set_content(body)
            with smtplib.SMTP(
                os.getenv("SMTP_HOST"), int(os.getenv("SMTP_PORT", "587"))
            ) as server:
                if os.getenv("SMTP_USER"):
                    server.starttls()
                    server.login(os.getenv("SMTP_USER"), os.getenv("SMTP_PASS", ""))
                server.send_message(msg)
        except Exception as e:
            print(f"Email send failed: {e}")

    Thread(target=_send).start()


def notify_assigned(issue_number: str, asset_name: str, technician_id: str, reporter_contact: str | None) -> None:
    body = (
        f"Issue {issue_number} for asset '{asset_name}' has been assigned.\n"
        f"Technician: {technician_id}\n\n"
        f"Please begin inspection and update the status in MaintainIQ."
    )
    send_email(reporter_contact or os.getenv("ADMIN_EMAIL", ""), f"[MaintainIQ] Issue {issue_number} assigned", body)


def notify_resolved(issue_number: str, asset_name: str, reporter_contact: str | None) -> None:
    body = (
        f"Issue {issue_number} for asset '{asset_name}' has been resolved.\n\n"
        f"Thank you for using MaintainIQ. You can track the status anytime with your issue number."
    )
    send_email(reporter_contact or os.getenv("ADMIN_EMAIL", ""), f"[MaintainIQ] Issue {issue_number} resolved", body)


def notify_status_change(issue_number: str, asset_name: str, new_status: str, reporter_contact: str | None, tracking_url: str | None = None) -> None:
    body = (
        f"Issue {issue_number} for asset '{asset_name}' status is now: {new_status.replace('_', ' ')}.\n\n"
    )
    if tracking_url:
        body += f"Track it here: {tracking_url}\n"
    send_email(reporter_contact or os.getenv("ADMIN_EMAIL", ""), f"[MaintainIQ] Issue {issue_number} update: {new_status}", body)


def notify_reported(issue_number: str, asset_name: str, reporter_contact: str | None, tracking_url: str | None = None) -> None:
    body = (
        f"Thank you for reporting an issue for '{asset_name}'.\n"
        f"Your issue number is {issue_number}.\n\n"
    )
    if tracking_url:
        body += f"Track its status here: {tracking_url}\n"
    send_email(reporter_contact or os.getenv("ADMIN_EMAIL", ""), f"[MaintainIQ] Issue {issue_number} received", body)
