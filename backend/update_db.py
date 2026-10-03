from database import engine
from sqlalchemy import text

def safely_update_schema():
    print("Connecting to database to add ML columns...")
    
    with engine.connect() as conn:
        # 1. Add xgboost_risk
        try:
            conn.execute(text("ALTER TABLE triage_encounters ADD COLUMN xgboost_risk VARCHAR(20);"))
            print("✅ Added 'xgboost_risk' column.")
        except Exception as e:
            print("⚠️ 'xgboost_risk' already exists or skipped.")

        # 2. Add xgboost_confidence
        try:
            conn.execute(text("ALTER TABLE triage_encounters ADD COLUMN xgboost_confidence VARCHAR(20);"))
            print("✅ Added 'xgboost_confidence' column.")
        except Exception as e:
            print("⚠️ 'xgboost_confidence' already exists or skipped.")

        # 3. Add safety_override
        try:
            # Using TINYINT(1) which is MySQL's standard equivalent for BOOLEAN
            conn.execute(text("ALTER TABLE triage_encounters ADD COLUMN safety_override TINYINT(1) DEFAULT 0;"))
            print("✅ Added 'safety_override' column.")
        except Exception as e:
            print("⚠️ 'safety_override' already exists or skipped.")
            
        conn.commit()
        
    print("\nDatabase update complete! All your previous staff and patient data is safe.")

if __name__ == "__main__":
    safely_update_schema()