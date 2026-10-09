import json
import os
import requests
import xgboost as xgb
import pandas as pd
import numpy as np

# Import from your newly created modular files
from normalizer import normalize_clinical_text
from vitals_parser import extract_and_impute_vitals

OLLAMA_URL = "http://127.0.0.1:11434/api/generate"

class XGBoostModel:
    """Stage 2B: Tabular Inference."""
    def __init__(self):
        # Update 1: Use native Booster
        self.model = xgb.Booster() 
        self.is_loaded = False
        if os.path.exists("xgb_triage_model.json"):
            self.model.load_model("xgb_triage_model.json")
            self.is_loaded = True
            
    def predict_risk(self, vitals_df):
        if not self.is_loaded:
            return None, None
            
        # Update 2 & 3: Convert to DMatrix and use predict()
        dmatrix = xgb.DMatrix(vitals_df)
        probs = self.model.predict(dmatrix)[0]
        
        predicted_class = int(np.argmax(probs))
        confidence = float(np.max(probs))
        
        
        mapping = {0: "High", 1: "Medium", 2: "Low"}
        return mapping[predicted_class], confidence

def ask_phi3(prompt):
    payload = {
        "model": "phi3",  
        "prompt": prompt,
        "stream": False,
        "format": "json"
    }
    response = requests.post(OLLAMA_URL, json=payload, timeout=120)
    response.raise_for_status()
    return json.loads(response.json()["response"])

def run_pipeline(text):
    """The master pipeline combining Deterministic ML and Generative AI"""
    
    # STAGE 1: Normalization
    normalized_text = normalize_clinical_text(text)
    
    # STAGE 2: XGBoost Mathematical Vitals Assessment
    # STAGE 2: XGBoost Mathematical Vitals Assessment
    vitals_dict = extract_and_impute_vitals(normalized_text)
    
    xgb_context = ""
    xgb_priority = None
    xgb_conf = None
    
    # ONLY trigger XGBoost if the parser actually found real medical data
    # (Ensures vitals_dict is not empty and has at least one valid number)
    if vitals_dict and any(v is not None for v in vitals_dict.values()):
        vitals_df = pd.DataFrame([[
            vitals_dict.get("HeartRate", 80.0), 
            vitals_dict.get("SystolicBP", 120.0), 
            vitals_dict.get("DiastolicBP", 80.0), 
            vitals_dict.get("SpO2", 98.0), 
            vitals_dict.get("RespiratoryRate", 16.0), 
            vitals_dict.get("Temperature", 37.0)
        ]], columns=['heartrate', 'sbp', 'dbp', 'o2sat', 'resprate', 'temperature'])
        
        xgb_model = XGBoostModel()
        xgb_priority, xgb_conf = xgb_model.predict_risk(vitals_df)
        
        xgb_context = f"\n[VITALS ASSESSMENT: Objective vital signs indicate a '{xgb_priority}' risk level. Consider this physiological baseline in your clinical decision.]\n"
    # STAGE 3: Generative Text Analysis (Phi-3)
    # UPDATED: Added semantic guardrails and requested highly detailed clinical/patient explanations.
    prompt = f"""
    You are an expert clinical triage AI. Read the following normalized text:
    "{normalized_text}"
    {xgb_context}
    
    CRITICAL RULE 1 - THE CIRCUIT BREAKER: First, evaluate if the text is a genuine medical complaint. If it is a greeting (e.g., "hello"), random gibberish, or non-clinical text, you MUST abort triage and return EXACTLY this minimal JSON, completely omitting the Extracted_Data:
    {{
        "Triage_Assessment": {{
            "Triage_Priority": "INVALID",
            "Reasoning": "Non-medical text detected. Triage aborted.",
            "Laymans_Terms": "Please provide a valid description of your symptoms."
        }}
    }}
    
    CRITICAL RULE 2 - FULL TRIAGE: If and ONLY if the text is a valid medical note, perform full extraction and triage. Return EXACTLY this structure:
    {{
        "Extracted_Data": {{
            "Diagnoses": ["list"],
            "Symptoms": ["list"],
            "Medications": ["list"],
            "Procedures_Vitals": ["list"]
        }},
        "Triage_Assessment": {{
            "Triage_Priority": "Return 'High', 'Medium', or 'Low'",
            "Reasoning": "Provide a brief, maximum 3-sentence clinical rationale for the attending doctor. Focus strictly on physiological risks. NEVER mention AI or algorithms.",
            "Laymans_Terms": "Provide a clear, comforting explanation for the patient."
        }}
    }}
    """    
    try:
        phi3_result = ask_phi3(prompt)
        
        # STAGE 4: The Supervisory Arbitrator (Clinical Fail-Safe)
        final_priority = phi3_result.get("Triage_Assessment", {}).get("Triage_Priority", "Medium")
        
        # 🚨 THE NEW CIRCUIT BREAKER 🚨
        # If Phi-3 detects non-medical text, bypass XGBoost completely.
        if final_priority == "INVALID":
            phi3_result["XGBoost_Assessment"] = {}
            return phi3_result
        
        if xgb_priority == "High" and final_priority in ["Medium", "Low"]:
            # Auto-Escalate: Phi-3 missed a physiological red flag. Force override.
            phi3_result["Triage_Assessment"]["Triage_Priority"] = "High"
            phi3_result["Triage_Assessment"]["Reasoning"] = (
                "[OVERRIDE: XGBoost detected critical vitals instability. Priority escalated to High.] " 
                + phi3_result["Triage_Assessment"].get("Reasoning", "")
            )
            phi3_result["Triage_Assessment"]["safety_override_triggered"] = True
            
        # Append the XGBoost data to the JSON payload for the Next.js frontend to display
        phi3_result["XGBoost_Assessment"] = {
            "Predicted_Risk": xgb_priority,
            "Confidence_Score": f"{xgb_conf*100:.1f}%" if xgb_conf else None
        }

        return phi3_result
        
    except Exception as e:
        print(f"\n🔥 OLLAMA CONNECTION ERROR: {str(e)}\n")
        return {
            "Extracted_Data": {"Diagnoses": [], "Symptoms": [], "Medications": [], "Procedures_Vitals": []},
            "Triage_Assessment": {
                "Triage_Priority": xgb_priority if xgb_priority else "Medium",
                "Reasoning": f"Phi-3 Failed or Offline. Using XGBoost Fallback.",
                "Laymans_Terms": "Translation unavailable."
            },
            "XGBoost_Assessment": {
                "Predicted_Risk": xgb_priority,
                "Confidence_Score": f"{xgb_conf*100:.1f}%" if xgb_conf else None
            }
        }