from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException, Query
from fastapi.encoders import jsonable_encoder
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_db
from app.services.contact_service import ContactService
from app.api.auth import get_current_user
import json
from typing import Optional

router = APIRouter(prefix="/contacts", tags=["Contacts"])

@router.post("/")
async def create_contact(
    data: dict,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    from app.models.contact import Contact
    from sqlalchemy import select

    email = data.get("email")
    phone = data.get("phone")

    # Deduplication check
    existing_query = select(Contact)
    if email:
        existing_query = existing_query.where(Contact.email == email)
    elif phone:
        existing_query = existing_query.where(Contact.phone == phone)
    
    result = await db.execute(existing_query)
    contact = result.scalar_one_or_none()

    if contact:
        # Update existing
        for key, value in data.items():
            if value is not None:
                setattr(contact, key, value)
    else:
        # Create new
        contact = Contact(**data)
        db.add(contact)
    
    await db.commit()
    await db.refresh(contact)
    return jsonable_encoder(contact)

@router.put("/{contact_id}")
async def update_contact(
    contact_id: int,
    data: dict,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    from app.models.contact import Contact
    from sqlalchemy import select

    result = await db.execute(select(Contact).where(Contact.id == contact_id))
    contact = result.scalar_one_or_none()

    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")

    for key, value in data.items():
        if hasattr(contact, key):
            setattr(contact, key, value)

    await db.commit()
    await db.refresh(contact)
    return jsonable_encoder(contact)

@router.post("/upload")
async def upload_contacts(
    file: UploadFile = File(...),
    mapping: str = Form(...),
    project_id: int = Form(...),
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Import contacts from CSV with project scoping.
    """
    try:
        mapping_dict = json.loads(mapping)
        content = await file.read()
        
        result = await ContactService.process_csv_upload(
            db, content, mapping_dict, project_id, filename=file.filename
        )
        
        if not result["success"]:
            raise HTTPException(status_code=400, detail=result["error"])
            
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{contact_id}/campaign-logs")
async def get_contact_campaign_logs(
    contact_id: int,
    skip: int = Query(0),
    limit: int = Query(10),
    search: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Get campaign logs for a specific contact with pagination and search.
    """
    from sqlalchemy import select, func
    from sqlalchemy.orm import selectinload
    from app.models.campaign import CampaignLog, Campaign
    
    query = select(CampaignLog).options(selectinload(CampaignLog.campaign)).where(CampaignLog.contact_id == contact_id)
    count_query = select(func.count(CampaignLog.id)).where(CampaignLog.contact_id == contact_id)
    
    if search:
        query = query.join(Campaign).where(Campaign.name.ilike(f"%{search}%"))
        count_query = count_query.join(Campaign).where(Campaign.name.ilike(f"%{search}%"))
        
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0
    
    query = query.order_by(CampaignLog.sent_at.desc()).offset(skip).limit(limit)
    result = await db.execute(query)
    logs = result.scalars().all()
    
    items = [
        {
            "id": log.id,
            "campaign_id": log.campaign_id,
            "campaign_name": log.campaign.name if log.campaign else "Unknown",
            "campaign_channel": log.campaign.channel if log.campaign else "unknown",
            "status": log.status,
            "error_message": log.error_message,
            "sent_at": log.sent_at
        } for log in logs
    ]
    
    return jsonable_encoder({
        "items": items,
        "total": total
    })

@router.get("/import-logs")
async def get_import_logs(
    project_id: int = Query(...),
    skip: int = Query(0),
    limit: int = Query(5),
    search: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Get import logs for a project with pagination and search.
    """
    from sqlalchemy import select, func
    from app.models.import_log import ImportLog
    
    query = select(ImportLog).where(ImportLog.project_id == project_id)
    count_query = select(func.count(ImportLog.id)).where(ImportLog.project_id == project_id)
    
    if search:
        query = query.where(ImportLog.filename.ilike(f"%{search}%"))
        count_query = count_query.where(ImportLog.filename.ilike(f"%{search}%"))
        
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0
    
    result = await db.execute(
        query.order_by(ImportLog.created_at.desc()).offset(skip).limit(limit)
    )
    logs = result.scalars().all()
    return jsonable_encoder({"items": logs, "total": total})

@router.get("/")
async def list_contacts(
    skip: int = Query(0),
    limit: int = Query(100),
    search: Optional[str] = Query(None),
    project_id: Optional[int] = Query(None),
    is_active: Optional[bool] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    List all contacts with search, pagination, project filter, and is_active filter.
    """
    contacts = await ContactService.get_contacts(db, project_id, skip, limit, search, is_active)
    return jsonable_encoder(contacts)

@router.delete("/{contact_id}")
async def delete_contact(
    contact_id: int,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    from sqlalchemy import delete
    from app.models.contact import Contact
    
    await db.execute(delete(Contact).where(Contact.id == contact_id))
    await db.commit()
    return {"message": "Contact deleted successfully"}

from pydantic import BaseModel
from typing import List
from app.core.security import verify_password

class BulkDeleteRequest(BaseModel):
    contact_ids: List[int]
    password: str

@router.post("/bulk-delete")
async def bulk_delete_contacts(
    request: BulkDeleteRequest,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    from sqlalchemy import delete
    from app.models.contact import Contact
    
    # Verify password
    if not verify_password(request.password, current_user.hashed_password):
        raise HTTPException(status_code=401, detail="Incorrect password")
        
    # Delete contacts
    await db.execute(delete(Contact).where(Contact.id.in_(request.contact_ids)))
    await db.commit()
    return {"message": f"Successfully deleted {len(request.contact_ids)} contacts"}
