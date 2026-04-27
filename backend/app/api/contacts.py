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
        
        result = await ContactService.process_csv_upload(db, content, mapping_dict, project_id)
        
        if not result["success"]:
            raise HTTPException(status_code=400, detail=result["error"])
            
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/")
async def list_contacts(
    skip: int = Query(0),
    limit: int = Query(100),
    search: Optional[str] = Query(None),
    project_id: Optional[int] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    List all contacts with search, pagination, and project filter.
    """
    contacts = await ContactService.get_contacts(db, project_id, skip, limit, search)
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
