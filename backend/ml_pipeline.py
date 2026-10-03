import json
import re
import os
import requests
import xgboost as xgb
import pandas as pd
import numpy as np

OLLAMA_URL = "http://127.0.0.1:11434/api/generate"

class ClinicalNormalizer:
    """Stage 1: Pre-Processor to expand acronyms and tag negations."""
    def __init__(self):
        self.abbreviations = {
            r"\bsob\b": "shortness of breath",
            r"\bcp\b": "chest pain",
            r"\bhx\b": "history of",
            r"\bmi\b": "myocardial infarction",
            r"\bc/o\b": "complains of",
            r"\bpt\b": "patient",
            r"\bn/v\b": "nausea or vomiting",
            r"\bhtn\b": "hypertension"
        }
    
    def normalize(self, text):
        normalized = text.lower()
        for abbrev, full_term in self.abbreviations.items():
            normalized = re.sub(abbrev, full_term, normalized)
        
        # Basic negation tagging (e.g., "denies chest pain" -> "[NEGATED: chest pain]")
        normalized = re.sub(r"\b(denies|no)\s+([a-z\s]+)(?:[,.]|$)", r"[NEGATED: \2]", normalized)
        return normalized

class VitalsExtractor:
    """Stage 2A: Extracts numerical vitals and imputes missing ones from training medians."""
    def __init__(self):
        # Default safety fallbacks if JSON is missing
        self.medians = {
            "heartrate": 80.0, "sbp": 120.0, "dbp": 80.0, 
            "o2sat": 98.0, "resprate": 16.0, "temperature": 98.6
        }
        if os.path.exists("vitals_imputation_medians.json"):
            try:
                with open("vitals_imputation_medians.json", "r") as f:
                    self.medians = json.load(f)
            except:
                pass

    def extract_and_impute(self, text):
        vitals = self.medians.copy()
        
        # Regex extraction
        hr_match = re.search(r"hr\s*(?:of|is|:)?\s*(\d{2,3})", text, re.IGNORECASE)
        if hr_match: vitals["heartrate"] = float(hr_match.group(1))
            
        bp_match = re.search(r"bp\s*(?:of|is|:)?\s*(\d{2,3})/(\d{2,3})", text, re.IGNORECASE)
        if bp_match:
            vitals["sbp"] = float(bp_match.group(1))
            vitals["dbp"] = float(bp_match.group(2))
            
        o2_match = re.search(r"(?:o2sat|spo2|o2|oxygen)\s*(?:of|is|:)?\s*(\d{2,3})", text, re.IGNORECASE)
        if o2_match: vitals["o2sat"] = float(o2_match.group(1))
            
        rr_match = re.search(r"(?:rr|resprate)\s*(?:of|is|:)?\s*(\d{1,2})", text, re.IGNORECASE)
        if rr_match: vitals["resprate"] = float(rr_match.group(1))
            
        temp_match = re.search(r"temp(?:erature)?\s*(?:of|is|:)?\s*(\d{2,3}\.?\d*)", text, re.IGNORECASE)
        if temp_match: vitals["temperature"] = float(temp_match.group(1))

        # Output dataframe strictly matching the 6 features expected by the XGBoost model
        return pd.DataFrame([[
            vitals["heartrate"], vitals["sbp"], vitals["dbp"], 
            vitals["o2sat"], vitals["resprate"], vitals["temperature"]
        ]], columns=['heartrate', 'sbp', 'dbp', 'o2sat', 'resprate', 'temperature'])

class XGBoostModel:
    """Stage 2B: Tabular Inference."""
    def __init__(self):
        self.model = xgb.XGBClassifier()
        self.is_loaded = False
        if os.path.exists("xgb_triage_model.json"):
            self.model.load_model("xgb_triage_model.json")
            self.is_loaded = True
            
    def predict_risk(self, vitals_df):
        if not self.is_loaded:
            return None, None
            
        probs = self.model.predict_proba(vitals_df)[0]
        predicted_class = int(np.argmax(probs))
        confidence = float(np.max(probs))
        
        # Model mapping: 0=High, 1=Medium, 2=Low
        mapping = {0: "High", 1: "Medium", 2: "Low"}
        return mapping[predicted_class], confidence
def ask_phi3(prompt):
    payload = {
        "model": "phi3",  # Removed the :mini tag
        "prompt": prompt,
        "stream": False,
        "format": "json"
    }
    # Added a 120-second timeout so it doesn't instantly fail if it's "thinking"
    response = requests.post(OLLAMA_URL, json=payload, timeout=120)
    response.raise_for_status()
    return json.loads(response.json()["response"])

def run_pipeline(text):
    """The master pipeline combining Deterministic ML and Generative AI"""
    
    # STAGE 1: Normalization
    normalizer = ClinicalNormalizer()
    normalized_text = normalizer.normalize(text)
    
    # STAGE 2: XGBoost Mathematical Vitals Assessment
    extractor = VitalsExtractor()
    vitals_df = extractor.extract_and_impute(text)
    
    xgb_model = XGBoostModel()
    xgb_priority, xgb_conf = xgb_model.predict_risk(vitals_df)
    
    xgb_context = ""
    if xgb_priority:
        xgb_context = f"\n[ML SYSTEM ALERT: An XGBoost tabular model evaluated the extracted vital signs and calculated a '{xgb_priority}' risk classification with {xgb_conf*100:.1f}% statistical confidence. Incorporate this mathematical baseline into your final assessment.]\n"

    # STAGE 3: Generative Text Analysis (Phi-3)
    prompt = f"""
    You are an expert clinical triage AI. Read the following normalized clinical note:
    "{normalized_text}"
    {xgb_context}
    
    You must extract medical entities and perform triage analysis. 
    Return a raw JSON object (without markdown formatting or code blocks) with EXACTLY this structure:
    {{
        "Extracted_Data": {{
            "Diagnoses": ["list"],
            "Symptoms": ["list"],
            "Medications": ["list"],
            "Procedures_Vitals": ["list"]
        }},
        "Triage_Assessment": {{
            "Triage_Priority": "Evaluate the text. Return exactly 'High', 'Medium', 'Low', or 'INVALID'.",
            "Reasoning": "1-2 sentence clinical reasoning.",
            "Laymans_Terms": "A simple translation for the patient."
        }}
    }}
    """
    
    try:
        phi3_result = ask_phi3(prompt)
        
        # STAGE 4: The Supervisory Arbitrator (Clinical Fail-Safe)
        final_priority = phi3_result.get("Triage_Assessment", {}).get("Triage_Priority", "Medium")
        
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