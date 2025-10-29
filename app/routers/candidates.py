from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from sqlalchemy import func
from pydantic import BaseModel, EmailStr
from typing import Optional, List, Any
from datetime import datetime, date
import os
import json

from database import get_db, Candidate, CandidateArtifact, CandidateProfile, Application, Job
from app.services.ai_service import analyze_artifact, generate_candidate_profile, generate_profile_embedding

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
    latest_artifact_uploaded_at: Optional[datetime] = None

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


class ProfileResponse(BaseModel):
    id: int
    candidate_id: int
    technical_skills: Optional[str]
    years_experience: Optional[float]
    writing_quality_score: Optional[float]
    verbal_quality_score: Optional[float]
    communication_style: Optional[str]
    portfolio_quality_score: Optional[float]
    code_quality_score: Optional[float]
    culture_signals: Optional[str]
    personality_traits: Optional[str]
    strengths: Optional[str]
    concerns: Optional[str]
    best_role_fit: Optional[str]
    growth_potential_score: Optional[float]
    profile_completeness: Optional[float]
    last_ai_analysis: Optional[datetime]
    profile_version: Optional[int]

    class Config:
        from_attributes = True


class ApplicationResponse(BaseModel):
    id: int
    candidate_id: int
    job_id: int
    applied_at: datetime
    application_status: str
    notes: Optional[str]
    job_title: Optional[str] = None
    job_status: Optional[str] = None

    class Config:
        from_attributes = True


class ApplicationStatusUpdate(BaseModel):
    application_status: str


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
    
    # Use single aggregated query to get artifact stats for all candidates
    artifact_stats = db.query(
        CandidateArtifact.candidate_id,
        func.count(CandidateArtifact.id).label('artifact_count'),
        func.max(CandidateArtifact.uploaded_at).label('latest_uploaded_at')
    ).group_by(CandidateArtifact.candidate_id).all()
    
    # Create lookup dictionary for O(1) access
    stats_dict = {
        stat.candidate_id: {
            'artifact_count': stat.artifact_count,
            'latest_artifact_uploaded_at': stat.latest_uploaded_at
        }
        for stat in artifact_stats
    }
    
    # Merge stats with candidates
    result = []
    for candidate in candidates:
        candidate_dict = candidate.__dict__.copy()
        stats = stats_dict.get(candidate.id, {'artifact_count': 0, 'latest_artifact_uploaded_at': None})
        candidate_dict['artifact_count'] = stats['artifact_count']
        candidate_dict['latest_artifact_uploaded_at'] = stats['latest_artifact_uploaded_at']
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


@router.post("/{candidate_id}/generate-profile", response_model=ProfileResponse)
def generate_profile(candidate_id: int, db: Session = Depends(get_db)):
    """
    Generate an AI profile for a candidate based on all their artifacts.
    This creates or updates the candidate's profile in the candidate_profiles table.
    """
    # Fetch the candidate
    candidate = db.query(Candidate).filter(Candidate.id == candidate_id).first()
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")
    
    # Get all artifacts for this candidate
    artifacts = db.query(CandidateArtifact).filter(
        CandidateArtifact.candidate_id == candidate_id
    ).all()
    
    if not artifacts:
        raise HTTPException(
            status_code=400,
            detail="Cannot generate profile: No artifacts found for this candidate"
        )
    
    # Prepare artifact data for AI analysis
    artifacts_data = []
    for artifact in artifacts:
        artifact_info = {
            "artifact_type": artifact.artifact_type,
            "title": artifact.title,
            "ai_summary": artifact.ai_summary,
            "ai_extracted_skills": artifact.ai_extracted_skills,
            "ai_quality_score": artifact.ai_quality_score,
            "raw_text": artifact.raw_text[:2000] if artifact.raw_text else None,
            "raw_url": artifact.raw_url
        }
        artifacts_data.append(artifact_info)
    
    # Generate profile using AI service
    try:
        profile_data = generate_candidate_profile(artifacts_data)
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate profile: {str(e)}"
        )
    
    # Check if profile already exists
    existing_profile = db.query(CandidateProfile).filter(
        CandidateProfile.candidate_id == candidate_id
    ).first()
    
    if existing_profile:
        # Update existing profile
        for key, value in profile_data.items():
            setattr(existing_profile, key, value)
        existing_profile.last_ai_analysis = datetime.utcnow()
        existing_profile.profile_version += 1
        db.commit()
        db.refresh(existing_profile)
        return existing_profile
    else:
        # Create new profile
        new_profile = CandidateProfile(
            candidate_id=candidate_id,
            last_ai_analysis=datetime.utcnow(),
            **profile_data
        )
        db.add(new_profile)
        db.commit()
        db.refresh(new_profile)
        return new_profile


@router.get("/{candidate_id}/profile", response_model=ProfileResponse)
def get_profile(candidate_id: int, db: Session = Depends(get_db)):
    """
    Get the AI-generated profile for a candidate.
    Returns 404 if the profile has not been generated yet.
    """
    # Verify candidate exists
    candidate = db.query(Candidate).filter(Candidate.id == candidate_id).first()
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")
    
    # Get profile
    profile = db.query(CandidateProfile).filter(
        CandidateProfile.candidate_id == candidate_id
    ).first()
    
    if not profile:
        raise HTTPException(
            status_code=404,
            detail="Profile not generated yet. Use POST /candidates/{id}/generate-profile to create one."
        )
    
    return profile


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


@router.post("/{candidate_id}/apply/{job_id}", response_model=ApplicationResponse)
def apply_to_job(candidate_id: int, job_id: int, db: Session = Depends(get_db)):
    """
    Apply a candidate to a specific job.
    """
    candidate = db.query(Candidate).filter(Candidate.id == candidate_id).first()
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")
    
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    existing_application = db.query(Application).filter(
        Application.candidate_id == candidate_id,
        Application.job_id == job_id
    ).first()
    if existing_application:
        raise HTTPException(status_code=400, detail="Candidate already applied to this job")
    
    application = Application(
        candidate_id=candidate_id,
        job_id=job_id,
        application_status='applied'
    )
    
    db.add(application)
    db.commit()
    db.refresh(application)
    
    response_data = ApplicationResponse(
        id=application.id,
        candidate_id=application.candidate_id,
        job_id=application.job_id,
        applied_at=application.applied_at,
        application_status=application.application_status,
        notes=application.notes,
        job_title=job.title,
        job_status=job.status
    )
    
    return response_data


@router.get("/{candidate_id}/applications", response_model=List[ApplicationResponse])
def get_candidate_applications(candidate_id: int, db: Session = Depends(get_db)):
    """
    Get all jobs a candidate has applied to.
    Uses join to avoid N+1 queries.
    """
    candidate = db.query(Candidate).filter(Candidate.id == candidate_id).first()
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")
    
    # Use join to fetch applications with job data in one query
    applications_with_jobs = db.query(Application, Job).join(
        Job, Application.job_id == Job.id
    ).filter(
        Application.candidate_id == candidate_id
    ).all()
    
    response_list = []
    for app, job in applications_with_jobs:
        response_list.append(ApplicationResponse(
            id=app.id,
            candidate_id=app.candidate_id,
            job_id=app.job_id,
            applied_at=app.applied_at,
            application_status=app.application_status,
            notes=app.notes,
            job_title=job.title,
            job_status=job.status
        ))
    
    return response_list


@router.delete("/applications/{application_id}")
def delete_application(application_id: int, db: Session = Depends(get_db)):
    """
    Remove a job application.
    """
    application = db.query(Application).filter(Application.id == application_id).first()
    if not application:
        raise HTTPException(status_code=404, detail="Application not found")
    
    db.delete(application)
    db.commit()
    
    return {"message": "Application deleted successfully"}


@router.put("/applications/{application_id}/status", response_model=ApplicationResponse)
def update_application_status(
    application_id: int,
    status_update: ApplicationStatusUpdate,
    db: Session = Depends(get_db)
):
    """
    Update the status of a job application.
    Valid statuses: applied, reviewing, interviewing, rejected, hired
    """
    application = db.query(Application).filter(Application.id == application_id).first()
    if not application:
        raise HTTPException(status_code=404, detail="Application not found")
    
    valid_statuses = ['applied', 'reviewing', 'interviewing', 'rejected', 'hired']
    if status_update.application_status not in valid_statuses:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid status. Must be one of: {', '.join(valid_statuses)}"
        )
    
    application.application_status = status_update.application_status
    db.commit()
    db.refresh(application)
    
    job = db.query(Job).filter(Job.id == application.job_id).first()
    
    return ApplicationResponse(
        id=application.id,
        candidate_id=application.candidate_id,
        job_id=application.job_id,
        applied_at=application.applied_at,
        application_status=application.application_status,
        notes=application.notes,
        job_title=job.title if job else None,
        job_status=job.status if job else None
    )
