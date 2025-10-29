"""
Ingest Router - Streamlined candidate upload endpoint
"""
import os
import io
import json
from typing import Optional
from datetime import datetime
from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException
from sqlalchemy.orm import Session

from database import get_db, Candidate, CandidateArtifact
from app.services.ai_service import (
    analyze_artifact,
    generate_candidate_profile,
    get_openai_client
)

router = APIRouter(prefix="/ingest", tags=["ingest"])

UPLOAD_DIR = "uploads/artifacts"
os.makedirs(UPLOAD_DIR, exist_ok=True)


def extract_text_from_file(file_content: bytes, filename: str) -> str:
    """
    Extract text from uploaded file (PDF or text files).
    
    Args:
        file_content: Raw bytes of the file
        filename: Original filename for type detection
    
    Returns:
        Extracted text content
    
    Raises:
        HTTPException: If file type is unsupported or extraction fails
    """
    resume_text = ""
    
    if filename.lower().endswith('.pdf'):
        # Parse PDF with pdfplumber
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
            raise HTTPException(
                status_code=400,
                detail=f"Failed to parse PDF: {str(e)}"
            )
    
    elif filename.lower().endswith(('.txt', '.doc', '.docx')):
        # Try to decode as text
        try:
            resume_text = file_content.decode("utf-8")
        except UnicodeDecodeError:
            try:
                # Fallback to latin-1
                resume_text = file_content.decode("latin-1")
            except Exception as e:
                raise HTTPException(
                    status_code=400,
                    detail=f"Failed to decode text file: {str(e)}"
                )
    else:
        raise HTTPException(
            status_code=400,
            detail="Unsupported file format. Please upload .pdf, .txt, .doc, or .docx"
        )
    
    if not resume_text.strip():
        raise HTTPException(
            status_code=400,
            detail="No text could be extracted from the file"
        )
    
    return resume_text


def extract_name_and_email_from_resume(resume_text: str) -> dict:
    """
    Use GPT-4o-mini to extract candidate name and email from resume text.
    
    Args:
        resume_text: Raw resume text
    
    Returns:
        Dict with 'name' and 'email' keys (may be None if not found)
    """
    client = get_openai_client()
    if not client:
        raise HTTPException(
            status_code=500,
            detail="OpenAI API key not configured"
        )
    
    prompt = f"""Extract the candidate's name and email address from this resume.

Resume:
{resume_text[:3000]}

Return JSON with:
- name: Full name (string or null if not found)
- email: Email address (string or null if not found)

If you cannot find the information with high confidence, return null for that field."""
    
    try:
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": "You are a resume parser. Extract name and email accurately."},
                {"role": "user", "content": prompt}
            ],
            response_format={"type": "json_object"},
            temperature=0.1
        )
        
        result = json.loads(response.choices[0].message.content)
        return {
            "name": result.get("name"),
            "email": result.get("email")
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to extract name/email from resume: {str(e)}"
        )


@router.post("/upload")
async def upload_candidate_resume(
    file: UploadFile = File(...),
    name: Optional[str] = Form(None),
    email: Optional[str] = Form(None),
    db: Session = Depends(get_db)
):
    """
    Streamlined candidate upload endpoint.
    
    Accepts:
    - file: Resume file (PDF, TXT, DOC, DOCX) - REQUIRED
    - name: Candidate name - OPTIONAL (will extract from resume if not provided)
    - email: Candidate email - OPTIONAL (will extract from resume if not provided)
    
    Process:
    1. Extract text from file
    2. If name or email missing, use AI to extract from resume
    3. Create Candidate record
    4. Store resume as CandidateArtifact
    5. Analyze artifact with AI (skills, culture signals)
    6. Generate candidate profile with embedding
    7. Return enriched candidate data
    
    Returns:
        {
            "id": int,
            "name": str,
            "email": str,
            "skills_detected": [...],
            "culture_signals": [...]
        }
    """
    # 1. Extract text from file
    file_content = await file.read()
    filename = file.filename or "resume"
    resume_text = extract_text_from_file(file_content, filename)
    
    # 2. Extract name/email if missing
    if not name or not email:
        extracted = extract_name_and_email_from_resume(resume_text)
        
        # Use extracted values if not provided
        if not name:
            name = extracted.get("name")
        if not email:
            email = extracted.get("email")
        
        # Validate that we have both after extraction
        if not name or not email:
            raise HTTPException(
                status_code=400,
                detail=f"Could not extract {'name' if not name else 'email'} from resume. Please provide it explicitly."
            )
    
    # Check for duplicate email
    existing = db.query(Candidate).filter(Candidate.email == email).first()
    if existing:
        raise HTTPException(
            status_code=400,
            detail=f"Candidate with email {email} already exists (ID: {existing.id})"
        )
    
    # 3. Create Candidate record
    candidate = Candidate(
        name=name,
        email=email,
        phone=None,
        linkedin_url=None,
        status="new"
    )
    db.add(candidate)
    db.commit()
    db.refresh(candidate)
    
    # 4. Store resume as CandidateArtifact
    # Sanitize filename to prevent path traversal attacks
    safe_filename = os.path.basename(filename)
    file_path = os.path.join(UPLOAD_DIR, f"{candidate.id}_{safe_filename}")
    with open(file_path, "wb") as f:
        f.write(file_content)
    
    # 5. Analyze artifact with AI
    ai_analysis = analyze_artifact(resume_text, "resume_pdf")
    
    artifact = CandidateArtifact(
        candidate_id=candidate.id,
        artifact_type="resume",
        title=f"Resume - {safe_filename}",
        storage_location=file_path,
        raw_text=resume_text,
        raw_url=None,
        ai_summary=ai_analysis.get("summary"),
        ai_extracted_skills=json.dumps(ai_analysis.get("skills", [])),
        ai_quality_score=ai_analysis.get("quality_score"),
        uploaded_at=datetime.utcnow(),
        processed_at=datetime.utcnow()
    )
    db.add(artifact)
    db.commit()
    db.refresh(artifact)
    
    # 6. Generate candidate profile with embedding
    profile = generate_candidate_profile(candidate.id, db)
    
    # 7. Return enriched candidate data
    skills_detected = ai_analysis.get("skills", [])
    
    # Extract culture signals from AI analysis
    culture_signals = []
    if ai_analysis.get("communication_style"):
        culture_signals.append({
            "type": "communication_style",
            "value": ai_analysis.get("communication_style")
        })
    
    return {
        "id": candidate.id,
        "name": candidate.name,
        "email": candidate.email,
        "skills_detected": skills_detected,
        "culture_signals": culture_signals,
        "profile_generated": True,
        "artifact_id": artifact.id
    }
