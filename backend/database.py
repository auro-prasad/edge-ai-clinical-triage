from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

# UPDATE 'root' and 'password' to match your MySQL Workbench credentials
SQLALCHEMY_DATABASE_URL = "mysql+pymysql://root:Auro%4031102004@localhost:3306/triage_db"

engine = create_engine(SQLALCHEMY_DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# Dependency to get the database session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()