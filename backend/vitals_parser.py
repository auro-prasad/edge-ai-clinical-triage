import re

# Standard healthy baselines to prevent XGBoost dimensional crashes
# This acts as your in-memory vitals_imputation_medians
DEFAULT_VITALS = {
    "HeartRate": 80.0,
    "SystolicBP": 120.0,
    "DiastolicBP": 80.0,
    "SpO2": 98.0,
    "RespiratoryRate": 16.0,
    "Temperature": 98.6,
    "Age": 45.0 # Fallback age
}

def extract_and_impute_vitals(text: str, patient_age: int = None) -> dict:
    """
    Extracts vitals via regex. Falls back to defaults if not found.
    """
    extracted = DEFAULT_VITALS.copy()
    
    if patient_age:
        extracted["Age"] = float(patient_age)

    # 1. Heart Rate (e.g., HR 145, HR: 90)
    hr_match = re.search(r'\bHR\s*[:\-]?\s*(\d+)', text, re.IGNORECASE)
    if hr_match: extracted["HeartRate"] = float(hr_match.group(1))

    # 2. Blood Pressure (e.g., BP 210/120)
    bp_match = re.search(r'\bBP\s*[:\-]?\s*(\d+)/(\d+)', text, re.IGNORECASE)
    if bp_match:
        extracted["SystolicBP"] = float(bp_match.group(1))
        extracted["DiastolicBP"] = float(bp_match.group(2))

    # 3. Oxygen Saturation (e.g., SpO2 84%, O2 99)
    spo2_match = re.search(r'\b(?:SpO2|O2)\s*[:\-]?\s*(\d+)', text, re.IGNORECASE)
    if spo2_match: extracted["SpO2"] = float(spo2_match.group(1))

    # 4. Respiratory Rate (e.g., RR 20)
    rr_match = re.search(r'\bRR\s*[:\-]?\s*(\d+)', text, re.IGNORECASE)
    if rr_match: extracted["RespiratoryRate"] = float(rr_match.group(1))

    # 5. Temperature (e.g., Temp 98.6, T: 101)
    temp_match = re.search(r'\b(?:Temp|T)\s*[:\-]?\s*(\d+(\.\d+)?)', text, re.IGNORECASE)
    if temp_match: extracted["Temperature"] = float(temp_match.group(1))

    return extracted