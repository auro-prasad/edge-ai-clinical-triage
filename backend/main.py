import json
import os
import io
import csv
import random
import string
import requests
from fastapi.responses import StreamingResponse
from datetime import datetime
from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List
from fastapi import HTTPException

import models
from database import engine, get_db
from ml_pipeline import run_pipeline

app = FastAPI(title="Clinical Note Structuring and Triaging API")

# Automatically create the MySQL tables if they do not exist
models.Base.metadata.create_all(bind=engine)

# Enable CORS for frontend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ==========================================
# PYDANTIC SCHEMAS
# ==========================================
class LoginRequest(BaseModel):
    username: str
    password: str

class UserCreate(BaseModel):
    username: str
    password: str
    role: str
    # Required only if role is 'patient'
    name: Optional[str] = None
    age: Optional[int] = None
    gender: Optional[str] = None

class TriageSubmissionRequest(BaseModel):
    mrn: int
    raw_note: str

class OverrideRequest(BaseModel):
    new_priority: str
class ProvisionAccountRequest(BaseModel):
    role: str
    name: str
    email: str
    age: Optional[int] = None
    gender: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    qualifications: Optional[str] = None
    specialization: Optional[str] = None

# ==========================================
# JSON BACKUP UTILITY (Retained from original)
# ==========================================
DATA_FILE = os.path.join(os.path.dirname(__file__), "data", "structured_clinical_data.json")

def save_json_backup(record: dict):
    try:
        os.makedirs(os.path.dirname(DATA_FILE), exist_ok=True)
        data = []
        if os.path.exists(DATA_FILE):
            with open(DATA_FILE, "r") as f:
                data = json.load(f)
        data.insert(0, record)
        with open(DATA_FILE, "w") as f:
            json.dump(data, f, indent=2, default=str)
    except Exception as e:
        print(f"Warning: JSON backup skipped: {e}")


# ==========================================
# STARTUP EVENT: Default Admin & Sandbox Patient
# ==========================================
@app.on_event("startup")
def initialize_system():
    db = next(get_db())
    
    # 1. Initialize Default Admin
    admin = db.query(models.User).filter(models.User.username == "admin").first()
    if not admin:
        default_admin = models.User(username="admin", password="admin123", role="admin")
        db.add(default_admin)
        db.commit()

    # 2. Initialize Synthetic Test Patient (MRN 0)
    sandbox_profile = db.query(models.PatientProfile).filter(models.PatientProfile.is_synthetic == True).first()
    
    if not sandbox_profile:
        # Prevent duplicate entry by checking if the user login already exists from a failed run
        test_user = db.query(models.User).filter(models.User.username == "test_patient").first()
        
        if not test_user:
            test_user = models.User(username="test_patient", password="sandbox123", role="patient")
            db.add(test_user)
            db.commit()
            db.refresh(test_user)
            
        test_profile = models.PatientProfile(
            mrn=0,
            user_id=test_user.id,
            name="Test Patient (Sandbox)",
            age=45,
            gender="Other",
            email="sandbox@healthsync.com",   # Fixed: Added required email
            address="123 Sandbox Lane",       # Fixed: Added required address
            phone="0000000000",               # Fixed: Added required phone
            is_synthetic=True
        )
        db.add(test_profile)
        db.commit()
        
    db.close()

@app.get("/")
def health_check():
    return {"status": "healthy", "service": "Clinical Triaging API with MRN Architecture"}


# ==========================================
# AUTHENTICATION
# ==========================================
@app.post("/api/login")
def login(request: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(
        models.User.username == request.username,
        models.User.password == request.password
    ).first()
    
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    return {"success": True, "role": user.role, "username": user.username}


# ==========================================
# IT ADMIN ENDPOINTS
# ==========================================
@app.post("/api/users")
def create_user(user: ProvisionAccountRequest, db: Session = Depends(get_db)):
    # 1. Prevent Duplicate Emails across both tables
    if db.query(models.PatientProfile).filter(models.PatientProfile.email == user.email).first() or \
       db.query(models.StaffProfile).filter(models.StaffProfile.email == user.email).first():
        raise HTTPException(status_code=400, detail="This email is already registered in the system.")

    # 2. Auto-Generate Credentials based on Role
    prefix = "DR" if user.role == "doctor" else "RN" if user.role == "nurse" else "PT"
    random_id = str(random.randint(1000, 9999))
    generated_username = f"{prefix}-{random_id}"
    
    characters = string.ascii_letters + string.digits
    generated_password = ''.join(random.choice(characters) for i in range(8))
    
    # 3. Create Login Identity
    new_user = models.User(
        username=generated_username, 
        password=generated_password, 
        role=user.role
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    # 4. Create the Respective Profile
    if user.role == "patient":
        profile = models.PatientProfile(
            user_id=new_user.id, name=user.name, age=user.age, gender=user.gender,
            email=user.email, address=user.address, phone=user.phone, is_synthetic=False
        )
        db.add(profile)
        
    else: 
        profile = models.StaffProfile(
            user_id=new_user.id, name=user.name, age=user.age, gender=user.gender,
            email=user.email, address=user.address, phone=user.phone,
            qualifications=user.qualifications if user.role == "doctor" else None,
            specialization=user.specialization if user.role == "doctor" else None
        )
        db.add(profile)
        
    db.commit()
    
    return {
        "success": True,
        "message": f"{user.role.capitalize()} registered successfully.",
        "credentials": {
            "username": generated_username,
            "password": generated_password
        }
    }
# ==========================================
# NURSE ENDPOINTS (Clinical Intake)
# ==========================================
@app.get("/api/patients/registered")
def get_registered_patients(db: Session = Depends(get_db)):
    """Fetches all patients and their MOST RECENT triage status for the directory."""
    patients = db.query(models.PatientProfile).all()
    directory = []
    
    for p in patients:
        # Fetch the single most recent encounter for this patient
        latest_enc = db.query(models.TriageEncounter).filter(
            models.TriageEncounter.mrn == p.mrn
        ).order_by(models.TriageEncounter.created_at.desc()).first()
        
        directory.append({
            "mrn": p.mrn,
            "name": p.name,
            "age": p.age,
            "gender": p.gender,
            "is_synthetic": p.is_synthetic,
            "latest_triage": (latest_enc.doctor_override or latest_enc.triage_priority) if latest_enc else "NO RECORD",
            "latest_reasoning": latest_enc.reasoning if latest_enc else "No prior triage records found in the system.",
            "latest_raw_note": latest_enc.raw_note if latest_enc else "N/A",
            "latest_date": latest_enc.created_at.strftime("%B %d, %Y - %H:%M") if (latest_enc and latest_enc.created_at) else "N/A"
        })
        
    return directory
# Explicit Schema Definition
class NotePayload(BaseModel):
    mrn: int
    raw_note: str

@app.post("/api/process-note")
def process_note(req: NotePayload, db: Session = Depends(get_db)):
    """Process clinical note via the Neuro-Symbolic ML Pipeline."""
    if not req.raw_note.strip():
        raise HTTPException(status_code=400, detail="Note text cannot be empty.")
        
    patient = db.query(models.PatientProfile).filter(models.PatientProfile.mrn == req.mrn).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient MRN not found.")

    # 1. RUN THE NEW DUAL-ENGINE PIPELINE
    try:
        result_dict = run_pipeline(req.raw_note.strip())
    except Exception as e:
        print(f"Pipeline Error: {str(e)}")
        raise HTTPException(status_code=503, detail="The AI engine failed to process the note.")
    
    # 2. Extract Data
    triage_info = result_dict.get("Triage_Assessment") or {}
    priority = str(triage_info.get("Triage_Priority", "MEDIUM")).upper()
    
    # 🚨 FIX 1: Use the correct variables (`priority` and `result_dict`)
    if priority == "INVALID":
        return {
            "Patient_ID": f"MRN-{patient.mrn}",
            "Patient_Name": patient.name,
            "Extracted_Data": result_dict.get("Extracted_Data", {}),
            "Triage_Assessment": triage_info,
            "XGBoost_Assessment": {}
        }

    reasoning = str(triage_info.get("Reasoning", "No reasoning provided."))
    laymans = str(triage_info.get("Laymans_Terms", "No translation provided."))
    safety_override = bool(triage_info.get("safety_override_triggered", False))

    # 🚨 FIX 2: Safely handle XGBoost info in case it returns None
    xgb_info = result_dict.get("XGBoost_Assessment") or {}
    xgb_risk = xgb_info.get("Predicted_Risk")
    xgb_conf = xgb_info.get("Confidence_Score")

    # 3. Save to Database with new XGBoost fields
    new_encounter = models.TriageEncounter(
        mrn=patient.mrn,
        raw_note=req.raw_note.strip(),
        triage_priority=priority,
        reasoning=reasoning,
        laymans_terms=laymans,
        status="WAITING",
        xgboost_risk=xgb_risk,
        xgboost_confidence=xgb_conf,
        safety_override=safety_override
    )
    db.add(new_encounter)
    db.commit()
    db.refresh(new_encounter)

    return {
        "id": new_encounter.id,
        "Patient_ID": f"MRN-{patient.mrn}",
        "Patient_Name": patient.name,
        "Triage_Assessment": triage_info,
        "XGBoost_Assessment": xgb_info
    }

@app.get("/api/patients")
def get_triage_queue(db: Session = Depends(get_db)):
    """Retrieve all active encounters currently WAITING in the ER."""
    encounters = db.query(models.TriageEncounter).filter(
        models.TriageEncounter.status == "WAITING"
    ).order_by(models.TriageEncounter.created_at.asc()).all()
    
    queue = []
    for enc in encounters:
        queue.append({
            "id": enc.id,
            "mrn": enc.patient.mrn,
            "name": enc.patient.name,
            "age": enc.patient.age,
            "gender": enc.patient.gender,
            "triage_priority": enc.triage_priority,
            "reasoning": enc.reasoning,
            "raw_note": enc.raw_note,             
            "laymans_terms": enc.laymans_terms,
            "doctor_override": enc.doctor_override,
            "created_at": enc.created_at,
            # Pass the ML metrics to the frontend
            "xgboost_risk": enc.xgboost_risk,
            "xgboost_confidence": enc.xgboost_confidence,
            "safety_override": enc.safety_override
        })
    return queue

@app.put("/api/override/{encounter_id}")
def override_priority(encounter_id: int, req: OverrideRequest, db: Session = Depends(get_db)):
    """Allows physicians to correct AI prioritization."""
    encounter = db.query(models.TriageEncounter).filter(models.TriageEncounter.id == encounter_id).first()
    if not encounter:
        raise HTTPException(status_code=404, detail="Encounter not found.")
        
    encounter.doctor_override = req.new_priority
    db.commit()
    return {"success": True, "message": "Priority updated successfully."}


# ==========================================
# PATIENT PORTAL ENDPOINTS (Read-Only)
# ==========================================
@app.get("/api/patients/me")
def get_my_record(username: str, db: Session = Depends(get_db)):
    """Strictly fetches encounters belonging to the logged-in patient."""
    user = db.query(models.User).filter(models.User.username == username).first()
    
    if not user or not user.patient_profile:
        return []
        
    encounters = db.query(models.TriageEncounter).filter(
        models.TriageEncounter.mrn == user.patient_profile.mrn
    ).order_by(models.TriageEncounter.created_at.desc()).all()
    
    return [
        {
            "name": user.patient_profile.name,
            "laymans_terms": enc.laymans_terms,
            "status": enc.status,
            "created_at": enc.created_at
        }
        for enc in encounters
    ]
# ==========================================
# ADMIN ANALYTICS & GOVERNANCE ENDPOINTS
# ==========================================

@app.get("/api/admin/metrics")
def get_system_metrics(db: Session = Depends(get_db)):
    """Calculates ER throughput and AI Safety (Override) metrics."""
    encounters = db.query(models.TriageEncounter).all()
    
    total_encounters = len(encounters)
    if total_encounters == 0:
        return {
            "total": 0, "distribution": {}, "override_rate": 0, 
            "overrides": 0, "ai_interventions": 0, "ai_intervention_rate": 0
        }

    # Calculate Triage Distribution
    distribution = {"HIGH": 0, "MEDIUM": 0, "LOW": 0}
    overrides = 0
    ai_interventions = 0

    for enc in encounters:
        # Triage breakdown
        priority = (enc.triage_priority or "").upper()
        if priority in distribution:
            distribution[priority] += 1
            
        # Count human-in-the-loop overrides (Doctor overruling AI)
        if enc.doctor_override:
            overrides += 1
            
        # Count Neuro-Symbolic overrides (XGBoost overruling Phi-3)
        if getattr(enc, 'safety_override', False):
            ai_interventions += 1

    override_rate = round((overrides / total_encounters) * 100, 1)
    ai_intervention_rate = round((ai_interventions / total_encounters) * 100, 1)

    return {
        "total": total_encounters,
        "distribution": distribution,
        "overrides": overrides,
        "override_rate": override_rate,
        "ai_interventions": ai_interventions,
        "ai_intervention_rate": ai_intervention_rate
    }

@app.get("/api/admin/export")
def export_clinical_data(db: Session = Depends(get_db)):
    """Generates an anonymized CSV export of all clinical encounters."""
    encounters = db.query(models.TriageEncounter).all()
    
    # Create an in-memory string buffer
    stream = io.StringIO()
    writer = csv.writer(stream)
    
    # Write the CSV Header (Notice we omit the Patient Name for HIPAA anonymity)
    writer.writerow([
        "Encounter_ID", "MRN", "Age", "Gender", "Created_At", 
        "Raw_Note", "AI_Priority", "AI_Reasoning", "Doctor_Override"
    ])
    
    # Write the rows
    for enc in encounters:
        writer.writerow([
            enc.id,
            enc.patient.mrn,
            enc.patient.age,
            enc.patient.gender,
            enc.created_at.strftime("%Y-%m-%d %H:%M:%S"),
            enc.raw_note,
            enc.triage_priority,
            enc.reasoning,
            enc.doctor_override or "None"
        ])
        
    response = StreamingResponse(iter([stream.getvalue()]), media_type="text/csv")
    response.headers["Content-Disposition"] = "attachment; filename=clinical_triage_audit.csv"
    
    return response
@app.get("/api/admin/users")
def get_network_directory(db: Session = Depends(get_db)):
    """Fetches all registered users and their basic demographic info for the Admin."""
    users = db.query(models.User).all()
    directory = []
    
    for u in users:
        # Skip the default admin account to keep the list clean
        if u.role == "admin": continue 
        
        name = "Unknown"
        email = "N/A"
        
        # Get data from the correct profile table based on role
        if u.role == "patient" and u.patient_profile:
            name = u.patient_profile.name
            email = u.patient_profile.email
        elif u.role in ["doctor", "nurse"]:
            # Need to query the StaffProfile directly using user_id
            staff = db.query(models.StaffProfile).filter(models.StaffProfile.user_id == u.id).first()
            if staff:
                name = staff.name
                email = staff.email
                
        directory.append({
            "user_id": u.username,
            "password": u.password,
            "role": u.role.capitalize(),
            "name": name,
            "email": email
        })
        
    return directory
@app.delete("/api/admin/users/{username}")
def revoke_user_access(username: str, db: Session = Depends(get_db)):
    """Revokes network login access. Retains medical records for legal compliance."""
    user = db.query(models.User).filter(models.User.username == username).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")
        
    if user.role == "patient":
        # Disconnect the login identity from the medical record, but KEEP the MRN data
        db.query(models.PatientProfile).filter(models.PatientProfile.user_id == user.id).update({"user_id": None})
    else:
        # For staff, we can delete their profile completely
        db.query(models.StaffProfile).filter(models.StaffProfile.user_id == user.id).delete()
        
    # Delete the login credentials
    db.delete(user)
    db.commit()
    
    return {"success": True, "message": f"Access revoked for {username}."}
@app.get("/api/users/{username}/name")
def get_user_name(username: str, db: Session = Depends(get_db)):
    """Fetches the real name of the logged-in user."""
    user = db.query(models.User).filter(models.User.username == username).first()
    if not user:
        return {"name": "Attending Physician"}
        
    if user.role == "patient" and user.patient_profile:
        return {"name": user.patient_profile.name}
        
    staff = db.query(models.StaffProfile).filter(models.StaffProfile.user_id == user.id).first()
    if staff:
        return {"name": staff.name}
        
    return {"name": "Attending Physician"}
@app.get("/api/patients/{mrn}/history")
def get_patient_history(mrn: int, db: Session = Depends(get_db)):
    """Fetches all past clinical encounters for a specific patient by MRN."""
    encounters = db.query(models.TriageEncounter).filter(
        models.TriageEncounter.mrn == mrn
    ).order_by(models.TriageEncounter.created_at.desc()).all()
    
    history = []
    for enc in encounters:
        history.append({
            "id": enc.id,
            "created_at": enc.created_at,
            "triage_priority": enc.triage_priority,
            "doctor_override": enc.doctor_override,
            "status": enc.status,
            "raw_note": enc.raw_note,
            "laymans_terms": enc.laymans_terms  # Added so the patient can read it!
        })
    return history

@app.get("/api/patient/profile/{username}")
def get_patient_profile(username: str, db: Session = Depends(get_db)):
    """Fetches the patient's full demographic profile using their login username."""
    user = db.query(models.User).filter(models.User.username == username).first()
    if not user or not user.patient_profile:
        raise HTTPException(status_code=404, detail="Patient profile not found.")
        
    p = user.patient_profile
    return {
        "mrn": p.mrn,
        "name": p.name,
        "age": p.age,
        "gender": p.gender,
        "email": p.email,
        "phone": p.phone,
        "address": p.address
    }