import pandas as pd
import io
from typing import List, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from app.models.contact import Contact
import json

class ContactService:
    @staticmethod
    async def process_csv_upload(
        db: AsyncSession, 
        file_content: bytes, 
        mapping: Dict[str, str],
        project_id: int
    ) -> Dict[str, Any]:
        """
        Process CSV content with provided mapping.
        mapping example: {"csv_email_col": "email", "csv_name_col": "user_name"}
        """
        try:
            # Read CSV
            df = pd.read_csv(io.BytesIO(file_content))
            df = df.where(df.notnull(), None) # Convert NaN to None
            
            records_processed = 0
            records_created = 0
            records_updated = 0
            
            # Inverse mapping for easier access
            # {"email": "csv_email_col", "user_name": "csv_name_col"}
            inv_mapping = {v: k for k, v in mapping.items()}
            
            for _, row in df.iterrows():
                email = row.get(inv_mapping.get('email'))
                phone = row.get(inv_mapping.get('phone'))
                
                if not email and not phone:
                    continue
                
                # Check for existing contact (deduplication) - SCOPED TO PROJECT
                existing_query = select(Contact).where(Contact.project_id == project_id)
                if email:
                    existing_query = existing_query.where(Contact.email == email)
                elif phone:
                    existing_query = existing_query.where(Contact.phone == phone)
                
                result = await db.execute(existing_query)
                contact = result.scalar_one_or_none()
                
                contact_data = {
                    "user_name": row.get(inv_mapping.get('user_name')),
                    "email": email,
                    "phone": phone,
                    "web_token": row.get(inv_mapping.get('web_token')),
                    "ios_token": row.get(inv_mapping.get('ios_token')),
                    "android_token": row.get(inv_mapping.get('android_token')),
                    "project_id": project_id
                }
                
                # Filter out None values to avoid overwriting with nulls if mapping missed some
                contact_data = {k: v for k, v in contact_data.items() if v is not None}

                if contact:
                    # Update
                    for key, value in contact_data.items():
                        setattr(contact, key, value)
                    records_updated += 1
                else:
                    # Create
                    new_contact = Contact(**contact_data)
                    db.add(new_contact)
                    records_created += 1
                
                records_processed += 1
                
                # Batch commit every 100 records for performance
                if records_processed % 100 == 0:
                    await db.commit()
            
            await db.commit()
            return {
                "success": True,
                "processed": records_processed,
                "created": records_created,
                "updated": records_updated
            }
            
        except Exception as e:
            await db.rollback()
            return {"success": False, "error": str(e)}

    @staticmethod
    async def get_contacts(
        db: AsyncSession, 
        project_id: int = None,
        skip: int = 0, 
        limit: int = 100,
        search: str = None
    ):
        query = select(Contact)
        if project_id:
            query = query.where(Contact.project_id == project_id)
            
        if search:
            query = query.where(
                (Contact.email.ilike(f"%{search}%")) | 
                (Contact.user_name.ilike(f"%{search}%")) |
                (Contact.phone.ilike(f"%{search}%"))
            )
        
        query = query.offset(skip).limit(limit)
        result = await db.execute(query)
        return result.scalars().all()
