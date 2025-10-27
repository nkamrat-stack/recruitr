from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, date
import json
import logging

from database import get_db, Job, Match
from app.services.ai_service import get_openai_client

logger = logging.getLogger(__name__)

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


class ParseDescriptionRequest(BaseModel):
    description_text: str


class ParseDescriptionResponse(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    required_skills: Optional[str] = None
    nice_to_have_skills: Optional[str] = None
    culture_requirements: Optional[str] = None
    salary_min: Optional[int] = None
    salary_max: Optional[int] = None
    hours_required: Optional[int] = None
    location: Optional[str] = None


@router.post("/parse-description", response_model=ParseDescriptionResponse)
def parse_job_description(request: ParseDescriptionRequest):
    """
    Parse a job description (e.g., from LinkedIn) and extract structured fields using AI.
    """
    client = get_openai_client()
    if not client:
        raise HTTPException(
            status_code=503,
            detail="AI service unavailable - OpenAI API key not configured"
        )
    
    prompt = f"""Parse this job description and extract structured fields.

Job Description:
{request.description_text[:8000]}

Extract the following fields (use null for any fields you cannot determine):
1. title: Job title
2. description: Clean, professional description (remove company branding/fluff)
3. required_skills: Comma-separated list of required skills
4. nice_to_have_skills: Comma-separated list of preferred/nice-to-have skills
5. culture_requirements: Company culture expectations or values mentioned
6. salary_min: Minimum salary (annual, in USD, as integer, or null)
7. salary_max: Maximum salary (annual, in USD, as integer, or null)
8. hours_required: Weekly hours (integer, default 40 if not specified)
9. location: Job location (remote/hybrid/city)

Return a JSON object with this exact structure:
{{
  "title": "Senior Software Engineer",
  "description": "We are seeking...",
  "required_skills": "Python, React, PostgreSQL, AWS",
  "nice_to_have_skills": "Docker, Kubernetes, GraphQL",
  "culture_requirements": "Self-starter, excellent communication, collaborative",
  "salary_min": 120000,
  "salary_max": 180000,
  "hours_required": 40,
  "location": "Remote"
}}"""

    try:
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            temperature=0.3,
            response_format={"type": "json_object"},
            messages=[
                {
                    "role": "system",
                    "content": "You are an expert recruiter parsing job descriptions. Always return valid JSON with extracted fields."
                },
                {
                    "role": "user",
                    "content": prompt
                }
            ]
        )
        
        content = response.choices[0].message.content
        if not content:
            raise ValueError("Empty response from OpenAI API")
        
        result = json.loads(content)
        logger.info("Successfully parsed job description")
        
        return ParseDescriptionResponse(**result)
        
    except Exception as e:
        logger.error(f"Error parsing job description: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to parse job description: {str(e)}"
        )


class GenerateDescriptionRequest(BaseModel):
    title: str
    required_skills: Optional[str] = None
    nice_to_have_skills: Optional[str] = None
    culture_requirements: Optional[str] = None
    salary_min: Optional[int] = None
    salary_max: Optional[int] = None
    hours_required: Optional[int] = None
    location: Optional[str] = None
    visa_sponsorship_available: Optional[bool] = False


class GenerateDescriptionResponse(BaseModel):
    description: str


@router.post("/generate-description", response_model=GenerateDescriptionResponse)
def generate_job_description(request: GenerateDescriptionRequest):
    """
    Generate a professional LinkedIn-style job description from job fields using AI.
    """
    client = get_openai_client()
    if not client:
        raise HTTPException(
            status_code=503,
            detail="AI service unavailable - OpenAI API key not configured"
        )
    
    # Build context from provided fields
    context_parts = [f"Job Title: {request.title}"]
    
    if request.required_skills:
        context_parts.append(f"Required Skills: {request.required_skills}")
    
    if request.nice_to_have_skills:
        context_parts.append(f"Nice-to-Have Skills: {request.nice_to_have_skills}")
    
    if request.culture_requirements:
        context_parts.append(f"Culture Requirements: {request.culture_requirements}")
    
    if request.salary_min and request.salary_max:
        context_parts.append(f"Salary Range: ${request.salary_min:,} - ${request.salary_max:,}")
    elif request.salary_min:
        context_parts.append(f"Salary: ${request.salary_min:,}+")
    
    if request.location:
        context_parts.append(f"Location: {request.location}")
    
    if request.hours_required:
        context_parts.append(f"Hours: {request.hours_required}/week")
    
    if request.visa_sponsorship_available:
        context_parts.append("Visa sponsorship available")
    
    context = "\n".join(context_parts)
    
    prompt = f"""Generate a professional, engaging job description suitable for LinkedIn.

Job Details:
{context}

Create a compelling job description that includes:
1. Brief company/role introduction
2. Key responsibilities
3. Required qualifications
4. Nice-to-have qualifications
5. Benefits and perks (if salary/benefits mentioned)
6. Call to action

Style: Professional, engaging, clear. Use bullet points for readability. Length: 200-400 words.

Return a JSON object with this structure:
{{
  "description": "The complete job description text here..."
}}"""

    try:
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            temperature=0.7,
            response_format={"type": "json_object"},
            messages=[
                {
                    "role": "system",
                    "content": "You are an expert recruiter writing compelling job descriptions. Always return valid JSON."
                },
                {
                    "role": "user",
                    "content": prompt
                }
            ]
        )
        
        content = response.choices[0].message.content
        if not content:
            raise ValueError("Empty response from OpenAI API")
        
        result = json.loads(content)
        logger.info("Successfully generated job description")
        
        return GenerateDescriptionResponse(description=result.get("description", ""))
        
    except Exception as e:
        logger.error(f"Error generating job description: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate job description: {str(e)}"
        )
