from fastapi import FastAPI, UploadFile, File, Form, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List
import re
import numpy as np

from database import get_db, init_db, Candidate, Artifact
from app.routers import candidates_router
from app.routers.jobs import router as jobs_router
from app.routers.company import router as company_router

app = FastAPI(title="Recruitr API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(candidates_router)
app.include_router(jobs_router)
app.include_router(company_router)

@app.on_event("startup")
def startup_event():
    init_db()

@app.get("/")
def root():
    return {"message": "Recruitr API"}

@app.get("/health/openai")
def check_openai_key():
    import os
    key = os.environ.get('OPENAI_API_KEY')
    if key:
        return {
            "status": "ok",
            "key_configured": True,
            "key_preview": f"{key[:10]}...{key[-4:]}"
        }
    else:
        return {
            "status": "error", 
            "key_configured": False,
            "message": "OPENAI_API_KEY not found"
        }

@app.post("/test/analyze-text")
def test_analyze_artifact(text: str):
    from app.services.ai_service import analyze_artifact
    result = analyze_artifact(text, "resume_text")
    return result

SKILLS_KEYWORDS = ["python", "fastapi", "react", "postgres", "docker", "kubernetes"]
CULTURE_KEYWORDS = ["shipped", "launched", "owned", "documented"]

def extract_skills(text: str) -> List[str]:
    text_lower = text.lower()
    found_skills = []
    for skill in SKILLS_KEYWORDS:
        if re.search(r'\b' + skill + r'\b', text_lower):
            found_skills.append(skill)
    return found_skills

def extract_culture_signals(text: str) -> List[str]:
    text_lower = text.lower()
    found_signals = []
    for signal in CULTURE_KEYWORDS:
        if re.search(r'\b' + signal + r'\b', text_lower):
            found_signals.append(signal)
    return found_signals

def get_evidence_snippets(text: str, keywords: List[str], context_chars: int = 100) -> List[str]:
    snippets = []
    text_lower = text.lower()
    for keyword in keywords:
        pattern = r'\b' + keyword + r'\b'
        matches = list(re.finditer(pattern, text_lower))
        for match in matches[:2]:
            start = max(0, match.start() - context_chars)
            end = min(len(text), match.end() + context_chars)
            snippet = text[start:end].strip()
            snippets.append(f"...{snippet}...")
            break
    return snippets

def calculate_text_similarity(text1: str, text2: str) -> float:
    words1 = set(re.findall(r'\b\w+\b', text1.lower()))
    words2 = set(re.findall(r'\b\w+\b', text2.lower()))
    
    if not words1 or not words2:
        return 0.0
    
    intersection = words1.intersection(words2)
    union = words1.union(words2)
    
    return len(intersection) / len(union) if union else 0.0

@app.post("/ingest/upload")
async def upload_candidate(
    name: str = Form(...),
    email: str = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    existing = db.query(Candidate).filter(Candidate.email == email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Candidate with this email already exists")
    
    # Read file content
    file_content = await file.read()
    
    # Extract text based on file type
    filename = file.filename or ""
    resume_text = ""
    
    if filename.lower().endswith('.pdf'):
        # Parse PDF with pdfplumber
        import io
        import pdfplumber
        
        try:
            with pdfplumber.open(io.BytesIO(file_content)) as pdf:
                pages_text = []
                for page in pdf.pages:
                    text = page.extract_text()
                    if text:
                        pages_text.append(text)
                resume_text = "\n".join(pages_text)
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Failed to parse PDF: {str(e)}")
    
    elif filename.lower().endswith(('.txt', '.doc', '.docx')):
        # Try to decode as UTF-8 text
        try:
            resume_text = file_content.decode("utf-8")
        except UnicodeDecodeError:
            try:
                # Try latin-1 as fallback
                resume_text = file_content.decode("latin-1")
            except Exception as e:
                raise HTTPException(status_code=400, detail=f"Failed to decode text file: {str(e)}")
    else:
        raise HTTPException(status_code=400, detail="Unsupported file format. Please upload .pdf, .txt, .doc, or .docx")
    
    if not resume_text.strip():
        raise HTTPException(status_code=400, detail="No text could be extracted from the file")
    
    candidate = Candidate(name=name, email=email)
    db.add(candidate)
    db.commit()
    db.refresh(candidate)
    
    artifact = Artifact(
        candidate_id=candidate.id,
        kind="resume",
        source=file.filename or "upload",
        text=resume_text
    )
    db.add(artifact)
    db.commit()
    
    skills = extract_skills(resume_text)
    culture_signals = extract_culture_signals(resume_text)
    
    return {
        "id": candidate.id,
        "name": candidate.name,
        "email": candidate.email,
        "skills_detected": skills,
        "culture_signals": culture_signals,
        "message": "Candidate uploaded successfully"
    }

class JobDescription(BaseModel):
    description: str
    required_skills: List[str] = []

class CandidateScore(BaseModel):
    id: int
    name: str
    email: str
    overall_score: float
    skills_score: float
    culture_score: float
    potential_score: float
    domain_score: float
    logistics_score: float
    matched_skills: List[str]
    missing_skills: List[str]
    evidence: List[str]

@app.post("/match/rank", response_model=List[CandidateScore])
def rank_candidates(job_desc: JobDescription, db: Session = Depends(get_db)):
    candidates = db.query(Candidate).all()
    
    if not candidates:
        return []
    
    required_skills = job_desc.required_skills
    if not required_skills:
        required_skills = extract_skills(job_desc.description)
    
    results = []
    
    for candidate in candidates:
        artifacts = db.query(Artifact).filter(Artifact.candidate_id == candidate.id).all()
        
        if not artifacts:
            continue
        
        resume_text = " ".join([artifact.text for artifact in artifacts])
        
        candidate_skills = extract_skills(resume_text)
        culture_signals = extract_culture_signals(resume_text)
        
        matched_skills = list(set(candidate_skills).intersection(set(required_skills)))
        missing_skills = list(set(required_skills) - set(candidate_skills))
        
        skills_score = len(matched_skills) / len(required_skills) if required_skills else 0.0
        
        culture_score = min(len(culture_signals) / 4.0, 1.0)
        
        potential_score = calculate_text_similarity(resume_text, job_desc.description)
        
        domain_score = 0.5
        logistics_score = 0.5
        
        overall_score = (
            skills_score * 0.45 +
            culture_score * 0.20 +
            potential_score * 0.20 +
            domain_score * 0.10 +
            logistics_score * 0.05
        )
        
        all_keywords = matched_skills + culture_signals
        evidence = get_evidence_snippets(resume_text, all_keywords[:5])
        
        results.append(CandidateScore(
            id=int(candidate.id),
            name=str(candidate.name),
            email=str(candidate.email),
            overall_score=round(overall_score, 3),
            skills_score=round(skills_score, 3),
            culture_score=round(culture_score, 3),
            potential_score=round(potential_score, 3),
            domain_score=round(domain_score, 3),
            logistics_score=round(logistics_score, 3),
            matched_skills=matched_skills,
            missing_skills=missing_skills,
            evidence=evidence
        ))
    
    results.sort(key=lambda x: x.overall_score, reverse=True)
    
    return results

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
