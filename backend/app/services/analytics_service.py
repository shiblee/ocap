from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.models.contact import Contact
from app.models.campaign import Campaign, CampaignChannel
from app.models.project import Project

class AnalyticsService:
    @staticmethod
    async def get_dashboard_stats(db: AsyncSession, project_id: int):
        # 1. Total Audience
        audience_result = await db.execute(
            select(func.count(Contact.id)).where(Contact.project_id == project_id)
        )
        total_audience = audience_result.scalar() or 0
        
        # 2. Campaign Stats (Sent, Failed, Total)
        campaign_stats = await db.execute(
            select(
                func.sum(Campaign.sent_count).label("sent"),
                func.sum(Campaign.failed_count).label("failed"),
                func.sum(Campaign.total_contacts).label("total_intended")
            ).where(Campaign.project_id == project_id)
        )
        stats = campaign_stats.mappings().one()
        
        total_sent = stats["sent"] or 0
        total_failed = stats["failed"] or 0
        total_intended = stats["total_intended"] or 0
        
        # 3. Channel Health
        channels = [
            CampaignChannel.EMAIL, 
            CampaignChannel.SMS, 
            CampaignChannel.WHATSAPP, 
            CampaignChannel.WEB_PUSH, 
            CampaignChannel.IOS_PUSH, 
            CampaignChannel.ANDROID_PUSH
        ]
        
        channel_health = []
        for ch in channels:
            ch_res = await db.execute(
                select(
                    func.sum(Campaign.sent_count).label("sent"),
                    func.sum(Campaign.total_contacts).label("total")
                ).where(Campaign.channel == ch).where(Campaign.project_id == project_id)
            )
            ch_stats = ch_res.mappings().one()
            sent = ch_stats["sent"] or 0
            total = ch_stats["total"] or 0
            
            success_rate = round((sent / total * 100), 1) if total > 0 else 0
            channel_health.append({
                "channel": ch.value,
                "rate": success_rate
            })

        # 4. Configuration Warnings (NOW PROJECT-SPECIFIC)
        config_warnings = await AnalyticsService._check_config_readiness(db, project_id)
        
        # 5. Volume Stats (Last 7 days, FILTERED BY PROJECT)
        volume_stats = await AnalyticsService._get_volume_stats(db, project_id)

        return {
            "total_audience": total_audience,
            "messages_sent": total_sent,
            "messages_failed": total_failed,
            "delivery_rate": round((total_sent / total_intended * 100), 1) if total_intended > 0 else 0,
            "channel_health": channel_health,
            "config_warnings": config_warnings,
            "volume_stats": volume_stats
        }

    @staticmethod
    async def _get_volume_stats(db: AsyncSession, project_id: int):
        from datetime import datetime, timedelta, date
        
        # We'll get last 7 days
        today = date.today()
        dates = [today - timedelta(days=i) for i in range(6, -1, -1)]
        
        # Result dictionary initialized with 0
        stats_map = {d.strftime('%a'): 0 for d in dates}
        
        # Query: sum of sent_count grouped by date(created_at)
        # Note: func.date is PostgreSQL/SQLite compatible here
        from sqlalchemy import cast, Date
        query = select(
            cast(Campaign.created_at, Date).label("day"),
            func.sum(Campaign.sent_count).label("total_sent")
        ).where(
            Campaign.created_at >= (datetime.utcnow() - timedelta(days=7))
        ).where(Campaign.project_id == project_id).group_by(cast(Campaign.created_at, Date))
        
        result = await db.execute(query)
        rows = result.all()
        
        for row in rows:
            day_name = row.day.strftime('%a')
            if day_name in stats_map:
                stats_map[day_name] = row.total_sent or 0
                
        # Convert map back to list in chronological order
        return [{"name": name, "value": val} for name, val in stats_map.items()]

    @staticmethod
    async def _check_config_readiness(db: AsyncSession, project_id: int):
        result = await db.execute(select(Project).where(Project.id == project_id))
        project = result.scalar_one_or_none()
        
        if not project:
            return ["Email", "SMS", "WhatsApp", "Push Notifications"]
 
        warnings = []
        
        # Email Check
        ec = project.email_config or {}
        if not all([ec.get('host'), ec.get('user'), ec.get('password'), ec.get('sender')]):
            warnings.append("Email (SMTP)")
            
        # SMS Check
        sc = project.sms_config or {}
        if not all([sc.get('sid'), sc.get('token')]):
            warnings.append("SMS Gateway")
            
        # WhatsApp Check
        wc = project.whatsapp_config or {}
        if not wc.get('token') or not wc.get('phone_id'):
            warnings.append("WhatsApp API")
            
        # Push Check
        pc = project.push_config or {}
        if not pc.get('vapid_public'):
            warnings.append("Push Notifications")
            
        return warnings
