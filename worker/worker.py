#!/usr/bin/env python3
"""
BhandarSetu Background Worker
Tasks:
1. Transactional Outbox Processor: Polls notifications_outbox and delivers alerts via MailHog SMTP.
2. SLA Escalation Engine: Flags approval requests exceeding sla_due_at.
3. Reservation Cleanup: Releases expired stock reservations.
"""

import asyncio
import os
import json
import logging
from email.message import EmailMessage
import asyncpg
import aiosmtplib

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("bhandarsetu-worker")

DB_URL = os.getenv("DATABASE_URL", "postgresql://pds_admin:pds_secret_2026@postgres:5432/bhandarsetu")
SMTP_HOST = os.getenv("SMTP_HOST", "mailhog")
SMTP_PORT = int(os.getenv("SMTP_PORT", "1025"))
POLL_INTERVAL_SEC = 5

async def deliver_notification(record, conn):
    outbox_id = record["id"]
    recipient = record.get("recipient") or "officer@pds.gov.in"
    event_type = record.get("event_type") or "PDS_ALERT"
    payload = record.get("payload") or {}

    msg = EmailMessage()
    msg["From"] = "bhandarsetu-notifications@gov.in"
    msg["To"] = recipient
    msg["Subject"] = f"[BhandarSetu Alert] {event_type}"
    msg.set_content(f"""
BhandarSetu Automated Notification
==================================
Event: {event_type}
Timestamp: {record['created_at']}

Details:
{json.dumps(payload, indent=2)}

Please log into the BhandarSetu portal to take action.
    """)

    try:
        await aiosmtplib.send(msg, hostname=SMTP_HOST, port=SMTP_PORT)
        await conn.execute("""
            UPDATE notifications_outbox 
            SET status = 'DELIVERED', sent_at = CURRENT_TIMESTAMP 
            WHERE id = $1;
        """, outbox_id)
        logger.info(f"Delivered notification #{outbox_id} ({event_type}) to {recipient}")
    except Exception as e:
        logger.warning(f"Failed delivering notification #{outbox_id}: {e}")
        await conn.execute("""
            UPDATE notifications_outbox 
            SET retry_count = retry_count + 1, 
                status = CASE WHEN retry_count >= 5 THEN 'FAILED' ELSE 'PENDING' END
            WHERE id = $1;
        """, outbox_id)

async def process_outbox(conn):
    records = await conn.fetch("""
        SELECT id, channel, event_type, recipient, payload, created_at 
        FROM notifications_outbox 
        WHERE status = 'PENDING' 
        ORDER BY id ASC 
        LIMIT 25;
    """)
    for r in records:
        await deliver_notification(r, conn)

async def check_sla_and_reservations(conn):
    # 1. Clean up expired reservations
    deleted = await conn.execute("""
        DELETE FROM stock_reservations WHERE expires_at < CURRENT_TIMESTAMP;
    """)
    if deleted and " 0" not in deleted:
        logger.info(f"Cleaned up expired stock reservations: {deleted}")

    # 2. Check SLA breaches on pending approvals
    breached = await conn.fetch("""
        SELECT id, request_type, ref_table, ref_id, requested_by, sla_due_at 
        FROM approval_requests 
        WHERE status = 'PENDING' AND sla_due_at < CURRENT_TIMESTAMP;
    """)
    for b in breached:
        logger.warning(f"SLA breached on approval request #{b['id']} ({b['request_type']}) - due at {b['sla_due_at']}")

async def main():
    logger.info("Starting BhandarSetu Background Worker...")
    while True:
        try:
            conn = await asyncpg.connect(DB_URL)
            await process_outbox(conn)
            await check_sla_and_reservations(conn)
            await conn.close()
        except Exception as e:
            logger.error(f"Worker cycle error: {e}")
        await asyncio.sleep(POLL_INTERVAL_SEC)

if __name__ == "__main__":
    asyncio.run(main())

