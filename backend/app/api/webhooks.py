import json
import logging
import httpx
from fastapi import APIRouter, Request, BackgroundTasks, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db.session import get_db
from app.models.campaign import CampaignLog, Campaign

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/webhooks", tags=["webhooks"])

async def process_ses_notification(message: dict, db: AsyncSession):
    notification_type = message.get("notificationType")
    if not notification_type:
        return
        
    mail = message.get("mail", {})
    message_id = mail.get("messageId")
    if not message_id:
        return
        
    # Find the campaign log
    result = await db.execute(select(CampaignLog).where(CampaignLog.message_id == message_id))
    log_entry = result.scalar_one_or_none()
    
    if not log_entry:
        logger.warning(f"Webhook received for unknown message_id: {message_id}")
        return
        
    campaign_id = log_entry.campaign_id
    campaign_result = await db.execute(select(Campaign).where(Campaign.id == campaign_id))
    campaign = campaign_result.scalar_one_or_none()
    
    if notification_type == "Delivery":
        log_entry.status = "delivered"
    elif notification_type in ["Bounce", "Complaint"]:
        new_status = "bounced" if notification_type == "Bounce" else "complained"
        
        # If it was previously tracked as success/sent_to_ses/delivered, we need to adjust counts
        if log_entry.status in ["success", "sent_to_ses", "delivered"] and campaign:
            campaign.sent_count = max(0, campaign.sent_count - 1)
            campaign.failed_count += 1
            
        log_entry.status = new_status
        
        reason = "Bounced" if notification_type == "Bounce" else "Complained"
        if notification_type == "Bounce":
            bounce = message.get("bounce", {})
            bounced_recips = bounce.get("bouncedRecipients", [])
            if bounced_recips:
                reason = f"Bounced: {bounced_recips[0].get('diagnosticCode', 'Unknown')}"
        elif notification_type == "Complaint":
            complaint = message.get("complaint", {})
            reason = f"Complained: {complaint.get('complaintFeedbackType', 'Unknown')}"
            
        log_entry.error_message = reason
        
        # Inactivate the contact
        if log_entry.contact_id:
            from app.models.contact import Contact
            contact_res = await db.execute(select(Contact).where(Contact.id == log_entry.contact_id))
            contact = contact_res.scalar_one_or_none()
            if contact:
                contact.is_active = False
                contact.inactive_reason = reason
            
    await db.commit()

@router.post("/aws-ses")
async def aws_ses_webhook(request: Request, background_tasks: BackgroundTasks, db: AsyncSession = Depends(get_db)):
    # AWS SNS sometimes sends body as plain text/json, so we read raw body
    body_bytes = await request.body()
    try:
        payload = json.loads(body_bytes)
    except json.JSONDecodeError:
        logger.error("Invalid JSON from AWS SNS")
        return {"status": "error", "message": "Invalid JSON"}

    message_type = request.headers.get("x-amz-sns-message-type") or payload.get("Type")
    
    if message_type == "SubscriptionConfirmation":
        subscribe_url = payload.get("SubscribeURL")
        if subscribe_url:
            # AWS requires us to GET this URL to confirm subscription
            logger.info(f"Confirming AWS SNS subscription: {subscribe_url}")
            async with httpx.AsyncClient() as client:
                await client.get(subscribe_url)
        return {"status": "ok"}
        
    elif message_type == "Notification":
        message_str = payload.get("Message", "{}")
        try:
            message_data = json.loads(message_str)
        except json.JSONDecodeError:
            logger.error("Failed to parse SNS Message JSON")
            return {"status": "error", "message": "Invalid Message JSON"}
            
        background_tasks.add_task(process_ses_notification, message_data, db)
        return {"status": "ok"}
        
    return {"status": "ignored"}
