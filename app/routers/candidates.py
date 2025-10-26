from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr
from typing import Optional, List, Any
from datetime import datetime, date
import os
import json

from database import get_db, Candidate, CandidateArtifact, CandidateProfile
from app.services.ai_service import analyze_artifact

router = APIRouter(prefix="/candidates", tags=["candidates"])

UPLOAD_DIR = "uploads/artifacts"
os.makedirs(UPLOAD_DIR, exist_ok=True)


class CandidateCreate(BaseModel):
    name: str
    email: EmailStr
    phone: Optional[str] = None
    linkedin_url: Optional[str] = None
    github_url: Optional[str] = None
    portfolio_url: Optional[str] = None
    location: Optional[str] = None
    salary_expectation_min: Optional[int] = None
    salary_expectation_max: Optional[int] = None
    hours_available: Optional[int] = 40
    availability_start_date: Optional[date] = None
    visa_status: Optional[str] = None
    status: Optional[str] = "new"


class CandidateUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    linkedin_url: Optional[str] = None
    github_url: Optional[str] = None
    portfolio_url: Optional[str] = None
    location: Optional[str] = None
    salary_expectation_min: Optional[int] = None
    salary_expectation_max: Optional[int] = None
    hours_available: Optional[int] = None
    availability_start_date: Optional[date] = None
    visa_status: Optional[str] = None
    status: Optional[str] = None


class CandidateResponse(BaseModel):
    id: int
    name: str
    email: str
    phone: Optional[str]
    linkedin_url: Optional[str]
    github_url: Optional[str]
    portfolio_url: Optional[str]
    location: Optional[str]
    salary_expectation_min: Optional[int]
    salary_expectation_max: Optional[int]
    hours_available: Optional[int]
    availability_start_date: Optional[date]
    visa_status: Optional[str]
    status: str
    created_at: Optional[datetime]
    updated_at: Optional[datetime]
    artifact_count: int = 0

    class Config:
        from_attributes = True


class ArtifactResponse(BaseModel):
    id: int
    candidate_id: int
    artifact_type: Optional[str]
    title: Optional[str]
    storage_location: Optional[str]
    raw_url: Optional[str]
    ai_summary: Optional[str]
    ai_extracted_skills: Optional[str]
    ai_quality_score: Optional[float]
    uploaded_at: Optional[datetime]
    processed_at: Optional[datetime]

    class Config:
        from_attributes = True


class CandidateDetailResponse(CandidateResponse):
    artifacts: List[ArtifactResponse] = []
    profile: Optional[dict] = None


@router.post("/", response_model=CandidateResponse)
def create_candidate(candidate: CandidateCreate, db: Session = Depends(get_db)):
    """
    Create a new candidate with basic information.
    """
    existing = db.query(Candidate).filter(Candidate.email == candidate.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Candidate with this email already exists")
    
    db_candidate = Candidate(**candidate.model_dump())
    db.add(db_candidate)
    db.commit()
    db.refresh(db_candidate)
    
    return db_candidate


@router.get("/", response_model=List[CandidateResponse])
def list_candidates(
    status: Optional[str] = None,
    location: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """
    List all candidates with optional filtering by status and location.
    """
    query = db.query(Candidate)
    
    if status:
        query = query.filter(Candidate.status == status)
    
    if location:
        query = query.filter(Candidate.location.ilike(f"%{location}%"))
    
    candidates = query.all()
    
    # Add artifact count for each candidate
    result = []
    for candidate in candidates:
        artifact_count = db.query(CandidateArtifact).filter(
            CandidateArtifact.candidate_id == candidate.id
        ).count()
        
        candidate_dict = candidate.__dict__.copy()
        candidate_dict['artifact_count'] = artifact_count
        result.append(candidate_dict)
    
    return result


@router.get("/{candidate_id}", response_model=CandidateDetailResponse)
def get_candidate(candidate_id: int, db: Session = Depends(get_db)):
    """
    Get detailed information about a single candidate including artifacts and profile.
    """
    candidate = db.query(Candidate).filter(Candidate.id == candidate_id).first()
    
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")
    
    artifacts = db.query(CandidateArtifact).filter(
        CandidateArtifact.candidate_id == candidate_id
    ).all()
    
    profile = db.query(CandidateProfile).filter(
        CandidateProfile.candidate_id == candidate_id
    ).first()
    
    profile_dict = None
    if profile:
        profile_dict = {
            "technical_skills": profile.technical_skills,
            "years_experience": profile.years_experience,
            "writing_quality_score": profile.writing_quality_score,
            "verbal_quality_score": profile.verbal_quality_score,
            "communication_style": profile.communication_style,
            "portfolio_quality_score": profile.portfolio_quality_score,
            "code_quality_score": profile.code_quality_score,
            "culture_signals": profile.culture_signals,
            "personality_traits": profile.personality_traits,
            "strengths": profile.strengths,
            "concerns": profile.concerns,
            "best_role_fit": profile.best_role_fit,
            "growth_potential_score": profile.growth_potential_score,
            "profile_completeness": profile.profile_completeness,
            "last_ai_analysis": profile.last_ai_analysis,
        }
    
    return {
        **candidate.__dict__,
        "artifacts": artifacts,
        "profile": profile_dict
    }


@router.put("/{candidate_id}", response_model=CandidateResponse)
def update_candidate(
    candidate_id: int,
    candidate_update: CandidateUpdate,
    db: Session = Depends(get_db)
):
    """
    Update candidate information.
    """
    db_candidate = db.query(Candidate).filter(Candidate.id == candidate_id).first()
    
    if not db_candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")
    
    update_data = candidate_update.model_dump(exclude_unset=True)
    
    for field, value in update_data.items():
        setattr(db_candidate, field, value)
    
    db_candidate.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(db_candidate)
    
    return db_candidate


@router.delete("/{candidate_id}")
def delete_candidate(candidate_id: int, db: Session = Depends(get_db)):
    """
    Soft delete a candidate by setting status to 'deleted'.
    """
    db_candidate = db.query(Candidate).filter(Candidate.id == candidate_id).first()
    
    if not db_candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")
    
    db_candidate.status = "deleted"
    db_candidate.updated_at = datetime.utcnow()
    db.commit()
    
    return {"message": "Candidate deleted successfully", "id": candidate_id}


@router.post("/{candidate_id}/artifacts", response_model=ArtifactResponse)
async def create_artifact(
    candidate_id: int,
    file: Optional[UploadFile] = File(None),
    url: Optional[str] = Form(None),
    text: Optional[str] = Form(None),
    artifact_type: Optional[str] = Form(None),
    title: Optional[str] = Form(None),
    db: Session = Depends(get_db)
):
    """
    Add a new artifact to a candidate.
    Accepts file upload, URL, or raw text.
    Automatically analyzes the artifact using AI.
    """
    db_candidate = db.query(Candidate).filter(Candidate.id == candidate_id).first()
    if not db_candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")
    
    raw_text = None
    storage_location = None
    raw_url = None
    determined_type = artifact_type
    
    if file:
        content = await file.read()
        try:
            raw_text = content.decode("utf-8")
        except UnicodeDecodeError:
            raw_text = content.decode("latin-1")
        
        file_path = os.path.join(UPLOAD_DIR, f"{candidate_id}_{file.filename}")
        with open(file_path, "wb") as f:
            f.write(content)
        storage_location = file_path
        
        if not determined_type:
            if file.filename and file.filename.lower().endswith(".pdf"):
                determined_type = "resume_pdf"
            elif file.filename and file.filename.lower().endswith((".py", ".js", ".java", ".cpp")):
                determined_type = "code_sample"
            else:
                determined_type = "file_upload"
    
    elif url:
        raw_url = url
        raw_text = f"URL: {url}"
        
        if not determined_type:
            if "github.com" in url.lower():
                determined_type = "github_url"
            elif "loom.com" in url.lower():
                determined_type = "loom_video"
            elif "portfolio" in url.lower():
                determined_type = "portfolio_url"
            else:
                determined_type = "external_url"
    
    elif text:
        raw_text = text
        if not determined_type:
            determined_type = "text_response"
    
    else:
        raise HTTPException(
            status_code=400,
            detail="Must provide either file, url, or text"
        )
    
    ai_analysis = analyze_artifact(raw_text, determined_type)
    
    artifact = CandidateArtifact(
        candidate_id=candidate_id,
        artifact_type=determined_type,
        title=title,
        storage_location=storage_location,
        raw_text=raw_text,
        raw_url=raw_url,
        ai_summary=ai_analysis.get("summary"),
        ai_extracted_skills=json.dumps(ai_analysis.get("skills", [])),
        ai_quality_score=ai_analysis.get("quality_score"),
        uploaded_at=datetime.utcnow(),
        processed_at=datetime.utcnow()
    )
    
    db.add(artifact)
    db.commit()
    db.refresh(artifact)
    
    return artifact


@router.get("/{candidate_id}/artifacts", response_model=List[ArtifactResponse])
def list_artifacts(candidate_id: int, db: Session = Depends(get_db)):
    """
    List all artifacts for a specific candidate.
    """
    db_candidate = db.query(Candidate).filter(Candidate.id == candidate_id).first()
    if not db_candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")
    
    artifacts = db.query(CandidateArtifact).filter(
        CandidateArtifact.candidate_id == candidate_id
    ).all()
    
    return artifacts
