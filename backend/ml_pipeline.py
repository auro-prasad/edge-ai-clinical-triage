import requests
import json

OLLAMA_URL = "http://localhost:11434/api/generate"

def run_pipeline(text):
    """The master pipeline combining Extractor and Reasoner using ONLY local Ollama (Phi-3) - 100% Air-Gapped"""
    
    prompt = f"""
    You are an expert clinical triage AI. Read the following clinical note:
    "{text}"
    
    You must extract medical entities and perform triage analysis. 
    Return a raw JSON object (without markdown formatting or code blocks) with EXACTLY this structure:
    {{
        "Extracted_Data": {{
            "Diagnoses": ["list", "of", "diagnoses"],
            "Symptoms": ["list", "of", "symptoms"],
            "Medications": ["list", "of", "medications"],
            "Procedures_Vitals": ["list", "of", "procedures", "or", "vitals"]
        }},
        "Triage_Assessment": {{
            "Triage_Priority": "Evaluate the text. Return exactly 'High', 'Medium', 'Low', or 'INVALID' (if gibberish).",
            "Reasoning": "1-2 sentence clinical reasoning for the priority, or explain why it is invalid.",
            "Laymans_Terms": "A simple translation for the patient, or state invalid."
        }}
    }}
    """
    
    payload = {
        "model": "phi3:mini",
        "prompt": prompt,
        "stream": False,
        "format": "json"  # This forces Ollama to return strictly valid JSON
    }
    
    try:
        response = requests.post(OLLAMA_URL, json=payload)
        response.raise_for_status()
        data = response.json()
        
        # Parse the JSON returned by Phi-3
        result = json.loads(data["response"])
        return result
        
    except Exception as e:
        # Fallback matching the exact expected dictionary structure for your frontend
        return {
            "Extracted_Data": {
                "Diagnoses": [], 
                "Symptoms": [], 
                "Medications": [], 
                "Procedures_Vitals": []
            },
            "Triage_Assessment": {
                "Triage_Priority": "Medium",
                "Reasoning": f"Local AI Error: {str(e)}",
                "Laymans_Terms": "Could not generate translation at this time."
            }
        }