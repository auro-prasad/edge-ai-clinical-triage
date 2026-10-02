from transformers import pipeline
from google import genai
import json

# 1. Initialize the Hugging Face NER Model (Kept for Structured Data Extraction)
print("Loading NER model...")
ner_pipeline = pipeline("ner", model="d4data/biomedical-ner-all", aggregation_strategy="simple")

# 2. Configure the NEW Gemini Client
# REPLACE 'YOUR_API_KEY_HERE' WITH YOUR ACTUAL KEY
client = genai.Client(api_key="YOUR_GOOGLE_API_KEY_HERE")

def analyze_with_llm(raw_text):
    """Uses the NEW Google GenAI SDK to reason about the text, assign priority, and translate."""
    prompt = f"""
    You are an expert clinical triage AI. Read the following text:
    "{raw_text}"
    
    You must return a raw JSON object (without markdown formatting or code blocks) with exactly these three keys:
    1. "Triage_Priority": Evaluate the text. If it is a medical note, return exactly "High", "Medium", or "Low". If the text is random, gibberish, or NOT a clinical note, return exactly "INVALID".
    2. "Reasoning": A 1-2 sentence explanation. If "INVALID", explain that the provided text is not a valid medical record. Otherwise, provide the clinical reasoning for the assigned priority.
    3. "Laymans_Terms": A simple translation. If "INVALID", state that no medical translation can be provided for non-medical text.
    """
    
    try:
        # NEW SDK SYNTAX for generating content
        response = client.models.generate_content(
            model='gemini-3.6-flash',
            contents=prompt
        )
        
        # Clean up the response in case Gemini adds markdown code blocks like ```json ... ```
        cleaned_response = response.text.replace('```json', '').replace('```', '').strip()
        result = json.loads(cleaned_response)
        return result
    except Exception as e:
        return {
            "Triage_Priority": "Medium",
            "Reasoning": f"Fallback applied due to AI error: {str(e)}",
            "Laymans_Terms": "Could not generate translation at this time."
        }

def run_pipeline(text):
    """The master pipeline combining Extractor (NER) and Reasoner (LLM)"""
    
    # --- Step 1: The Extractor (NER) ---
    ner_results = ner_pipeline(text)
    
    structured_record = {
        "Diagnoses": [],
        "Symptoms": [],
        "Medications": [],
        "Procedures_Vitals": []
    }
    
    for entity in ner_results:
        label = entity['entity_group']
        word = entity['word']
        
        if label in ['Sign_symptom']:
            structured_record["Symptoms"].append(word)
        elif label in ['Disease_disorder']:
            structured_record["Diagnoses"].append(word)
        elif label in ['Medication', 'Chemical']:
            structured_record["Medications"].append(word)
        elif label in ['Diagnostic_procedure', 'Therapeutic_procedure', 'Clinical_modifier']:
            structured_record["Procedures_Vitals"].append(word)

    # Clean up duplicates
    for key in structured_record:
        structured_record[key] = list(set(structured_record[key]))

    # --- Step 2: The Reasoner (LLM) ---
    llm_analysis = analyze_with_llm(text)

    # --- Step 3: Combine and Return ---
    return {
        "Extracted_Data": structured_record,
        "Triage_Assessment": llm_analysis
    }