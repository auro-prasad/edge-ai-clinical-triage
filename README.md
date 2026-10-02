# 🏥 Edge-AI Clinical Triage System

> An offline, air-gapped AI healthcare dashboard designed to automate ER triage processing while ensuring 100% HIPAA and DPDP data privacy compliance.

![Tech Stack](https://img.shields.io/badge/Next.js-Black?logo=next.js)
![Tech Stack](https://img.shields.io/badge/FastAPI-009688?logo=fastapi&logoColor=white)
![Tech Stack](https://img.shields.io/badge/SQLite-003B57?logo=sqlite)
![Tech Stack](https://img.shields.io/badge/Ollama_Phi--3-FF8C00)

## 📋 Project Overview
Modern emergency rooms face severe bottlenecks in processing unstructured clinical notes. Existing cloud-based AI solutions violate medical privacy laws by sending patient data to external servers and are vulnerable to network outages (API rate limits). 

This project solves this by running a **Small Language Model (Microsoft Phi-3)** entirely locally on the hospital's intranet. It guarantees zero data leakage and 100% uptime, acting as a secure AI co-pilot for triage nurses and attending doctors.

## ✨ Key Features
* **100% Air-Gapped AI:** Powered by a local Phi-3 model via Ollama. No cloud dependencies.
* **Role-Based Access Control (RBAC):** Secure, isolated dashboards for Admins, Nurses, Doctors, and Patients.
* **Intelligent Triage:** AI reads unstructured nursing notes, assigns a priority (High/Medium/Low), and extracts reasoning in strict JSON format.
* **Human-in-the-Loop (HITL):** Attending physicians retain absolute control with a UI to track and override AI decisions.
* **Patient Empathy Engine:** Translates complex medical jargon into readable layman's terms for the patient portal.
* **Gibberish Detection:** Prompt-engineered to reject non-clinical text, preventing database corruption.

## 🏗️ Architecture & Database
The system follows a strict, normalized relational database structure:
* Authentication (`Users`) is strictly separated from medical PII (`Patient_Profiles`, `Staff_Profiles`).
* A 1-to-Many architecture links a single Medical Record Number (MRN) to multiple `Triage_Encounters`, preserving continuous medical histories.
* Doctor queues feature Map-based frontend deduplication to keep active dashboards clean.

## 🚀 Tech Stack
* **Frontend:** React, Next.js, Tailwind CSS
* **Backend:** Python, FastAPI, Uvicorn
* **Database:** SQLite, SQLAlchemy ORM
* **Edge AI Engine:** Microsoft Phi-3 Mini (3.8B parameters) running on Ollama

---

## 🛠️ Local Installation & Setup

### 1. Clone the Repository
```bash
git clone [https://github.com/auro-prasad/edge-ai-clinical-triage.git](https://github.com/auro-prasad/edge-ai-clinical-triage.git)
cd edge-ai-clinical-triage