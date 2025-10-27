from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, date

from database import get_db, Job, Match

router = APIRouter(prefix="/jobs", tags=["jobs"])


class JobCreate(BaseModel):
    title: str
    description: Optional[str] = None
    required_skills: Optional[str] = None
    nice_to_have_skills: Optional[str] = None
    culture_requirements: Optional[str] = None
    salary_min: Optional[int] = None
    salary_max: Optional[int] = None
    hours_required: Optional[int] = 40
    location: Optional[str] = None
    visa_sponsorship_available: Optional[bool] = False
    start_date_needed: Optional[date] = None
    status: Optional[str] = "open"


class JobUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    required_skills: Optional[str] = None
    nice_to_have_skills: Optional[str] = None
    culture_requirements: Optional[str] = None
    salary_min: Optional[int] = None
    salary_max: Optional[int] = None
    hours_required: Optional[int] = None
    location: Optional[str] = None
    visa_sponsorship_available: Optional[bool] = None
    start_date_needed: Optional[date] = None
    status: Optional[str] = None


class JobResponse(BaseModel):
    id: int
    title: str
    description: Optional[str]
    required_skills: Optional[str]
    nice_to_have_skills: Optional[str]
    culture_requirements: Optional[str]
    salary_min: Optional[int]
    salary_max: Optional[int]
    hours_required: Optional[int]
    location: Optional[str]
    visa_sponsorship_available: Optional[bool]
    start_date_needed: Optional[date]
    status: str
    created_at: Optional[datetime]
    match_count: int = 0

    class Config:
        from_attributes = True


@router.post("/", response_model=JobResponse)
def create_job(job: JobCreate, db: Session = Depends(get_db)):
    """
    Create a new job posting.
    """
    db_job = Job(**job.model_dump())
    db.add(db_job)
    db.commit()
    db.refresh(db_job)
    
    job_dict = db_job.__dict__.copy()
    job_dict['match_count'] = 0
    
    return job_dict


@router.get("/", response_model=List[JobResponse])
def list_jobs(
    status: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """
    List all jobs with optional filtering by status.
    """
    query = db.query(Job)
    
    if status:
        query = query.filter(Job.status == status)
    
    jobs = query.order_by(Job.created_at.desc()).all()
    
    # Get match counts only for the filtered jobs
    job_ids = [job.id for job in jobs]
    
    match_counts = db.query(
        Match.job_id,
        func.count(Match.id).label('match_count')
    ).filter(Match.job_id.in_(job_ids)).group_by(Match.job_id).all()
    
    match_dict = {mc.job_id: mc.match_count for mc in match_counts}
    
    result = []
    for job in jobs:
        job_dict = job.__dict__.copy()
        job_dict['match_count'] = match_dict.get(job.id, 0)
        result.append(job_dict)
    
    return result


@router.get("/{job_id}", response_model=JobResponse)
def get_job(job_id: int, db: Session = Depends(get_db)):
    """
    Get a single job by ID.
    """
    job = db.query(Job).filter(Job.id == job_id).first()
    
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    match_count = db.query(Match).filter(Match.job_id == job_id).count()
    
    job_dict = job.__dict__.copy()
    job_dict['match_count'] = match_count
    
    return job_dict


@router.put("/{job_id}", response_model=JobResponse)
def update_job(job_id: int, job_update: JobUpdate, db: Session = Depends(get_db)):
    """
    Update an existing job.
    """
    job = db.query(Job).filter(Job.id == job_id).first()
    
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    update_data = job_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(job, key, value)
    
    db.commit()
    db.refresh(job)
    
    match_count = db.query(Match).filter(Match.job_id == job_id).count()
    
    job_dict = job.__dict__.copy()
    job_dict['match_count'] = match_count
    
    return job_dict


@router.delete("/{job_id}")
def delete_job(job_id: int, db: Session = Depends(get_db)):
    """
    Delete a job.
    """
    job = db.query(Job).filter(Job.id == job_id).first()
    
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    db.delete(job)
    db.commit()
    
    return {"message": "Job deleted successfully"}
