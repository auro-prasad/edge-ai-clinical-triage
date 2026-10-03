from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, DateTime, Text
from sqlalchemy.orm import relationship
from datetime import datetime
from database import Base

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True, nullable=False)
    password = Column(String(100), nullable=False) 
    role = Column(String(20), nullable=False)      
    patient_profile = relationship("PatientProfile", back_populates="user", uselist=False)

class PatientProfile(Base):
    __tablename__ = "patient_profiles"
    mrn = Column(Integer, primary_key=True, index=True) 
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=True) 
    
    name = Column(String(100), nullable=False)
    age = Column(Integer, nullable=False)
    gender = Column(String(20), nullable=False)
    email = Column(String(100), unique=True, nullable=False) # NEW
    address = Column(Text, nullable=True)
    phone = Column(String(20), nullable=True)
    is_synthetic = Column(Boolean, default=False) 
    
    user = relationship("User", back_populates="patient_profile")
    encounters = relationship("TriageEncounter", back_populates="patient")

class StaffProfile(Base):
    __tablename__ = "staff_profiles"
    employee_id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)
    
    name = Column(String(100), nullable=False)
    age = Column(Integer, nullable=False)
    gender = Column(String(20), nullable=False)
    email = Column(String(100), unique=True, nullable=False) # NEW
    address = Column(Text, nullable=True)
    phone = Column(String(20), nullable=True)
    
    qualifications = Column(String(255), nullable=True)
    specialization = Column(String(100), nullable=True)

class TriageEncounter(Base):
    __tablename__ = "triage_encounters"
    id = Column(Integer, primary_key=True, index=True)
    mrn = Column(Integer, ForeignKey("patient_profiles.mrn"), nullable=False)
    raw_note = Column(Text, nullable=False)
    triage_priority = Column(String(20), nullable=False)
    reasoning = Column(Text, nullable=False)
    laymans_terms = Column(Text, nullable=False)
    doctor_override = Column(String(20), nullable=True)
    override_reason = Column(String(255), nullable=True)
    status = Column(String(50), default="WAITING") 
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # --- NEW FIELDS FOR DUAL-ENGINE AI ---
    xgboost_risk = Column(String(20), nullable=True)
    xgboost_confidence = Column(String(20), nullable=True)
    safety_override = Column(Boolean, default=False)
    
    patient = relationship("PatientProfile", back_populates="encounters")