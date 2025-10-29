from sqlalchemy import create_engine, Column, Integer, String, ForeignKey, Text, Float, Boolean, DateTime, Date, UniqueConstraint
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship
from datetime import datetime

SQLALCHEMY_DATABASE_URL = "sqlite:///./recruitr.db"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

class Candidate(Base):
    __tablename__ = "candidates"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True)
    phone = Column(String)
    linkedin_url = Column(String)
    github_url = Column(String)
    portfolio_url = Column(String)
    location = Column(String)
    salary_expectation_min = Column(Integer)
    salary_expectation_max = Column(Integer)
    hours_available = Column(Integer, default=40)
    availability_start_date = Column(Date)
    visa_status = Column(String)
    status = Column(String, default='new')
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    artifacts = relationship("Artifact", back_populates="candidate")
    candidate_artifacts = relationship("CandidateArtifact", back_populates="candidate")
    profile = relationship("CandidateProfile", back_populates="candidate", uselist=False)
    matches = relationship("Match", back_populates="candidate")
    feedbacks = relationship("Feedback", back_populates="candidate")
    applications = relationship("Application", back_populates="candidate")

class Artifact(Base):
    """Legacy artifact table - kept for backwards compatibility"""
    __tablename__ = "artifacts"
    
    id = Column(Integer, primary_key=True, index=True)
    candidate_id = Column(Integer, ForeignKey("candidates.id"), nullable=False)
    kind = Column(String, nullable=False)
    source = Column(String, nullable=False)
    text = Column(Text, nullable=False)
    
    candidate = relationship("Candidate", back_populates="artifacts")

class CandidateArtifact(Base):
    __tablename__ = "candidate_artifacts"
    
    id = Column(Integer, primary_key=True, index=True)
    candidate_id = Column(Integer, ForeignKey("candidates.id"), nullable=False)
    artifact_type = Column(String)
    title = Column(String)
    storage_location = Column(String)
    raw_text = Column(Text)
    raw_url = Column(String)
    artifact_metadata = Column(Text)
    ai_summary = Column(Text)
    ai_extracted_skills = Column(Text)
    ai_quality_score = Column(Float)
    uploaded_at = Column(DateTime, default=datetime.utcnow)
    processed_at = Column(DateTime)
    
    candidate = relationship("Candidate", back_populates="candidate_artifacts")

class CandidateProfile(Base):
    __tablename__ = "candidate_profiles"
    
    id = Column(Integer, primary_key=True, index=True)
    candidate_id = Column(Integer, ForeignKey("candidates.id"), unique=True, nullable=False)
    technical_skills = Column(Text)
    years_experience = Column(Float)
    writing_quality_score = Column(Float)
    verbal_quality_score = Column(Float)
    communication_style = Column(String)
    portfolio_quality_score = Column(Float)
    code_quality_score = Column(Float)
    culture_signals = Column(Text)
    personality_traits = Column(Text)
    strengths = Column(Text)
    concerns = Column(Text)
    best_role_fit = Column(String)
    growth_potential_score = Column(Float)
    profile_completeness = Column(Float)
    last_ai_analysis = Column(DateTime)
    profile_version = Column(Integer, default=1)
    profile_embedding = Column(Text)  # JSON-encoded embedding vector
    
    candidate = relationship("Candidate", back_populates="profile")

class Job(Base):
    __tablename__ = "jobs"
    
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    description = Column(Text)
    linkedin_original_text = Column(Text)
    display_description = Column(Text)
    required_skills = Column(Text)
    nice_to_have_skills = Column(Text)
    culture_requirements = Column(Text)
    salary_min = Column(Integer)
    salary_max = Column(Integer)
    hours_required = Column(Integer)
    location = Column(String)
    visa_sponsorship_available = Column(Boolean)
    start_date_needed = Column(Date)
    status = Column(String, default='open')
    company_profile_id = Column(Integer, ForeignKey("company_profile.id"))
    evaluation_levels = Column(Text)
    screening_questions = Column(Text)
    screening_questions_text = Column(Text)  # Raw screening questions text for AI extraction
    
    # New LinkedIn taxonomy fields (JSON stored as Text)
    responsibilities = Column(Text)
    required_qualifications = Column(Text)
    preferred_qualifications = Column(Text)
    competencies = Column(Text)
    success_milestones = Column(Text)
    work_requirements = Column(Text)
    application_deliverables = Column(Text)
    
    # Extraction status tracking
    extraction_status = Column(String, default='not_extracted')
    
    # Embedding vector for semantic matching
    job_embedding = Column(Text)  # JSON-encoded embedding vector
    
    created_at = Column(DateTime, default=datetime.utcnow)
    
    matches = relationship("Match", back_populates="job")
    feedbacks = relationship("Feedback", back_populates="job")
    applications = relationship("Application", back_populates="job")
    company_profile = relationship("CompanyProfile")

class Match(Base):
    __tablename__ = "matches"
    
    id = Column(Integer, primary_key=True, index=True)
    candidate_id = Column(Integer, ForeignKey("candidates.id"), nullable=False)
    job_id = Column(Integer, ForeignKey("jobs.id"), nullable=False)
    overall_score = Column(Float)
    skills_score = Column(Float)
    culture_score = Column(Float)
    communication_score = Column(Float)
    quality_score = Column(Float)
    potential_score = Column(Float)
    salary_compatible = Column(Boolean)
    hours_compatible = Column(Boolean)
    location_compatible = Column(Boolean)
    visa_compatible = Column(Boolean)
    availability_compatible = Column(Boolean)
    evidence = Column(Text)
    ai_reasoning = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    candidate = relationship("Candidate", back_populates="matches")
    job = relationship("Job", back_populates="matches")

class Application(Base):
    __tablename__ = "applications"
    __table_args__ = (
        UniqueConstraint('candidate_id', 'job_id', name='unique_candidate_job_application'),
    )
    
    id = Column(Integer, primary_key=True, index=True)
    candidate_id = Column(Integer, ForeignKey("candidates.id"), nullable=False)
    job_id = Column(Integer, ForeignKey("jobs.id"), nullable=False)
    applied_at = Column(DateTime, default=datetime.utcnow)
    application_status = Column(String, default='applied')
    notes = Column(Text)
    
    candidate = relationship("Candidate", back_populates="applications")
    job = relationship("Job", back_populates="applications")

class Feedback(Base):
    __tablename__ = "feedback"
    
    id = Column(Integer, primary_key=True, index=True)
    candidate_id = Column(Integer, ForeignKey("candidates.id"), nullable=False)
    job_id = Column(Integer, ForeignKey("jobs.id"))
    outcome = Column(String)
    rejection_reason = Column(Text)
    recruiter_notes = Column(Text)
    recruiter_rating = Column(Integer)
    created_at = Column(DateTime, default=datetime.utcnow)
    created_by = Column(String)
    
    candidate = relationship("Candidate", back_populates="feedbacks")
    job = relationship("Job", back_populates="feedbacks")

class CompanyProfile(Base):
    __tablename__ = "company_profile"
    
    id = Column(Integer, primary_key=True, index=True)
    company_name = Column(Text, nullable=False)
    about_company = Column(Text)
    mission = Column(Text)
    vision = Column(Text)
    values = Column(Text)
    culture_description = Column(Text)
    website_url = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class CompanyCultureProfile(Base):
    __tablename__ = "company_culture_profile"
    
    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("company_profile.id"), unique=True, nullable=False)
    
    # Work Style Dimensions (1-10 sliders)
    pace_score = Column(Integer)  # 1=Deliberate, 10=Fast-paced
    autonomy_score = Column(Integer)  # 1=Heavily Managed, 10=Self-Directed
    communication_score = Column(Integer)  # 1=Formal, 10=Casual
    decision_making_score = Column(Integer)  # 1=Consensus-Driven, 10=Top-Down
    risk_tolerance_score = Column(Integer)  # 1=Conservative, 10=Experimental
    work_location_score = Column(Integer)  # 1=In-Office, 10=Fully Remote
    schedule_flexibility_score = Column(Integer)  # 1=Fixed Hours, 10=Flexible
    growth_path_score = Column(Integer)  # 1=Specialist, 10=Generalist
    
    # Core Values (JSON array - Top 5-10 selected values)
    core_values = Column(Text)  # JSON array
    
    # Soft Skills Importance (1-10)
    communication_importance = Column(Integer)
    problem_solving_importance = Column(Integer)
    adaptability_importance = Column(Integer)
    leadership_importance = Column(Integer)
    technical_depth_importance = Column(Integer)
    collaboration_importance = Column(Integer)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    company = relationship("CompanyProfile")

def init_db():
    Base.metadata.create_all(bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
