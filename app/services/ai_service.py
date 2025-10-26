import os
import json
import logging
from typing import Optional, Dict, List, Any
from openai import OpenAI

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

MODEL = "gpt-4o-mini"
TEMPERATURE = 0.3


def get_openai_client() -> Optional[OpenAI]:
    """
    Returns configured OpenAI client using OPENAI_API_KEY from environment.
    
    Returns:
        OpenAI client instance or None if API key is missing
    """
    api_key = os.environ.get("OPENAI_API_KEY")
    
    if not api_key:
        logger.error("OPENAI_API_KEY not found in environment variables")
        return None
    
    try:
        client = OpenAI(
            api_key=api_key,
            max_retries=2,
            timeout=30.0
        )
        logger.info("OpenAI client initialized successfully")
        return client
    except Exception as e:
        logger.error(f"Failed to initialize OpenAI client: {str(e)}")
        return None


def analyze_artifact(artifact_text: str, artifact_type: str) -> Dict[str, Any]:
    """
    Analyzes a single artifact (resume, email, video transcript, etc.) using GPT-4o-mini.
    
    Args:
        artifact_text: Raw text content of the artifact
        artifact_type: Type of artifact (e.g., 'resume_pdf', 'email_thread', 'loom_video')
    
    Returns:
        Dictionary containing:
            - skills: List of dicts with {name: str, confidence: float}
            - quality_score: Float between 0-1
            - summary: Brief text summary
            - concerns: List of red flags or concerns
            - communication_style: Description of communication style (if applicable)
    """
    client = get_openai_client()
    if not client:
        logger.error("Cannot analyze artifact: OpenAI client not available")
        return {
            "skills": [],
            "quality_score": 0.0,
            "summary": "Analysis unavailable - OpenAI API key not configured",
            "concerns": ["API key not configured"],
            "communication_style": "unknown"
        }
    
    prompt = f"""Analyze this {artifact_type} and extract structured information.

Artifact content:
{artifact_text[:4000]}

Extract:
1. Skills mentioned (with confidence 0-1 for each)
2. Overall quality assessment (0-1 score)
3. Brief summary of key points
4. Any concerns or red flags
5. Communication style (if discernible from the content)

Return a JSON object with this exact structure:
{{
  "skills": [{{"name": "skill_name", "confidence": 0.8}}],
  "quality_score": 0.75,
  "summary": "brief summary",
  "concerns": ["concern 1", "concern 2"],
  "communication_style": "professional/casual/technical/etc"
}}"""

    try:
        response = client.chat.completions.create(
            model=MODEL,
            temperature=TEMPERATURE,
            response_format={"type": "json_object"},
            messages=[
                {
                    "role": "system",
                    "content": "You are an expert recruiter analyzing candidate materials. Always return valid JSON."
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
        logger.info(f"Successfully analyzed {artifact_type} artifact")
        return result
        
    except Exception as e:
        logger.error(f"Error analyzing artifact: {str(e)}")
        return {
            "skills": [],
            "quality_score": 0.0,
            "summary": f"Analysis failed: {str(e)}",
            "concerns": [f"Error during analysis: {str(e)}"],
            "communication_style": "unknown"
        }


def generate_candidate_profile(artifacts_data: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Generates a holistic candidate profile from multiple artifact analyses.
    
    Args:
        artifacts_data: List of artifact analysis results and raw content
    
    Returns:
        Dictionary matching candidate_profiles table structure:
            - technical_skills: JSON string of skills
            - years_experience: Float
            - writing_quality_score: Float 0-1
            - verbal_quality_score: Float 0-1
            - communication_style: String
            - portfolio_quality_score: Float 0-1
            - code_quality_score: Float 0-1
            - culture_signals: JSON string
            - personality_traits: JSON string
            - strengths: Text
            - concerns: Text
            - best_role_fit: String
            - growth_potential_score: Float 0-1
            - profile_completeness: Float 0-1
    """
    client = get_openai_client()
    if not client:
        logger.error("Cannot generate profile: OpenAI client not available")
        return {
            "technical_skills": json.dumps([]),
            "years_experience": 0.0,
            "writing_quality_score": 0.0,
            "verbal_quality_score": 0.0,
            "communication_style": "unknown",
            "portfolio_quality_score": 0.0,
            "code_quality_score": 0.0,
            "culture_signals": json.dumps([]),
            "personality_traits": json.dumps([]),
            "strengths": "Analysis unavailable",
            "concerns": "OpenAI API key not configured",
            "best_role_fit": "unknown",
            "growth_potential_score": 0.0,
            "profile_completeness": 0.0
        }
    
    artifacts_summary = json.dumps(artifacts_data, indent=2)[:6000]
    
    prompt = f"""Analyze all artifacts for this candidate and create a comprehensive profile.

Artifacts data:
{artifacts_summary}

Create a holistic profile that synthesizes all information. Return a JSON object with this structure:
{{
  "technical_skills": ["skill1", "skill2"],
  "years_experience": 5.5,
  "writing_quality_score": 0.8,
  "verbal_quality_score": 0.7,
  "communication_style": "clear and concise",
  "portfolio_quality_score": 0.85,
  "code_quality_score": 0.75,
  "culture_signals": ["shipped products", "takes ownership", "documented work"],
  "personality_traits": ["detail-oriented", "collaborative", "proactive"],
  "strengths": "Strong technical background with...",
  "concerns": "Limited experience with...",
  "best_role_fit": "Senior Full-Stack Engineer",
  "growth_potential_score": 0.8,
  "profile_completeness": 0.9
}}

Ensure all scores are between 0 and 1. Base years_experience on evidence in the artifacts."""

    try:
        response = client.chat.completions.create(
            model=MODEL,
            temperature=TEMPERATURE,
            response_format={"type": "json_object"},
            messages=[
                {
                    "role": "system",
                    "content": "You are an expert recruiter creating detailed candidate profiles. Always return valid JSON."
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
        
        profile = {
            "technical_skills": json.dumps(result.get("technical_skills", [])),
            "years_experience": float(result.get("years_experience", 0.0)),
            "writing_quality_score": float(result.get("writing_quality_score", 0.0)),
            "verbal_quality_score": float(result.get("verbal_quality_score", 0.0)),
            "communication_style": str(result.get("communication_style", "unknown")),
            "portfolio_quality_score": float(result.get("portfolio_quality_score", 0.0)),
            "code_quality_score": float(result.get("code_quality_score", 0.0)),
            "culture_signals": json.dumps(result.get("culture_signals", [])),
            "personality_traits": json.dumps(result.get("personality_traits", [])),
            "strengths": str(result.get("strengths", "")),
            "concerns": str(result.get("concerns", "")),
            "best_role_fit": str(result.get("best_role_fit", "unknown")),
            "growth_potential_score": float(result.get("growth_potential_score", 0.0)),
            "profile_completeness": float(result.get("profile_completeness", 0.0))
        }
        
        logger.info("Successfully generated candidate profile")
        return profile
        
    except Exception as e:
        logger.error(f"Error generating candidate profile: {str(e)}")
        return {
            "technical_skills": json.dumps([]),
            "years_experience": 0.0,
            "writing_quality_score": 0.0,
            "verbal_quality_score": 0.0,
            "communication_style": "unknown",
            "portfolio_quality_score": 0.0,
            "code_quality_score": 0.0,
            "culture_signals": json.dumps([]),
            "personality_traits": json.dumps([]),
            "strengths": "",
            "concerns": f"Profile generation failed: {str(e)}",
            "best_role_fit": "unknown",
            "growth_potential_score": 0.0,
            "profile_completeness": 0.0
        }


def score_candidate_for_job(candidate_profile: Dict[str, Any], job_requirements: Dict[str, Any]) -> Dict[str, Any]:
    """
    Scores a candidate against job requirements using AI analysis.
    
    Args:
        candidate_profile: Candidate profile data (from candidate_profiles table)
        job_requirements: Job requirements (from jobs table)
    
    Returns:
        Dictionary containing:
            - overall_score: Float 0-100
            - skills_score: Float 0-100
            - culture_score: Float 0-100
            - communication_score: Float 0-100
            - quality_score: Float 0-100
            - potential_score: Float 0-100
            - evidence: JSON string with supporting quotes
            - ai_reasoning: Detailed explanation of the scores
    """
    client = get_openai_client()
    if not client:
        logger.error("Cannot score candidate: OpenAI client not available")
        return {
            "overall_score": 0.0,
            "skills_score": 0.0,
            "culture_score": 0.0,
            "communication_score": 0.0,
            "quality_score": 0.0,
            "potential_score": 0.0,
            "evidence": json.dumps({}),
            "ai_reasoning": "Scoring unavailable - OpenAI API key not configured"
        }
    
    profile_summary = json.dumps(candidate_profile, indent=2)[:3000]
    job_summary = json.dumps(job_requirements, indent=2)[:2000]
    
    prompt = f"""Score this candidate against the job requirements.

Candidate Profile:
{profile_summary}

Job Requirements:
{job_summary}

Provide detailed scoring (0-100 for each dimension) and reasoning. Return JSON with this structure:
{{
  "overall_score": 85.0,
  "skills_score": 90.0,
  "culture_score": 80.0,
  "communication_score": 85.0,
  "quality_score": 88.0,
  "potential_score": 82.0,
  "evidence": {{
    "skills_match": ["quote showing skill X", "evidence of skill Y"],
    "culture_fit": ["shows ownership", "documented work"],
    "quality_indicators": ["strong portfolio", "clean code samples"]
  }},
  "ai_reasoning": "This candidate is a strong match because... Skills alignment is excellent with... Culture fit is demonstrated by... However, some gaps exist in..."
}}

All scores should be 0-100. Be realistic and evidence-based."""

    try:
        response = client.chat.completions.create(
            model=MODEL,
            temperature=TEMPERATURE,
            response_format={"type": "json_object"},
            messages=[
                {
                    "role": "system",
                    "content": "You are an expert recruiter scoring candidate-job fit. Always return valid JSON with realistic, evidence-based scores."
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
        
        scoring = {
            "overall_score": float(result.get("overall_score", 0.0)),
            "skills_score": float(result.get("skills_score", 0.0)),
            "culture_score": float(result.get("culture_score", 0.0)),
            "communication_score": float(result.get("communication_score", 0.0)),
            "quality_score": float(result.get("quality_score", 0.0)),
            "potential_score": float(result.get("potential_score", 0.0)),
            "evidence": json.dumps(result.get("evidence", {})),
            "ai_reasoning": str(result.get("ai_reasoning", ""))
        }
        
        logger.info(f"Successfully scored candidate with overall score: {scoring['overall_score']}")
        return scoring
        
    except Exception as e:
        logger.error(f"Error scoring candidate: {str(e)}")
        return {
            "overall_score": 0.0,
            "skills_score": 0.0,
            "culture_score": 0.0,
            "communication_score": 0.0,
            "quality_score": 0.0,
            "potential_score": 0.0,
            "evidence": json.dumps({}),
            "ai_reasoning": f"Scoring failed: {str(e)}"
        }
