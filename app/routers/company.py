from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
import logging

from database import get_db, CompanyProfile

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/company", tags=["company"])


class CompanyProfileCreate(BaseModel):
    company_name: str
    about_company: Optional[str] = None
    mission: Optional[str] = None
    vision: Optional[str] = None
    values: Optional[str] = None
    culture_description: Optional[str] = None
    website_url: Optional[str] = None


class CompanyProfileResponse(BaseModel):
    id: int
    company_name: str
    about_company: Optional[str]
    mission: Optional[str]
    vision: Optional[str]
    values: Optional[str]
    culture_description: Optional[str]
    website_url: Optional[str]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


@router.post("/profile", response_model=CompanyProfileResponse)
def create_or_update_company_profile(
    profile_data: CompanyProfileCreate, 
    db: Session = Depends(get_db)
):
    """
    Create or update company profile.
    Only one company profile is allowed - updates existing if present.
    """
    try:
        existing_profile = db.query(CompanyProfile).first()
        
        if existing_profile:
            existing_profile.company_name = profile_data.company_name
            existing_profile.about_company = profile_data.about_company
            existing_profile.mission = profile_data.mission
            existing_profile.vision = profile_data.vision
            existing_profile.values = profile_data.values
            existing_profile.culture_description = profile_data.culture_description
            existing_profile.website_url = profile_data.website_url
            existing_profile.updated_at = datetime.utcnow()
            
            db.commit()
            db.refresh(existing_profile)
            logger.info(f"Updated company profile: {existing_profile.company_name}")
            return existing_profile
        else:
            new_profile = CompanyProfile(
                company_name=profile_data.company_name,
                about_company=profile_data.about_company,
                mission=profile_data.mission,
                vision=profile_data.vision,
                values=profile_data.values,
                culture_description=profile_data.culture_description,
                website_url=profile_data.website_url
            )
            db.add(new_profile)
            db.commit()
            db.refresh(new_profile)
            logger.info(f"Created company profile: {new_profile.company_name}")
            return new_profile
            
    except Exception as e:
        logger.error(f"Error creating/updating company profile: {str(e)}")
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Failed to save company profile: {str(e)}"
        )


@router.get("/profile", response_model=CompanyProfileResponse)
def get_company_profile(db: Session = Depends(get_db)):
    """
    Get the current company profile.
    Returns 404 if no profile exists.
    """
    profile = db.query(CompanyProfile).first()
    
    if not profile:
        raise HTTPException(
            status_code=404,
            detail="Company profile not found. Please create one first."
        )
    
    logger.info(f"Retrieved company profile: {profile.company_name}")
    return profile
