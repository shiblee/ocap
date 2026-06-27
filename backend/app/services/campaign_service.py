from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.models.campaign import Campaign, CampaignStatus, CampaignChannel, CampaignLog
from app.models.contact import Contact
from datetime import datetime, timedelta
import asyncio
import logging
from fastapi import BackgroundTasks
from app.models.project import Project
from app.gateways.email_gateway import EmailGateway
from app.gateways.ses_gateway import SESGateway
from app.gateways.social_gateway import SocialGateway
from app.gateways.wati_gateway import WatiGateway
from app.services.ai_service import AIService
from app.db.session import AsyncSessionLocal

logger = logging.getLogger(__name__)

class CampaignService:
    @staticmethod
    async def create_campaign(db: AsyncSession, data: dict):
        if "scheduled_at" in data and isinstance(data["scheduled_at"], str) and data["scheduled_at"]:
            try:
                data["scheduled_at"] = datetime.fromisoformat(data["scheduled_at"].replace("Z", "+00:00"))
            except ValueError:
                pass
        
        try:
            campaign = Campaign(**data)
            db.add(campaign)
            await db.commit()
            await db.refresh(campaign)
            return campaign
        except Exception as e:
            await db.rollback()
            raise e

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
            
        if "scheduled_at" in data and isinstance(data["scheduled_at"], str) and data["scheduled_at"]:
            try:
                data["scheduled_at"] = datetime.fromisoformat(data["scheduled_at"].replace("Z", "+00:00"))
            except ValueError:
                pass

        try:
            for key, value in data.items():
                if hasattr(campaign, key):
                    setattr(campaign, key, value)
            
            await db.commit()
            await db.refresh(campaign)
            return campaign
        except Exception as e:
            await db.rollback()
            raise e

    @staticmethod
    async def schedule_campaign(db: AsyncSession, campaign_id: int, scheduled_at: datetime):
        result = await db.execute(select(Campaign).where(Campaign.id == campaign_id))
        campaign = result.scalar_one_or_none()
        if not campaign:
            return False
            
        campaign.status = CampaignStatus.scheduled # lowercase member name
        campaign.scheduled_at = scheduled_at.replace(tzinfo=None)
        await db.commit()
        return True

    @staticmethod
    async def stop_campaign(db: AsyncSession, campaign_id: int):
        try:
            result = await db.execute(select(Campaign).where(Campaign.id == campaign_id))
            campaign = result.scalar_one_or_none()
            if not campaign:
                return False
                
            campaign.status = CampaignStatus.stopped # lowercase member name
            await db.commit()
            return True
        except Exception as e:
            logger.error(f"Error stopping campaign {campaign_id}: {e}")
            await db.rollback()
            raise e

    @staticmethod
    async def pause_campaign(db: AsyncSession, campaign_id: int):
        try:
            result = await db.execute(select(Campaign).where(Campaign.id == campaign_id))
            campaign = result.scalar_one_or_none()
            if not campaign:
                return False
                
            campaign.status = CampaignStatus.paused
            await db.commit()
            return True
        except Exception as e:
            logger.error(f"Error pausing campaign {campaign_id}: {e}")
            await db.rollback()
            raise e

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
    async def run_campaign(cls, campaign_id: int):
        async with AsyncSessionLocal() as db:
            campaign = await cls.get_campaign_by_id(db, campaign_id)
            if not campaign or campaign.status in [CampaignStatus.completed, CampaignStatus.sending]:
                return
                
            proj_res = await db.execute(select(Project).where(Project.id == campaign.project_id))
            project = proj_res.scalar_one_or_none()

            campaign.status = CampaignStatus.sending
            await db.commit()

            if campaign.channel == CampaignChannel.social_post:
                try:
                    success, error_msg = await cls._dispatch_message(campaign, None, project)
                    campaign.total_contacts = 1
                    campaign.sent_count = 1 if success else 0
                    campaign.failed_count = 0 if success else 1
                    
                    log_entry = CampaignLog(
                        campaign_id=campaign.id,
                        contact_id=None,
                        status="success" if success else "failed",
                        error_message=error_msg
                    )
                    db.add(log_entry)
                except Exception as e:
                    logger.error(f"Error running social campaign: {e}")
                    campaign.status = CampaignStatus.failed
                
                await db.commit()
            else:
                base_query = select(Contact).where(Contact.project_id == campaign.project_id, Contact.is_active == True)
                
                if campaign.channel == CampaignChannel.email:
                    query = base_query.where(Contact.email != None)
                elif campaign.channel == CampaignChannel.sms:
                    query = base_query.where(Contact.phone != None)
                else:
                    token_field = {
                        CampaignChannel.whatsapp: Contact.phone,
                        CampaignChannel.web_push: Contact.web_token,
                        CampaignChannel.ios_push: Contact.ios_token,
                        CampaignChannel.android_push: Contact.android_token
                    }.get(campaign.channel)
                    query = base_query.where(token_field != None)

                result = await db.execute(query)
                contacts = result.scalars().all()
                
                campaign.total_contacts = len(contacts)
                pending_contacts = contacts[campaign.sent_count:]
                await db.commit()

                for contact in pending_contacts:
                    await db.refresh(campaign)
                    if campaign.status in [CampaignStatus.stopped, CampaignStatus.paused]:
                        break

                    try:
                        success, error_msg = await cls._dispatch_message(campaign, contact, project)
                        log_entry = CampaignLog(
                            campaign_id=campaign.id,
                            contact_id=contact.id,
                            status="success" if success else "failed",
                            error_message=error_msg
                        )
                        db.add(log_entry)
                        if success: campaign.sent_count += 1
                        else: campaign.failed_count += 1
                    except Exception as e:
                        campaign.failed_count += 1
                        db.add(CampaignLog(campaign_id=campaign.id, contact_id=contact.id, status="failed", error_message=str(e)))
                    
                    await db.commit()

                    # Apply sleep time for email campaigns if configured
                    if campaign.channel == CampaignChannel.email and project and project.email_config:
                        sleep_time = float(project.email_config.get("sleep_time", 0))
                        if sleep_time > 0:
                            await asyncio.sleep(sleep_time)

            if campaign.status not in [CampaignStatus.stopped, CampaignStatus.paused]:
                if campaign.is_recurring and campaign.scheduled_at:
                    interval = campaign.recurrence_interval or "daily"
                    if interval == "daily":
                        campaign.scheduled_at += timedelta(days=1)
                    elif interval == "weekly":
                        campaign.scheduled_at += timedelta(weeks=1)
                    elif interval == "monthly":
                        campaign.scheduled_at += timedelta(days=30)
                    
                    campaign.status = CampaignStatus.scheduled
                    campaign.sent_count = 0
                    campaign.failed_count = 0
                else:
                    campaign.status = CampaignStatus.completed
                
                await db.commit()

    @staticmethod
    async def _dispatch_message(campaign: Campaign, contact: Contact, project: Project = None) -> tuple[bool, str]:
        if campaign.channel == CampaignChannel.email:
            if not contact.email: return False, "No email address"
            conf = (project.email_config or {}) if project else {}
            gateway = SESGateway(conf) if conf.get("provider") == "ses" else EmailGateway(conf)
            
            html_content = campaign.content or ""
            subject_content = campaign.subject or campaign.name or ""
            
            user_name = contact.user_name or "User"
            email_addr = contact.email or ""
            
            html_content = html_content.replace("{{user_name}}", user_name)
            html_content = html_content.replace("{{email}}", email_addr)
            
            subject_content = subject_content.replace("{{user_name}}", user_name)
            subject_content = subject_content.replace("{{email}}", email_addr)
            
            import re
            plain_text = re.sub(r'<[^>]*>', '', html_content)
            
            result = await gateway.send_single(
                recipient=contact.email,
                message=plain_text,
                context={
                    "subject": subject_content,
                    "html_body": html_content
                },
            )
            if not result["success"]: return False, result.get("error", "Unknown error")
            return True, None

        if campaign.channel == CampaignChannel.social_post:
            content = campaign.content
            if not content or content == "AUTO_GENERATE" or content.strip() == "":
                ai_conf = project.ai_config or {}
                content = await AIService.generate_social_post(f"{project.description or project.name}", api_key=ai_conf.get("gemini_api_key"))

            platforms = campaign.social_platforms or []
            if not platforms: return False, "No platforms selected"
            
            gateway = SocialGateway(project.social_config or {})
            results = []
            for platform in platforms:
                success, msg = await gateway.post_to_platform(platform, content)
                results.append(f"{platform}: {msg}")
            return True, " | ".join(results)

        if campaign.channel == CampaignChannel.whatsapp:
            if not contact.phone: return False, "No phone number"
            conf = (project.whatsapp_config or {}) if project else {}
            gateway = WatiGateway(conf)
            result = await gateway.send_single(recipient=contact.phone, message=campaign.content)
            if not result["success"]: return False, result.get("error", "Unknown WhatsApp error")
            return True, None

        await asyncio.sleep(0.01)
        return True, None

    @staticmethod
    async def get_campaign_logs(db: AsyncSession, campaign_id: int, skip: int = 0, limit: int = 50):
        try:
            query = select(CampaignLog, Contact).outerjoin(Contact, CampaignLog.contact_id == Contact.id).where(CampaignLog.campaign_id == campaign_id).order_by(CampaignLog.sent_at.desc()).offset(skip).limit(limit)
            result = await db.execute(query)
            logs = []
            for row in result.all():
                log = row[0]
                contact = row[1]
                logs.append({
                    "id": log.id,
                    "status": log.status,
                    "error_message": log.error_message,
                    "sent_at": log.sent_at.isoformat() if log.sent_at else None,
                    "contact_email": getattr(contact, 'email', 'N/A') if contact else 'N/A',
                    "contact_phone": getattr(contact, 'phone', 'N/A') if contact else 'N/A',
                    "contact_name": getattr(contact, 'user_name', 'N/A') if contact else 'N/A'
                })
            return logs
        except Exception as e:
            return []

    @classmethod
    async def send_test_email(cls, db: AsyncSession, campaign_id: int, test_email: str) -> dict:
        try:
            campaign = await cls.get_campaign_by_id(db, campaign_id)
            if not campaign:
                return {"success": False, "error": "Campaign not found"}
                
            proj_res = await db.execute(select(Project).where(Project.id == campaign.project_id))
            project = proj_res.scalar_one_or_none()
            
            conf = (project.email_config or {}) if project else {}
            gateway = SESGateway(conf) if conf.get("provider") == "ses" else EmailGateway(conf)
            
            import re
            plain_text = re.sub(r'<[^>]*>', '', campaign.content or "")
            
            result = await gateway.send_single(
                recipient=test_email,
                message=plain_text,
                context={
                    "subject": f"[TEST] {campaign.subject or campaign.name}",
                    "html_body": campaign.content
                },
            )
            return result
        except Exception as e:
            logger.error(f"Error sending test email for campaign {campaign_id}: {e}")
            return {"success": False, "error": str(e)}
