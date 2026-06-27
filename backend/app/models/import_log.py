from sqlalchemy import Column, Integer, String, JSON, ForeignKey
from sqlalchemy.orm import relationship
from app.models.base import Base, TimestampMixin

class ImportLog(Base, TimestampMixin):
    __tablename__ = "import_logs"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
    filename = Column(String, nullable=False)
    total_rows = Column(Integer, default=0)
    imported_count = Column(Integer, default=0)
    failed_count = Column(Integer, default=0)
    error_details = Column(JSON, default=list)

    project = relationship("Project")
