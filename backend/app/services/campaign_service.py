from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.models.campaign import Campaign, CampaignStatus, CampaignChannel, CampaignLog
from app.models.contact import Contact
from datetime import datetime
import asyncio
import logging
from fastapi import BackgroundTasks
from app.models.project import Project
from app.gateways.email_gateway import EmailGateway
from app.gateways.ses_gateway import SESGateway

logger = logging.getLogger(__name__)

class CampaignService:
    @staticmethod
    async def create_campaign(db: AsyncSession, data: dict):
        campaign = Campaign(**data)
        db.add(campaign)
        await db.commit()
        await db.refresh(campaign)
        return campaign

    @staticmethod
    async def get_campaigns(db: AsyncSession, project_id: int = None, skip: int = 0, limit: int = 20, search: str = None):
        query = select(Campaign).order_by(Campaign.created_at.desc())
        
        if project_id:
            query = query.where(Campaign.project_id == project_id)

        if search:
            query = query.where(
                (Campaign.name.ilike(f"%{search}%")) | 
                (Campaign.subject.ilike(f"%{search}%"))
            )
            
        result = await db.execute(query.offset(skip).limit(limit))
        return result.scalars().all()

    @staticmethod
    async def get_campaign_by_id(db: AsyncSession, campaign_id: int):
        result = await db.execute(select(Campaign).where(Campaign.id == campaign_id))
        return result.scalar_one_or_none()
    @staticmethod
    async def update_campaign(db: AsyncSession, campaign_id: int, data: dict):
        result = await db.execute(select(Campaign).where(Campaign.id == campaign_id))
        campaign = result.scalar_one_or_none()
        if not campaign:
            return None
            
        for key, value in data.items():
            if hasattr(campaign, key):
                setattr(campaign, key, value)
        
        await db.commit()
        await db.refresh(campaign)
        return campaign

    @staticmethod
    async def schedule_campaign(db: AsyncSession, campaign_id: int, scheduled_at: datetime):
        result = await db.execute(select(Campaign).where(Campaign.id == campaign_id))
        campaign = result.scalar_one_or_none()
        if not campaign:
            return False
            
        campaign.status = CampaignStatus.SCHEDULED
        campaign.scheduled_at = scheduled_at.replace(tzinfo=None) # Store as naive UTC
        await db.commit()
        return True

    @staticmethod
    async def stop_campaign(db: AsyncSession, campaign_id: int):
        result = await db.execute(select(Campaign).where(Campaign.id == campaign_id))
        campaign = result.scalar_one_or_none()
        if not campaign:
            return False
            
        campaign.status = CampaignStatus.STOPPED
        await db.commit()
        return True

    @staticmethod
    async def delete_campaign(db: AsyncSession, campaign_id: int):
        result = await db.execute(select(Campaign).where(Campaign.id == campaign_id))
        campaign = result.scalar_one_or_none()
        if not campaign:
            return False
        
        await db.delete(campaign)
        await db.commit()
        return True

    @classmethod
    async def run_campaign(cls, db: AsyncSession, campaign_id: int):
        """
        Background task to execute or RESUME the campaign.
        """
        campaign = await cls.get_campaign_by_id(db, campaign_id)
        if not campaign or campaign.status in [CampaignStatus.COMPLETED, CampaignStatus.SENDING]:
            return
            
        # Fetch project for configuration
        proj_res = await db.execute(select(Project).where(Project.id == campaign.project_id))
        project = proj_res.scalar_one_or_none()

        # 1. Update status to SENDING
        campaign.status = CampaignStatus.SENDING
        await db.commit()

        # 2. Get target contacts based on channel (FILTERED BY PROJECT)
        base_query = select(Contact).where(Contact.project_id == campaign.project_id)
        
        if campaign.channel == CampaignChannel.EMAIL:
            query = base_query.where(Contact.email != None)
        elif campaign.channel == CampaignChannel.SMS:
            query = base_query.where(Contact.phone != None)
        else: # PUSH tokens
            token_field = {
                CampaignChannel.WHATSAPP: Contact.phone,
                CampaignChannel.WEB_PUSH: Contact.web_token,
                CampaignChannel.IOS_PUSH: Contact.ios_token,
                CampaignChannel.ANDROID_PUSH: Contact.android_token
            }.get(campaign.channel)
            query = base_query.where(token_field != None)

        result = await db.execute(query)
        contacts = result.scalars().all()
        
        campaign.total_contacts = len(contacts)
        
        # 3. Handle RESUMPTION
        # Only process contacts that haven't been sent to yet
        pending_contacts = contacts[campaign.sent_count:]
        await db.commit()

        # 4. Dispatch messages
        for contact in pending_contacts:
            # CHECK FOR STOP SIGNAL
            await db.refresh(campaign)
            if campaign.status == CampaignStatus.STOPPED:
                print(f"[CAMPAIGN {campaign.id}] Stopped by user at {campaign.sent_count}/{campaign.total_contacts}.")
                break

            try:
                success, error_msg = await cls._dispatch_message(campaign, contact, project)
                
                # Log the dispatch attempt
                log_entry = CampaignLog(
                    campaign_id=campaign.id,
                    contact_id=contact.id,
                    status="success" if success else "failed",
                    error_message=error_msg
                )
                db.add(log_entry)
                
                if success:
                    campaign.sent_count += 1
                else:
                    campaign.failed_count += 1
            except Exception as e:
                print(f"Error sending to {contact.id}: {e}")
                campaign.failed_count += 1
                log_entry = CampaignLog(
                    campaign_id=campaign.id,
                    contact_id=contact.id,
                    status="failed",
                    error_message=str(e)
                )
                db.add(log_entry)
            
            await db.commit()

        # 5. Finalize
        if campaign.status != CampaignStatus.STOPPED:
            campaign.status = CampaignStatus.COMPLETED
            await db.commit()

    @staticmethod
    async def _dispatch_message(campaign: Campaign, contact: Contact, project: Project = None) -> tuple[bool, str]:
        """Deliver one message via the appropriate channel gateway. Returns (success, error_message)."""
        if campaign.channel == CampaignChannel.EMAIL:
            if not contact.email:
                return False, "No email address"
            conf = (project.email_config or {}) if project else {}
            gateway = SESGateway(conf) if conf.get("provider") == "ses" else EmailGateway(conf)
            result = await gateway.send_single(
                recipient=contact.email,
                message=campaign.content,
                context={"subject": campaign.subject or campaign.name},
            )
            if not result["success"]:
                logger.warning(
                    "[Campaign %d] Email to %s failed: %s",
                    campaign.id, contact.email, result.get("error"),
                )
                return False, result.get("error", "Unknown error")
            return True, None

        # SMS / Push / WhatsApp — placeholders until those gateways are built
        logger.info(
            "[Campaign %d] Simulated %s send to contact %d",
            campaign.id, campaign.channel, contact.id,
        )
        await asyncio.sleep(0.05)
        return True, None

    @staticmethod
    async def send_test_email(db: AsyncSession, campaign_id: int, email: str):
        result = await db.execute(select(Campaign).where(Campaign.id == campaign_id))
        campaign = result.scalar_one_or_none()
        if not campaign:
            return {"success": False, "error": "Campaign not found"}
        
        proj_res = await db.execute(select(Project).where(Project.id == campaign.project_id))
        project = proj_res.scalar_one_or_none()
        
        conf = (project.email_config or {}) if project else {}
        gateway = SESGateway(conf) if conf.get("provider") == "ses" else EmailGateway(conf)
        result = await gateway.send_single(
            recipient=email,
            message=campaign.content,
            context={"subject": f"[TEST] {campaign.subject or campaign.name}"},
        )
        return result

    @staticmethod
    async def get_campaign_logs(db: AsyncSession, campaign_id: int, skip: int = 0, limit: int = 50):
        query = select(CampaignLog, Contact).join(Contact, CampaignLog.contact_id == Contact.id).where(CampaignLog.campaign_id == campaign_id).order_by(CampaignLog.sent_at.desc()).offset(skip).limit(limit)
        result = await db.execute(query)
        logs = []
        for log, contact in result.all():
            logs.append({
                "id": log.id,
                "status": log.status,
                "error_message": log.error_message,
                "sent_at": log.sent_at,
                "contact_email": contact.email,
                "contact_phone": contact.phone,
                "contact_name": contact.name
            })
        return logs
