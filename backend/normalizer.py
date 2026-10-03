import re

# Hash map for standard emergency shorthand
ACRONYM_MAP = {
    r'\bSOB\b': 'Shortness of Breath',
    r'\bCP\b': 'Chest Pain',
    r'\bhx\b': 'History of',
    r'\bMI\b': 'Myocardial Infarction',
    r'\bc/o\b': 'complains of',
    r'\bpt\b': 'patient',
    r'\bN/V\b': 'Nausea and Vomiting',
    r'\bHTN\b': 'Hypertension',
    r'\bDM\b': 'Diabetes Mellitus'
}

def expand_acronyms(text: str) -> str:
    for pattern, expansion in ACRONYM_MAP.items():
        text = re.sub(pattern, expansion, text, flags=re.IGNORECASE)
    return text

def tag_negations(text: str) -> str:
    """
    Wraps denied symptoms in a NEGATED token.
    Example: 'Patient denies chest pain' -> 'Patient denies NEGATED_chest pain'
    """
    # Simple regex to catch "denies [symptom]" or "no [symptom]"
    negation_patterns = [
        r'\bdenies\s+([a-zA-Z\s]+)(?:\.|\,|\;|$)',
        r'\bno\s+([a-zA-Z\s]+)(?:\.|\,|\;|$)'
    ]
    
    for pattern in negation_patterns:
        matches = re.finditer(pattern, text, flags=re.IGNORECASE)
        for match in matches:
            symptom = match.group(1).strip()
            # Replace spaces with underscores for the symptom and tag it
            negated_token = f"NEGATED_{symptom.replace(' ', '_')}"
            text = text.replace(symptom, negated_token)
            
    return text

def normalize_clinical_text(raw_note: str) -> str:
    """The main pre-processing pipeline."""
    text = expand_acronyms(raw_note)
    text = tag_negations(text)
    return text