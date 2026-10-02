import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns
from sklearn.metrics import confusion_matrix, classification_report
from ml_pipeline import run_pipeline

print("Loading evaluation data and model...")

# 1. Our "Ground Truth" Test Dataset
test_data = [
    # HIGH PRIORITY CASES
    {"text": "Patient arriving via EMS with severe chest pain and radiating numbness.", "true_label": "High"},
    {"text": "Patient is unresponsive. Pulse is weak, suspected cardiac arrest.", "true_label": "High"},
    {"text": "Massive hemorrhage from the right leg after an accident.", "true_label": "High"},
    
    # MEDIUM PRIORITY CASES
    {"text": "Patient complains of fever, vomiting, and mild dizziness for 2 days.", "true_label": "Medium"},
    {"text": "Suspected fracture in the left wrist. Patient is in pain and swelling.", "true_label": "Medium"},
    {"text": "History of hypertension, currently experiencing a mild headache.", "true_label": "Medium"},
    
    # LOW PRIORITY CASES
    {"text": "Patient is here for a routine medication refill. No current pain.", "true_label": "Low"},
    {"text": "Minor paper cut on finger, requires a simple bandage.", "true_label": "Low"},
    {"text": "General weakness, patient wants a routine physical checkup.", "true_label": "Low"}
]

y_true = []
y_pred = []

print("Running AI predictions...")

# 2. Run the AI on each test case
for idx, item in enumerate(test_data):
    # Run your actual AI pipeline
    result = run_pipeline(item["text"])
    predicted_triage = result["Triage_Assessment"]["Triage_Priority"]
    
    y_true.append(item["true_label"])
    y_pred.append(predicted_triage)
    print(f"Note {idx+1} | True: {item['true_label']} -> Predicted: {predicted_triage}")

# 3. Generate Metrics and Confusion Matrix
labels = ["High", "Medium", "Low"]
cm = confusion_matrix(y_true, y_pred, labels=labels)

print("\n=== CLASSIFICATION REPORT ===")
print(classification_report(y_true, y_pred, labels=labels))

# 4. Plot and Save the Confusion Matrix Chart
plt.figure(figsize=(8, 6))
sns.heatmap(cm, annot=True, fmt='d', cmap='Blues', xticklabels=labels, yticklabels=labels)
plt.title('Triage Engine Confusion Matrix')
plt.ylabel('Actual (Ground Truth)')
plt.xlabel('AI Predicted')

# Save the chart as an image so you can put it in your presentation
plt.savefig('confusion_matrix.png', dpi=300, bbox_inches='tight')
print("\nEvaluation complete! Matrix saved as 'confusion_matrix.png'.")