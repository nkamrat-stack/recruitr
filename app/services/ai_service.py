import os
import json
import logging
from typing import Optional, Dict, List, Any
from openai import OpenAI

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

MODEL = "gpt-4o-mini"
TEMPERATURE = 0.3


def get_openai_client(timeout: float = 30.0) -> Optional[OpenAI]:
    """
    Returns configured OpenAI client using OPENAI_API_KEY from environment.
    
    Args:
        timeout: Request timeout in seconds (default: 30.0)
    
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
            timeout=timeout
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


def parse_linkedin_job(linkedin_text: str) -> Dict[str, Any]:
    """
    Parses a LinkedIn job post and extracts DUAL formats using TWO separate API calls:
    1. display_html - Preserves EXACT original content with HTML formatting (no summarization)
    2. structured_data - Extracts DETAILED structured information for AI matching
    
    Uses GPT-4o for better instruction following and content preservation.
    
    Args:
        linkedin_text: Raw text from LinkedIn job posting
    
    Returns:
        Dictionary containing:
            - display_html: HTML-formatted version preserving EVERY word from original
            - job_title: String
            - description: AI-generated summary for quick reference
            - required_skills: List of FULL requirement texts (not just skill names)
            - nice_to_have_skills: List of FULL nice-to-have texts
            - salary_min: Optional int
            - salary_max: Optional int
            - location: Optional string
            - experience_min_years: Optional int
            - experience_max_years: Optional int
            - work_requirements: Dict with timezone, visa, remote_ok, etc.
            - must_have_questions: List of {question: str, ideal_answer: str}
            - preferred_questions: List of {question: str, ideal_answer: str}
    
    Raises:
        ValueError: If OpenAI client is not available or API returns invalid response
        Exception: For OpenAI API errors (timeout, rate limit, etc.)
    """
    client = get_openai_client(timeout=90.0)
    if not client:
        raise ValueError("OpenAI API key not configured. Please add your OPENAI_API_KEY to environment variables.")
    
    try:
        # ===== CALL 1: Generate display_html (simple formatting task) =====
        display_prompt = f"""CRITICAL: DO NOT SUMMARIZE ANYTHING. Preserve EVERY word, bullet point, and section EXACTLY as written.

Convert this LinkedIn job post to clean HTML with proper formatting:

LinkedIn Job Text:
{linkedin_text}

INSTRUCTIONS:
- Keep ALL sections: Position Overview, Key Responsibilities, Required Qualifications, Preferred Qualifications, Benefits, etc.
- Keep ALL bullet points and sub-bullets exactly as they appear
- Keep ALL details - do not condense or shorten anything
- Use HTML tags: <h2> for section headers, <ul><li> for bullets, <strong> for emphasis, <p> for paragraphs
- The output should be as long as the input - if input is 5000 words, output is 5000 words in HTML
- DO NOT create a summary - convert the ENTIRE text to HTML preserving every single word

Return ONLY the HTML string (no JSON, no wrapping)."""

        display_response = client.chat.completions.create(
            model="gpt-4o-2024-08-06",  # Using GPT-4o with 16K output support for better instruction following
            temperature=0.1,  # Low temperature for exact preservation
            max_tokens=16384,  # GPT-4o-2024-08-06 maximum output tokens - allows very long job descriptions
            messages=[
                {
                    "role": "system",
                    "content": "You are an HTML formatter. Your ONLY job is to convert text to HTML while preserving EVERY single word. Never summarize, never condense, never skip content."
                },
                {
                    "role": "user",
                    "content": display_prompt
                }
            ]
        )
        
        display_html = display_response.choices[0].message.content
        if not display_html:
            raise ValueError("Failed to generate display HTML. Please try again.")
        
        logger.info("Successfully generated display_html")
        
        
        # ===== CALL 2: Extract structured_data (complex extraction task) =====
        structured_prompt = f"""Extract DETAILED structured data from this LinkedIn job post. DO NOT SUMMARIZE SKILLS.

LinkedIn Job Text:
{linkedin_text}

CRITICAL INSTRUCTIONS FOR SKILLS:
- required_skills: Extract FULL requirement text, not just skill names
  Example: ['2-4 years in product management, preferably in SaaS or communications platforms', 'Coding or scripting experience (Python, JavaScript, or similar)', 'Experience managing support queues and ticket systems (Zendesk, Intercom, etc.)']
  NOT: ['Product Management', 'Coding', 'Support Management']

- nice_to_have_skills: Extract FULL nice-to-have text
  Example: ['Experience with API integrations and webhooks', 'Familiarity with database query languages (SQL)', 'Previous startup experience in fast-paced environment']
  NOT: ['APIs', 'SQL', 'Startups']

EXTRACT EVERYTHING:
- Extract EVERY screening question with exact wording
- Extract EVERY competency listed
- Extract success milestones if present
- Extract work requirements (timezone, visa, remote policy, hours)
- Capture EVERYTHING - this is for precise candidate matching

Return a JSON object with this structure:
{{
  "job_title": "Senior Product Manager",
  "description": "Brief 2-3 sentence AI-generated summary for quick reference",
  "required_skills": ["Full detailed requirement text 1", "Full detailed requirement text 2"],
  "nice_to_have_skills": ["Full nice-to-have text 1", "Full nice-to-have text 2"],
  "salary_min": 120000,
  "salary_max": 180000,
  "location": "Remote (US Eastern Time)",
  "experience_min_years": 2,
  "experience_max_years": 4,
  "work_requirements": {{
    "timezone": "US Eastern Time",
    "visa_sponsorship": false,
    "remote_ok": true,
    "work_hours": "Full-time, flexible hours"
  }},
  "must_have_questions": [
    {{"question": "How many years of product management experience do you have?", "ideal_answer": "2-4 years in SaaS"}},
    {{"question": "Describe your experience with support ticketing systems", "ideal_answer": "Used Zendesk, Intercom, or similar tools"}}
  ],
  "preferred_questions": [
    {{"question": "Do you have API integration experience?", "ideal_answer": "Yes, built integrations with REST/GraphQL APIs"}},
    {{"question": "Have you worked at a startup before?", "ideal_answer": "Yes, thrived in fast-paced environment"}}
  ]
}}

Use null for any fields not mentioned in the job post."""

        structured_response = client.chat.completions.create(
            model="gpt-4o-2024-08-06",  # Using GPT-4o with 16K output support for better instruction following
            temperature=0.3,  # Slightly higher for extraction
            max_tokens=16384,  # GPT-4o-2024-08-06 maximum output tokens - allows detailed extraction from long posts
            response_format={"type": "json_object"},
            messages=[
                {
                    "role": "system",
                    "content": "You are an expert recruiter extracting DETAILED structured data from job posts. Extract FULL requirement texts, not just skill names. Never summarize - capture everything for precise candidate matching."
                },
                {
                    "role": "user",
                    "content": structured_prompt
                }
            ]
        )
        
        structured_content = structured_response.choices[0].message.content
        if not structured_content:
            raise ValueError("Failed to extract structured data. Please try again.")
        
        structured_data = json.loads(structured_content)
        logger.info("Successfully extracted structured_data")
        
        
        # ===== Combine results =====
        result = {
            "display_html": display_html,
            "job_title": structured_data.get("job_title", ""),
            "description": structured_data.get("description", ""),
            "required_skills": structured_data.get("required_skills", []),
            "nice_to_have_skills": structured_data.get("nice_to_have_skills", []),
            "salary_min": structured_data.get("salary_min"),
            "salary_max": structured_data.get("salary_max"),
            "location": structured_data.get("location"),
            "experience_min_years": structured_data.get("experience_min_years"),
            "experience_max_years": structured_data.get("experience_max_years"),
            "work_requirements": structured_data.get("work_requirements", {}),
            "must_have_questions": structured_data.get("must_have_questions", []),
            "preferred_questions": structured_data.get("preferred_questions", [])
        }
        
        # Validate required fields
        if not result.get("job_title"):
            raise ValueError("Failed to extract job title from LinkedIn post. Please ensure the text contains a complete job posting.")
        
        logger.info(f"Successfully parsed LinkedIn job: {result.get('job_title', 'Unknown')}")
        return result
        
    except json.JSONDecodeError as e:
        logger.error(f"Invalid JSON from OpenAI API: {str(e)}")
        raise ValueError(f"OpenAI API returned invalid JSON. Please try again or contact support if the issue persists.")
    
    except Exception as e:
        error_msg = str(e)
        logger.error(f"Error parsing LinkedIn job: {error_msg}")
        
        # Provide specific error messages based on error type
        if "timed out" in error_msg.lower() or "timeout" in error_msg.lower():
            raise Exception("Request timed out. The job post may be too long. Please try with a shorter job posting or try again.")
        elif "rate" in error_msg.lower() and "limit" in error_msg.lower():
            raise Exception("OpenAI API rate limit exceeded. Please wait a moment and try again.")
        elif "api key" in error_msg.lower():
            raise ValueError("Invalid OpenAI API key. Please check your OPENAI_API_KEY environment variable.")
        else:
            # Re-raise the original exception with its message
            raise Exception(f"Failed to parse LinkedIn job: {error_msg}")


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
