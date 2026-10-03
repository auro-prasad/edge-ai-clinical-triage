import pandas as pd
import numpy as np
import xgboost as xgb
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, confusion_matrix, accuracy_score
import matplotlib.pyplot as plt
import seaborn as sns
import requests
import io
import gzip
import json

def fetch_raw_mimic_data():
    print("Downloading authentic MIMIC-IV-ED Demo data from PhysioNet...")
    url = "https://physionet.org/files/mimic-iv-ed-demo/2.2/ed/triage.csv.gz"
    headers = {'User-Agent': 'Mozilla/5.0'}
    
    try:
        response = requests.get(url, headers=headers)
        with gzip.open(io.BytesIO(response.content), 'rt') as f:
            df = pd.read_csv(f)
    except Exception as e:
        print(f"Failed to download dataset. Error: {e}")
        return None

    features = ['heartrate', 'sbp', 'dbp', 'o2sat', 'resprate', 'temperature']
    df_vitals = df[features + ['acuity']].copy()

    # Cast to numeric types; bad strings become NaN (no imputation yet!)
    for col in features + ['acuity']:
        df_vitals[col] = pd.to_numeric(df_vitals[col], errors='coerce')

    # Drop rows where target ground truth is missing
    df_vitals = df_vitals.dropna(subset=['acuity']).copy()

    # Map MIMIC Acuity (1-5) to triage urgency:
    # 0 = High (Acuity 1 & 2), 1 = Medium (Acuity 3), 2 = Low (Acuity 4 & 5)
    def map_acuity(acuity):
        if acuity <= 2:
            return 0
        elif acuity == 3:
            return 1
        else:
            return 2

    df_vitals['Priority'] = df_vitals['acuity'].apply(map_acuity)
    df_vitals = df_vitals.drop('acuity', axis=1)
    return df_vitals, features

def prepare_and_train():
    data = fetch_raw_mimic_data()
    if data is None:
        return
    df, features = data

    X = df[features]
    y = df['Priority']

    # Phase 1: Stratified Split BEFORE any imputation or augmentation
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.25, random_state=42, stratify=y
    )
    print(f"Initial Split -> Train cases: {len(X_train)}, Authentic Holdout Test cases: {len(X_test)}")

    # Phase 2: Imputation without Data Leakage
    train_medians = X_train.median()

    with open("vitals_imputation_medians.json", "w") as f:
        json.dump(train_medians.to_dict(), f, indent=4)
    print("Saved 'vitals_imputation_medians.json' for backend production inference.")

    X_train = X_train.fillna(train_medians)
    X_test = X_test.fillna(train_medians)

    # Phase 3: Train-Set-Only Augmentation
    print("Augmenting training set only using biological variance...")
    np.random.seed(42)
    aug_X_list = [X_train]
    aug_y_list = [y_train]

    for _ in range(49):
        noise = pd.DataFrame(
            np.random.normal(0, 1.2, X_train.shape),
            columns=features,
            index=X_train.index
        )
        noisy_sample = X_train + noise
        
        # Enforce realistic physiological bounds
        noisy_sample['o2sat'] = noisy_sample['o2sat'].clip(upper=100, lower=60)
        noisy_sample['heartrate'] = noisy_sample['heartrate'].clip(lower=30, upper=220)
        noisy_sample['sbp'] = noisy_sample['sbp'].clip(lower=50, upper=260)
        noisy_sample['dbp'] = noisy_sample['dbp'].clip(lower=30, upper=160)
        noisy_sample['resprate'] = noisy_sample['resprate'].clip(lower=6, upper=60)
        noisy_sample['temperature'] = noisy_sample['temperature'].clip(lower=90.0, upper=108.0)

        aug_X_list.append(noisy_sample)
        aug_y_list.append(y_train)

    X_train_final = pd.concat(aug_X_list, ignore_index=True)
    y_train_final = pd.concat(aug_y_list, ignore_index=True)

    print(f"Final training samples: {len(X_train_final)} | Test samples (authentic): {len(X_test)}")

    # Phase 4: Model Training
    print("\nTraining XGBoost Classifier...")
    model = xgb.XGBClassifier(
        objective='multi:softprob',
        num_class=3,
        learning_rate=0.08,
        max_depth=3,
        n_estimators=120,
        subsample=0.85,
        colsample_bytree=0.85,
        random_state=42
    )
    model.fit(X_train_final, y_train_final)

    # Phase 5: Evaluation on Unseen, Authentic Test Patients
    predictions = model.predict(X_test)
    print("\nAuthentic Holdout Test Accuracy:", accuracy_score(y_test, predictions))
    print("\nClassification Report (Authentic Test Cases):\n",
          classification_report(
              y_test, 
              predictions, 
              labels=[0, 1, 2], 
              target_names=["High", "Medium", "Low"], 
              zero_division=0
          ))

    # Phase 6: Save Artifacts
    model_path = "xgb_triage_model.json"
    model.save_model(model_path)
    print(f"Model successfully saved to {model_path}")

    # Generate Confusion Matrix (forced to 3x3 grid)
    cm = confusion_matrix(y_test, predictions, labels=[0, 1, 2])
    plt.figure(figsize=(7, 5))
    sns.heatmap(cm, annot=True, fmt='d', cmap='Blues',
                xticklabels=["High", "Medium", "Low"],
                yticklabels=["High", "Medium", "Low"])
    plt.ylabel('Actual Priority (Physician Ground Truth)')
    plt.xlabel('Predicted Priority (XGBoost)')
    plt.title('XGBoost Evaluation on Authentic Holdout Patients')
    plt.tight_layout()
    plt.savefig('confusion_matrix.png')

    # Generate Feature Importance
    plt.figure(figsize=(7, 5))
    xgb.plot_importance(model, importance_type='gain', title='Clinical Feature Importance (Gain)')
    plt.tight_layout()
    plt.savefig('feature_importance.png')
    print("Saved 'confusion_matrix.png' and 'feature_importance.png'.")

if __name__ == "__main__":
    prepare_and_train()