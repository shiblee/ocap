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
        project_id: int,
        filename: str = "upload.csv"
    ) -> Dict[str, Any]:
        from app.models.import_log import ImportLog
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
            records_failed = 0
            errors = []
            
            # Inverse mapping for easier access
            # {"email": "csv_email_col", "user_name": "csv_name_col"}
            inv_mapping = {v: k for k, v in mapping.items()}
            
            def clean_str(val):
                if val is None or pd.isna(val) or str(val).lower() == 'nan' or str(val).strip() == '':
                    return None
                if isinstance(val, float) and val.is_integer():
                    return str(int(val))
                return str(val).strip()
            
            for _, row in df.iterrows():
                email = clean_str(row.get(inv_mapping.get('email')))
                phone = clean_str(row.get(inv_mapping.get('phone')))
                
                if not email and not phone:
                    records_failed += 1
                    errors.append({"row": records_processed + 1, "error": "Missing email and phone"})
                    records_processed += 1
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
                    "user_name": clean_str(row.get(inv_mapping.get('user_name'))),
                    "email": email,
                    "phone": phone,
                    "web_token": clean_str(row.get(inv_mapping.get('web_token'))),
                    "ios_token": clean_str(row.get(inv_mapping.get('ios_token'))),
                    "android_token": clean_str(row.get(inv_mapping.get('android_token'))),
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
            
            # Create import log
            import_log = ImportLog(
                project_id=project_id,
                filename=filename,
                total_rows=records_processed,
                imported_count=records_created + records_updated,
                failed_count=records_failed,
                error_details=errors
            )
            db.add(import_log)
            await db.commit()

            return {
                "success": True,
                "processed": records_processed,
                "created": records_created,
                "updated": records_updated,
                "failed": records_failed
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
        search: str = None,
        is_active: bool = None
    ):
        from sqlalchemy import func
        
        where_clauses = []
        if project_id:
            where_clauses.append(Contact.project_id == project_id)
            
        if search:
            where_clauses.append(
                (Contact.email.ilike(f"%{search}%")) | 
                (Contact.user_name.ilike(f"%{search}%")) |
                (Contact.phone.ilike(f"%{search}%"))
            )
            
        if is_active is not None:
            where_clauses.append(Contact.is_active == is_active)
        
        # Base count query
        count_query = select(func.count(Contact.id))
        for clause in where_clauses:
            count_query = count_query.where(clause)
            
        total_result = await db.execute(count_query)
        total = total_result.scalar() or 0
        
        # Web count query
        web_query = select(func.count(Contact.id)).where(Contact.web_token.isnot(None))
        for clause in where_clauses:
            web_query = web_query.where(clause)
        web_result = await db.execute(web_query)
        active_web = web_result.scalar() or 0
        
        # iOS count query
        ios_query = select(func.count(Contact.id)).where(Contact.ios_token.isnot(None))
        for clause in where_clauses:
            ios_query = ios_query.where(clause)
        ios_result = await db.execute(ios_query)
        active_ios = ios_result.scalar() or 0
        
        # Android count query
        android_query = select(func.count(Contact.id)).where(Contact.android_token.isnot(None))
        for clause in where_clauses:
            android_query = android_query.where(clause)
        android_result = await db.execute(android_query)
        active_android = android_result.scalar() or 0
        
        query = select(Contact)
        for clause in where_clauses:
            query = query.where(clause)
            
        query = query.offset(skip).limit(limit)
        result = await db.execute(query)
        items = result.scalars().all()
        
        return {
            "items": items, 
            "total": total,
            "active_web": active_web,
            "active_ios": active_ios,
            "active_android": active_android
        }
