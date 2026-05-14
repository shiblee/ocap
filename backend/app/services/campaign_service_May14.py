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
from app.services.ai_service import AIService

logger = logging.getLogger(__name__)

class CampaignService:
    @staticmethod
    async def create_campaign(db: AsyncSession, data: dict):
        print(f"DEBUG: Creating campaign with data: {data}")
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
            print(f"DEBUG ERROR in create_campaign: {e}")
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
        print(f"DEBUG: Updating campaign {campaign_id} with data: {data}")
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
            print(f"DEBUG ERROR in update_campaign: {e}")
            await db.rollback()
            raise e

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
        if not campaign or campaign.status == CampaignStatus.SENDING:
            return
        # Reset counters so it can be re-run
        campaign.sent_count = 0
        campaign.failed_count = 0
            
        # Fetch project for configuration
        proj_res = await db.execute(select(Project).where(Project.id == campaign.project_id))
        project = proj_res.scalar_one_or_none()

        # 1. Update status to SENDING
        campaign.status = CampaignStatus.SENDING
        await db.commit()

        # 2. Get target contacts based on channel (FILTERED BY PROJECT)
        if campaign.channel == CampaignChannel.SOCIAL_POST:
            # Social posts are project-level, not contact-level
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
                campaign.status = CampaignStatus.FAILED
                db.add(CampaignLog(
                    campaign_id=campaign.id,
                    contact_id=None,
                    status="failed",
                    error_message=str(e)
                ))

            await db.commit()
        else:
            # Existing contact-based logic
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
            pending_contacts = contacts[campaign.sent_count:]
            await db.commit()

            # 4. Dispatch messages
            for contact in pending_contacts:
                await db.refresh(campaign)
                if campaign.status == CampaignStatus.STOPPED:
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

        # 5. Finalize
        if campaign.status != CampaignStatus.STOPPED:
            if campaign.is_recurring and campaign.scheduled_at:
                # Calculate next run time
                interval = campaign.recurrence_interval or "daily"
                if interval == "daily":
                    campaign.scheduled_at += timedelta(days=1)
                elif interval == "weekly":
                    campaign.scheduled_at += timedelta(weeks=1)
                elif interval == "monthly":
                    # Simple monthly approximation
                    campaign.scheduled_at += timedelta(days=30)
                
                campaign.status = CampaignStatus.SCHEDULED
                # Reset counters for next run? 
                # Usually we'd want to archive old logs, but for now we just reset
                campaign.sent_count = 0
                campaign.failed_count = 0
            else:
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

        if campaign.channel == CampaignChannel.SOCIAL_POST:
            # 1. Generate content if empty OR if it's a recurring AI campaign
            content = campaign.content
            # If content is "AUTO_GENERATE" or empty, always generate fresh AI content
            if not content or content == "AUTO_GENERATE" or content.strip() == "":
                ai_conf = project.ai_config or {}
                # Add "Randomness" to prompt to ensure variety
                content = await AIService.generate_social_post(
                    f"{project.description or project.name} (Context: Random variation for recurring post)", 
                    api_key=ai_conf.get("gemini_api_key")
                )
                # We don't necessarily want to overwrite the "AUTO_GENERATE" placeholder 
                # in the database if we want it to stay dynamic.
                # But _dispatch_message is called during execution.
                # If we want the log to show what was sent, we return the content.

            # 2. Post to selected platforms
            platforms = campaign.social_platforms or []
            if not platforms:
                return False, "No platforms selected for social post"
            
            gateway = SocialGateway(project.social_config or {})
            results = []
            all_success = True
            for platform in platforms:
                success, msg = await gateway.post_to_platform(platform, content)
                results.append(f"{platform}: {msg}")
                if not success:
                    all_success = False

            return all_success, " | ".join(results)

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
        query = select(CampaignLog, Contact).outerjoin(Contact, CampaignLog.contact_id == Contact.id).where(CampaignLog.campaign_id == campaign_id).order_by(CampaignLog.sent_at.desc()).offset(skip).limit(limit)
        result = await db.execute(query)
        logs = []
        for log, contact in result.all():
            logs.append({
                "id": log.id,
                "status": log.status,
                "error_message": log.error_message,
                "sent_at": log.sent_at,
                "contact_email": contact.email if contact else "Project Broadcast",
                "contact_phone": contact.phone if contact else "N/A",
                "contact_name": contact.user_name if contact else "Social Media"
            })
        return logs
