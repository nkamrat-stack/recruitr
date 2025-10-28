from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel, field_validator, Field
from typing import Optional, List
from datetime import datetime
import logging
import json

from database import get_db, CompanyProfile, CompanyCultureProfile

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


class CompanyCultureProfileCreate(BaseModel):
    # Work Style Dimensions (1-10 sliders)
    pace_score: int = Field(..., ge=1, le=10, description="Work pace score (1-10)")
    autonomy_score: int = Field(..., ge=1, le=10, description="Autonomy score (1-10)")
    communication_score: int = Field(..., ge=1, le=10, description="Communication style score (1-10)")
    decision_making_score: int = Field(..., ge=1, le=10, description="Decision making score (1-10)")
    risk_tolerance_score: int = Field(..., ge=1, le=10, description="Risk tolerance score (1-10)")
    work_location_score: int = Field(..., ge=1, le=10, description="Work location score (1-10)")
    schedule_flexibility_score: int = Field(..., ge=1, le=10, description="Schedule flexibility score (1-10)")
    growth_path_score: int = Field(..., ge=1, le=10, description="Growth path score (1-10)")
    
    # Core Values (5-10 selected values)
    core_values: List[str] = Field(..., min_length=5, max_length=10, description="Core company values (5-10 selections)")
    
    # Soft Skills Importance (1-10)
    communication_importance: int = Field(..., ge=1, le=10, description="Communication importance (1-10)")
    problem_solving_importance: int = Field(..., ge=1, le=10, description="Problem solving importance (1-10)")
    adaptability_importance: int = Field(..., ge=1, le=10, description="Adaptability importance (1-10)")
    leadership_importance: int = Field(..., ge=1, le=10, description="Leadership importance (1-10)")
    technical_depth_importance: int = Field(..., ge=1, le=10, description="Technical depth importance (1-10)")
    collaboration_importance: int = Field(..., ge=1, le=10, description="Collaboration importance (1-10)")
    
    @field_validator('core_values')
    @classmethod
    def validate_core_values(cls, v):
        if len(v) < 5:
            raise ValueError('Please select at least 5 core values')
        if len(v) > 10:
            raise ValueError('Please select no more than 10 core values')
        if len(v) != len(set(v)):
            raise ValueError('Core values must be unique')
        return v


class CompanyCultureProfileResponse(BaseModel):
    id: int
    company_id: int
    
    # Work Style Dimensions
    pace_score: int
    autonomy_score: int
    communication_score: int
    decision_making_score: int
    risk_tolerance_score: int
    work_location_score: int
    schedule_flexibility_score: int
    growth_path_score: int
    
    # Core Values
    core_values: List[str]
    
    # Soft Skills Importance
    communication_importance: int
    problem_solving_importance: int
    adaptability_importance: int
    leadership_importance: int
    technical_depth_importance: int
    collaboration_importance: int
    
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


@router.post("/culture", response_model=CompanyCultureProfileResponse)
def create_or_update_culture_profile(
    culture_data: CompanyCultureProfileCreate,
    db: Session = Depends(get_db)
):
    """
    Create or update company culture profile.
    Requires a company profile to exist first.
    """
    try:
        # Get company profile (should exist)
        company_profile = db.query(CompanyProfile).first()
        if not company_profile:
            raise HTTPException(
                status_code=404,
                detail="Company profile not found. Please create a company profile first."
            )
        
        # Check if culture profile already exists
        existing_culture = db.query(CompanyCultureProfile).filter(
            CompanyCultureProfile.company_id == company_profile.id
        ).first()
        
        # Serialize core_values to JSON
        core_values_json = json.dumps(culture_data.core_values)
        
        if existing_culture:
            # Update existing culture profile
            existing_culture.pace_score = culture_data.pace_score
            existing_culture.autonomy_score = culture_data.autonomy_score
            existing_culture.communication_score = culture_data.communication_score
            existing_culture.decision_making_score = culture_data.decision_making_score
            existing_culture.risk_tolerance_score = culture_data.risk_tolerance_score
            existing_culture.work_location_score = culture_data.work_location_score
            existing_culture.schedule_flexibility_score = culture_data.schedule_flexibility_score
            existing_culture.growth_path_score = culture_data.growth_path_score
            existing_culture.core_values = core_values_json
            existing_culture.communication_importance = culture_data.communication_importance
            existing_culture.problem_solving_importance = culture_data.problem_solving_importance
            existing_culture.adaptability_importance = culture_data.adaptability_importance
            existing_culture.leadership_importance = culture_data.leadership_importance
            existing_culture.technical_depth_importance = culture_data.technical_depth_importance
            existing_culture.collaboration_importance = culture_data.collaboration_importance
            existing_culture.updated_at = datetime.utcnow()
            
            db.commit()
            db.refresh(existing_culture)
            logger.info(f"Updated culture profile for company_id: {company_profile.id}")
            
            # Convert JSON back to list for response
            culture_dict = existing_culture.__dict__.copy()
            culture_dict['core_values'] = json.loads(existing_culture.core_values)
            return culture_dict
        else:
            # Create new culture profile
            new_culture = CompanyCultureProfile(
                company_id=company_profile.id,
                pace_score=culture_data.pace_score,
                autonomy_score=culture_data.autonomy_score,
                communication_score=culture_data.communication_score,
                decision_making_score=culture_data.decision_making_score,
                risk_tolerance_score=culture_data.risk_tolerance_score,
                work_location_score=culture_data.work_location_score,
                schedule_flexibility_score=culture_data.schedule_flexibility_score,
                growth_path_score=culture_data.growth_path_score,
                core_values=core_values_json,
                communication_importance=culture_data.communication_importance,
                problem_solving_importance=culture_data.problem_solving_importance,
                adaptability_importance=culture_data.adaptability_importance,
                leadership_importance=culture_data.leadership_importance,
                technical_depth_importance=culture_data.technical_depth_importance,
                collaboration_importance=culture_data.collaboration_importance
            )
            db.add(new_culture)
            db.commit()
            db.refresh(new_culture)
            logger.info(f"Created culture profile for company_id: {company_profile.id}")
            
            # Convert JSON back to list for response
            culture_dict = new_culture.__dict__.copy()
            culture_dict['core_values'] = json.loads(new_culture.core_values)
            return culture_dict
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating/updating culture profile: {str(e)}")
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Failed to save culture profile: {str(e)}"
        )


@router.get("/culture", response_model=CompanyCultureProfileResponse)
def get_culture_profile(db: Session = Depends(get_db)):
    """
    Get the company culture profile.
    Returns 404 if no culture profile exists.
    """
    try:
        # Get company profile first
        company_profile = db.query(CompanyProfile).first()
        if not company_profile:
            raise HTTPException(
                status_code=404,
                detail="Company profile not found. Please create one first."
            )
        
        # Get culture profile
        culture_profile = db.query(CompanyCultureProfile).filter(
            CompanyCultureProfile.company_id == company_profile.id
        ).first()
        
        if not culture_profile:
            raise HTTPException(
                status_code=404,
                detail="Culture profile not found. Please complete the culture survey first."
            )
        
        logger.info(f"Retrieved culture profile for company_id: {company_profile.id}")
        
        # Convert JSON back to list for response
        culture_dict = culture_profile.__dict__.copy()
        culture_dict['core_values'] = json.loads(culture_profile.core_values)
        return culture_dict
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error retrieving culture profile: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to retrieve culture profile: {str(e)}"
        )
