from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from pydantic import BaseModel
from typing import Optional, List, Any, Dict
from datetime import datetime, date
import json
import logging

from database import get_db, Job, Match, Candidate, CandidateProfile, CandidateArtifact, Application
from app.services.ai_service import get_openai_client, score_candidate_for_job, parse_linkedin_job, generate_job_description_from_form

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/jobs", tags=["jobs"])


# Helper function to deserialize JSON fields in job responses
def deserialize_job_json_fields(job_dict: Dict[str, Any]) -> Dict[str, Any]:
    """Deserialize all JSON fields in a job dictionary for API responses."""
    json_fields = [
        'evaluation_levels',
        'screening_questions',
        'responsibilities',
        'required_qualifications',
        'preferred_qualifications',
        'competencies',
        'success_milestones',
        'work_requirements',
        'application_deliverables'
    ]
    
    for field in json_fields:
        if job_dict.get(field):
            try:
                job_dict[field] = json.loads(job_dict[field])
            except (json.JSONDecodeError, TypeError):
                job_dict[field] = None if field == 'work_requirements' else []
    
    return job_dict


class JobCreate(BaseModel):
    title: str
    description: Optional[str] = None
    linkedin_original_text: Optional[str] = None
    display_description: Optional[str] = None
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
    company_profile_id: Optional[int] = None
    evaluation_levels: Optional[List[Any]] = None
    screening_questions: Optional[List[Any]] = None
    screening_questions_text: Optional[str] = None  # Raw screening questions text for AI extraction
    
    # New LinkedIn taxonomy fields
    responsibilities: Optional[List[Any]] = None
    required_qualifications: Optional[List[Any]] = None
    preferred_qualifications: Optional[List[Any]] = None
    competencies: Optional[List[Any]] = None
    success_milestones: Optional[List[Any]] = None
    work_requirements: Optional[Dict[str, Any]] = None
    application_deliverables: Optional[List[Any]] = None
    
    # Extraction status
    extraction_status: Optional[str] = "not_extracted"


class JobUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    linkedin_original_text: Optional[str] = None
    display_description: Optional[str] = None
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
    company_profile_id: Optional[int] = None
    evaluation_levels: Optional[List[Any]] = None
    screening_questions: Optional[List[Any]] = None
    screening_questions_text: Optional[str] = None
    
    # New LinkedIn taxonomy fields
    responsibilities: Optional[List[Any]] = None
    required_qualifications: Optional[List[Any]] = None
    preferred_qualifications: Optional[List[Any]] = None
    competencies: Optional[List[Any]] = None
    success_milestones: Optional[List[Any]] = None
    work_requirements: Optional[Dict[str, Any]] = None
    application_deliverables: Optional[List[Any]] = None
    
    # Extraction status
    extraction_status: Optional[str] = None


class GenerateJobFromFormRequest(BaseModel):
    job_title: str
    location: str
    responsibilities: str
    required_skills: str
    nice_to_have_skills: Optional[str] = ""
    salary_min: Optional[int] = None
    salary_max: Optional[int] = None
    hours_per_week: Optional[int] = None
    additional_context: Optional[str] = ""


class JobResponse(BaseModel):
    id: int
    title: str
    description: Optional[str]
    linkedin_original_text: Optional[str]
    display_description: Optional[str]
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
    company_profile_id: Optional[int]
    evaluation_levels: Optional[List[Any]]
    screening_questions: Optional[List[Any]]
    screening_questions_text: Optional[str]
    
    # New LinkedIn taxonomy fields
    responsibilities: Optional[List[Any]]
    required_qualifications: Optional[List[Any]]
    preferred_qualifications: Optional[List[Any]]
    competencies: Optional[List[Any]]
    success_milestones: Optional[List[Any]]
    work_requirements: Optional[Dict[str, Any]]
    application_deliverables: Optional[List[Any]]
    
    # Extraction status
    extraction_status: Optional[str]
    
    created_at: Optional[datetime]
    match_count: int = 0

    class Config:
        from_attributes = True


@router.post("/", response_model=JobResponse)
def create_job(job: JobCreate, db: Session = Depends(get_db)):
    """
    Create a new job posting with complete LinkedIn taxonomy support.
    """
    job_data = job.model_dump()
    
    # List of JSON fields that need serialization
    json_fields = [
        'evaluation_levels',
        'screening_questions',
        'responsibilities',
        'required_qualifications',
        'preferred_qualifications',
        'competencies',
        'success_milestones',
        'work_requirements',
        'application_deliverables'
    ]
    
    # Convert all JSON fields to strings for database storage
    for field in json_fields:
        if job_data.get(field) is not None:
            job_data[field] = json.dumps(job_data[field])
    
    db_job = Job(**job_data)
    db.add(db_job)
    db.commit()
    db.refresh(db_job)
    
    job_dict = db_job.__dict__.copy()
    job_dict['match_count'] = 0
    deserialize_job_json_fields(job_dict)
    
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
        deserialize_job_json_fields(job_dict)
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
    deserialize_job_json_fields(job_dict)
    
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
    
    # List of JSON fields that need serialization
    json_fields = [
        'evaluation_levels',
        'screening_questions',
        'responsibilities',
        'required_qualifications',
        'preferred_qualifications',
        'competencies',
        'success_milestones',
        'work_requirements',
        'application_deliverables'
    ]
    
    # Convert all JSON fields to strings for database storage
    for field in json_fields:
        if field in update_data and update_data[field] is not None:
            update_data[field] = json.dumps(update_data[field])
    
    for key, value in update_data.items():
        setattr(job, key, value)
    
    db.commit()
    db.refresh(job)
    
    match_count = db.query(Match).filter(Match.job_id == job_id).count()
    
    job_dict = job.__dict__.copy()
    job_dict['match_count'] = match_count
    deserialize_job_json_fields(job_dict)
    
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


@router.post("/{job_id}/extract-requirements")
def extract_job_requirements(job_id: int, db: Session = Depends(get_db)):
    """
    Extract requirements from a job's LinkedIn description using AI.
    This is Step 2 of the import workflow: Import (instant) → Extract (AI) → Match
    """
    job = db.query(Job).filter(Job.id == job_id).first()
    
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    # Check if there's text to extract from
    text_to_parse = job.display_description or job.linkedin_original_text or job.description
    if not text_to_parse:
        raise HTTPException(
            status_code=400, 
            detail="No job description available to extract requirements from"
        )
    
    # Set status to extracting
    job.extraction_status = "extracting"
    db.commit()
    
    try:
        # Call AI extraction service
        logger.info(f"Extracting requirements for job {job_id}: {job.title}")
        result = parse_linkedin_job(text_to_parse)
        
        # Update all taxonomy fields with extracted data
        json_fields_mapping = {
            'responsibilities': result.get('responsibilities', []),
            'required_qualifications': result.get('required_qualifications', []),
            'preferred_qualifications': result.get('preferred_qualifications', []),
            'competencies': result.get('competencies', []),
            'success_milestones': result.get('success_milestones', []),
            'work_requirements': result.get('work_requirements', {}),
            'application_deliverables': result.get('application_deliverables', []),
            'screening_questions': result.get('screening_questions', [])
        }
        
        # Serialize and save all JSON fields
        for field_name, field_value in json_fields_mapping.items():
            if field_value:
                setattr(job, field_name, json.dumps(field_value))
        
        # Also update basic fields if they were extracted
        if result.get('job_title') and not job.title:
            job.title = result['job_title']
        if result.get('description') and not job.description:
            job.description = result['description']
        if result.get('location') and not job.location:
            job.location = result['location']
        if result.get('salary_min'):
            job.salary_min = result['salary_min']
        if result.get('salary_max'):
            job.salary_max = result['salary_max']
        
        # Mark as successfully extracted
        job.extraction_status = "extracted"
        db.commit()
        db.refresh(job)
        
        logger.info(f"Successfully extracted requirements for job {job_id}")
        
        return {
            "message": "Requirements extracted successfully",
            "job_id": job_id,
            "extraction_status": "extracted",
            "extracted_fields": list(json_fields_mapping.keys())
        }
    
    except Exception as e:
        # Mark as failed and rollback
        job.extraction_status = "failed"
        db.commit()
        
        error_msg = str(e)
        logger.error(f"Failed to extract requirements for job {job_id}: {error_msg}")
        
        raise HTTPException(
            status_code=500,
            detail=f"Failed to extract requirements: {error_msg}"
        )


class WeightUpdateRequest(BaseModel):
    required_qualifications: Optional[List[Dict[str, Any]]] = None
    preferred_qualifications: Optional[List[Dict[str, Any]]] = None
    competencies: Optional[List[Dict[str, Any]]] = None


@router.put("/{job_id}/update-weights")
def update_job_weights(job_id: int, weight_update: WeightUpdateRequest, db: Session = Depends(get_db)):
    """
    Update weights and importance values for qualifications and competencies.
    Marks updated items as manually_set = true.
    """
    job = db.query(Job).filter(Job.id == job_id).first()
    
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    try:
        # Update required qualifications if provided
        if weight_update.required_qualifications is not None:
            # Validate weight ranges (1-10)
            for qual in weight_update.required_qualifications:
                if 'weight' in qual:
                    weight = qual['weight']
                    if not (1 <= weight <= 10):
                        raise HTTPException(status_code=400, detail=f"Weight must be between 1 and 10, got {weight}")
                qual['manually_set'] = True
            setattr(job, 'required_qualifications', json.dumps(weight_update.required_qualifications))
        
        # Update preferred qualifications if provided
        if weight_update.preferred_qualifications is not None:
            for qual in weight_update.preferred_qualifications:
                if 'weight' in qual:
                    weight = qual['weight']
                    if not (1 <= weight <= 10):
                        raise HTTPException(status_code=400, detail=f"Weight must be between 1 and 10, got {weight}")
                qual['manually_set'] = True
            setattr(job, 'preferred_qualifications', json.dumps(weight_update.preferred_qualifications))
        
        # Update competencies if provided
        if weight_update.competencies is not None:
            for comp in weight_update.competencies:
                if 'importance' in comp:
                    importance = comp['importance']
                    if not (1 <= importance <= 10):
                        raise HTTPException(status_code=400, detail=f"Importance must be between 1 and 10, got {importance}")
                comp['manually_set'] = True
            setattr(job, 'competencies', json.dumps(weight_update.competencies))
        
        db.commit()
        db.refresh(job)
        
        # Return updated job
        match_count = db.query(Match).filter(Match.job_id == job_id).count()
        job_dict = job.__dict__.copy()
        job_dict['match_count'] = match_count
        deserialize_job_json_fields(job_dict)
        
        return {
            "message": "Weights updated successfully",
            "job": job_dict
        }
    
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to update weights for job {job_id}: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to update weights: {str(e)}"
        )


class ParseLinkedInRequest(BaseModel):
    linkedin_text: str


class ParseLinkedInResponse(BaseModel):
    display_html: str
    job_title: str
    description: str
    salary_min: Optional[int] = None
    salary_max: Optional[int] = None
    location: Optional[str] = None
    
    # New LinkedIn taxonomy fields
    responsibilities: List[Dict[str, Any]] = []
    required_qualifications: List[Dict[str, Any]] = []
    preferred_qualifications: List[Dict[str, Any]] = []
    competencies: List[Dict[str, Any]] = []
    success_milestones: List[Dict[str, Any]] = []
    work_requirements: Dict[str, Any] = {}
    application_deliverables: List[Dict[str, Any]] = []
    screening_questions: List[Dict[str, Any]] = []


@router.post("/parse-linkedin", response_model=ParseLinkedInResponse)
def parse_linkedin_job_post(request: ParseLinkedInRequest):
    """
    Parse a LinkedIn job post and extract structured data including screening questions.
    Uses AI to extract job fields and screening questions with ideal answers.
    """
    try:
        result = parse_linkedin_job(request.linkedin_text)
        logger.info(f"Successfully parsed LinkedIn job: {result.get('job_title')}")
        return ParseLinkedInResponse(**result)
    
    except ValueError as e:
        # Client errors (bad input, missing API key, etc.)
        logger.error(f"Validation error parsing LinkedIn job: {str(e)}")
        raise HTTPException(
            status_code=400,
            detail=str(e)
        )
    
    except Exception as e:
        # Server errors (timeout, rate limit, API errors, etc.)
        error_msg = str(e)
        logger.error(f"Error parsing LinkedIn job: {error_msg}")
        raise HTTPException(
            status_code=500,
            detail=error_msg
        )


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


@router.post("/generate-from-form")
def generate_job_from_form(request: GenerateJobFromFormRequest):
    """
    Generate a full LinkedIn-style job description from structured form data using AI.
    This is a more comprehensive endpoint than generate-description.
    """
    try:
        result = generate_job_description_from_form(
            job_title=request.job_title,
            location=request.location,
            responsibilities=request.responsibilities,
            required_skills=request.required_skills,
            nice_to_have_skills=request.nice_to_have_skills,
            salary_min=request.salary_min,
            salary_max=request.salary_max,
            hours_per_week=request.hours_per_week,
            additional_context=request.additional_context
        )
        
        return {
            "html_description": result["html_description"],
            "plain_text": result["plain_text"]
        }
        
    except Exception as e:
        logger.error(f"Error in generate-from-form endpoint: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate job description: {str(e)}"
        )


class MatchResponse(BaseModel):
    id: int
    candidate_id: int
    candidate_name: str
    job_id: int
    overall_score: float
    skills_score: float
    culture_score: float
    communication_score: float
    quality_score: float
    potential_score: float
    salary_compatible: bool
    hours_compatible: bool
    location_compatible: bool
    visa_compatible: bool
    availability_compatible: bool
    evidence: Optional[str]
    ai_reasoning: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


@router.get("/{job_id}/matches", response_model=List[MatchResponse])
def get_job_matches(job_id: int, db: Session = Depends(get_db)):
    """
    Retrieve existing matches for a job.
    Returns ranked list sorted by overall_score (highest first).
    """
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    matches = db.query(Match).filter(Match.job_id == job_id).all()
    
    result = []
    for match in matches:
        candidate = db.query(Candidate).filter(Candidate.id == match.candidate_id).first()
        if candidate:
            match_dict = match.__dict__.copy()
            match_dict['candidate_name'] = candidate.name
            result.append(match_dict)
    
    result.sort(key=lambda x: x.get('overall_score', 0.0), reverse=True)
    
    logger.info(f"Retrieved {len(result)} existing matches for job {job_id}")
    return result


@router.post("/{job_id}/match", response_model=List[MatchResponse])
def match_candidates_to_job(job_id: int, db: Session = Depends(get_db)):
    """
    Match all candidates with AI profiles to a specific job.
    Scores each candidate and stores results in matches table.
    Returns ranked list sorted by overall_score (highest first).
    """
    # Get the job
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    # Get all candidates who have AI profiles
    candidates_with_profiles = db.query(Candidate).join(
        CandidateProfile, Candidate.id == CandidateProfile.candidate_id
    ).all()
    
    if not candidates_with_profiles:
        logger.info(f"No candidates with AI profiles found for job {job_id}")
        return []
    
    logger.info(f"Matching {len(candidates_with_profiles)} candidates to job {job_id}: {job.title}")
    
    matches = []
    
    for candidate in candidates_with_profiles:
        try:
            # Get candidate profile
            profile = db.query(CandidateProfile).filter(
                CandidateProfile.candidate_id == candidate.id
            ).first()
            
            if not profile:
                continue
            
            # Prepare profile data for AI scoring
            profile_data = {
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
            }
            
            # Prepare job requirements for AI scoring
            job_data = {
                "title": job.title,
                "description": job.description,
                "required_skills": job.required_skills,
                "nice_to_have_skills": job.nice_to_have_skills,
                "culture_requirements": job.culture_requirements,
                "location": job.location,
            }
            
            # Call AI service to score candidate
            ai_scores = score_candidate_for_job(profile_data, job_data)
            
            # Calculate compatibility constraints
            salary_compatible = True
            if job.salary_min is not None and candidate.salary_expectation_min is not None:
                job_max = job.salary_max if job.salary_max is not None else float('inf')
                salary_compatible = candidate.salary_expectation_min <= job_max
            
            hours_compatible = True
            if job.hours_required is not None and candidate.hours_available is not None:
                hours_compatible = candidate.hours_available >= job.hours_required
            
            location_compatible = True
            if job.location is not None and candidate.location is not None:
                job_loc = str(job.location).lower()
                cand_loc = str(candidate.location).lower()
                location_compatible = (
                    'remote' in job_loc or 
                    'remote' in cand_loc or
                    job_loc in cand_loc or 
                    cand_loc in job_loc
                )
            
            visa_compatible = True
            if job.visa_sponsorship_available is False and candidate.visa_status is not None:
                visa_compatible = str(candidate.visa_status).lower() in ['citizen', 'permanent resident', 'green card']
            
            availability_compatible = True
            if job.start_date_needed is not None and candidate.availability_start_date is not None:
                availability_compatible = candidate.availability_start_date <= job.start_date_needed
            
            # Check if match already exists
            existing_match = db.query(Match).filter(
                Match.candidate_id == candidate.id,
                Match.job_id == job_id
            ).first()
            
            if existing_match:
                # Update existing match using setattr for proper SQLAlchemy instance mutation
                setattr(existing_match, 'overall_score', ai_scores.get("overall_score", 0.0))
                setattr(existing_match, 'skills_score', ai_scores.get("skills_score", 0.0))
                setattr(existing_match, 'culture_score', ai_scores.get("culture_score", 0.0))
                setattr(existing_match, 'communication_score', ai_scores.get("communication_score", 0.0))
                setattr(existing_match, 'quality_score', ai_scores.get("quality_score", 0.0))
                setattr(existing_match, 'potential_score', ai_scores.get("potential_score", 0.0))
                setattr(existing_match, 'salary_compatible', salary_compatible)
                setattr(existing_match, 'hours_compatible', hours_compatible)
                setattr(existing_match, 'location_compatible', location_compatible)
                setattr(existing_match, 'visa_compatible', visa_compatible)
                setattr(existing_match, 'availability_compatible', availability_compatible)
                setattr(existing_match, 'evidence', ai_scores.get("evidence", "{}"))
                setattr(existing_match, 'ai_reasoning', ai_scores.get("ai_reasoning", ""))
                match = existing_match
            else:
                # Create new match
                match = Match(
                    candidate_id=candidate.id,
                    job_id=job_id,
                    overall_score=ai_scores.get("overall_score", 0.0),
                    skills_score=ai_scores.get("skills_score", 0.0),
                    culture_score=ai_scores.get("culture_score", 0.0),
                    communication_score=ai_scores.get("communication_score", 0.0),
                    quality_score=ai_scores.get("quality_score", 0.0),
                    potential_score=ai_scores.get("potential_score", 0.0),
                    salary_compatible=salary_compatible,
                    hours_compatible=hours_compatible,
                    location_compatible=location_compatible,
                    visa_compatible=visa_compatible,
                    availability_compatible=availability_compatible,
                    evidence=ai_scores.get("evidence", "{}"),
                    ai_reasoning=ai_scores.get("ai_reasoning", "")
                )
                db.add(match)
            
            db.commit()
            db.refresh(match)
            
            # Add candidate name to match for response
            match_dict = match.__dict__.copy()
            match_dict['candidate_name'] = candidate.name
            matches.append(match_dict)
            
            logger.info(f"Matched candidate {candidate.name} with score {ai_scores.get('overall_score', 0.0)}")
            
        except Exception as e:
            logger.error(f"Error matching candidate {candidate.id}: {str(e)}")
            db.rollback()
            continue
    
    # Sort by overall_score (highest first)
    matches.sort(key=lambda x: x.get('overall_score', 0.0), reverse=True)
    
    logger.info(f"Successfully matched {len(matches)} candidates to job {job_id}")
    
    return matches


@router.get("/{job_id}/applicant-count")
def get_applicant_count(job_id: int, db: Session = Depends(get_db)):
    """
    Get the count of candidates who have applied to a specific job.
    """
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    count = db.query(Application).filter(Application.job_id == job_id).count()
    
    return {"job_id": job_id, "applicant_count": count}


@router.get("/{job_id}/applicants")
def get_job_applicants(job_id: int, db: Session = Depends(get_db)):
    """
    Get all candidates who have applied to this job with their application details.
    Uses join to avoid N+1 queries.
    """
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    # Use join to fetch applications with candidate data in one query
    applications_with_candidates = db.query(Application, Candidate).join(
        Candidate, Application.candidate_id == Candidate.id
    ).filter(
        Application.job_id == job_id
    ).all()
    
    applicants = []
    for app, candidate in applications_with_candidates:
        applicant_data = {
            "application_id": app.id,
            "application_status": app.application_status,
            "applied_at": app.applied_at,
            "notes": app.notes,
            "candidate_id": candidate.id,
            "candidate_name": candidate.name,
            "candidate_email": candidate.email,
            "candidate_location": candidate.location,
            "candidate_status": candidate.status
        }
        applicants.append(applicant_data)
    
    return applicants
