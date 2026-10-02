from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class ProvisionAccountRequest(BaseModel):
    role: str 
    name: str
    age: int
    gender: str
    email: str # NEW
    address: str
    phone: str
    qualifications: Optional[str] = None
    specialization: Optional[str] = None

class PatientDropdownResponse(BaseModel):
    mrn: int
    name: str
    age: int
    gender: str
    is_synthetic: bool
    class Config:
        from_attributes = True

class TriageSubmissionRequest(BaseModel):
    mrn: int
    raw_note: str

class OverrideRequest(BaseModel):
    new_priority: str