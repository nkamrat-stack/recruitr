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


def text_to_html(text: str) -> str:
    """
    Convert plain text to HTML using simple regex patterns.
    Guarantees ZERO summarization - just adds HTML tags to existing text.
    HTML-escapes special characters to preserve exact content.
    
    Args:
        text: Raw text from LinkedIn job posting
        
    Returns:
        HTML string with formatting tags added and special characters escaped
    """
    import re
    import html
    
    if not text:
        return ""
    
    # Split into lines for processing
    lines = text.split('\n')
    html_lines = []
    in_list = False
    
    for line in lines:
        stripped = line.strip()
        
        # Skip empty lines but preserve paragraph breaks
        if not stripped:
            if in_list:
                html_lines.append('</ul>')
                in_list = False
            html_lines.append('<br>')
            continue
        
        # HTML-escape the content to preserve special characters like <, >, &, ", '
        escaped = html.escape(stripped)
        
        # Detect bullet points (starts with • or - or *)
        if re.match(r'^[•\-\*]\s+', stripped):
            bullet_text = re.sub(r'^[•\-\*]\s+', '', escaped)
            if not in_list:
                html_lines.append('<ul class="list-disc pl-6 mb-4 space-y-2">')
                in_list = True
            html_lines.append(f'<li class="text-gray-700">{bullet_text}</li>')
            continue
        
        # Detect numbered lists (starts with 1. or 2. etc)
        if re.match(r'^\d+\.\s+', stripped):
            if in_list:
                html_lines.append('</ul>')
                in_list = False
            # For numbered items, just treat as regular text
            html_lines.append(f'<p class="mb-4 leading-relaxed text-gray-700">{escaped}</p>')
            continue
        
        # Close list if we were in one
        if in_list:
            html_lines.append('</ul>')
            in_list = False
        
        # Detect headers with two-tier hierarchy (H2 for major sections, H3 for subsections)
        is_h2 = False
        is_h3 = False
        word_count = len(stripped.split())
        
        # Major section keywords (for H2) - must be primary section indicators
        # These should be broad categories, not specific subsections
        h2_keywords_primary = ['overview', 'responsibilities', 'qualifications', 'requirements', 'benefits', 
                                'about', 'description', 'summary', 'compensation', 'perks',
                                'we offer', 'you will', 'what we', 'why', 'how to']
        
        # Additional keywords that only apply for short 2-3 word phrases
        h2_keywords_short = ['key', 'required', 'preferred', 'nice', 'must']
        
        # Strategy 1: ALL CAPS (traditional major section headers) → H2
        if stripped.isupper() and len(stripped) > 3:
            is_h2 = True
        
        # Strategy 2: Short Title Case lines (LinkedIn-style headers)
        elif word_count >= 1 and word_count <= 6:
            first_word = stripped.split()[0]
            if first_word[0].isupper():
                sentence_enders = ('.', '!', '?', ',', ';')
                sentence_starters = ('the', 'a', 'an', 'this', 'that', 'we', 'you', 'it', 'in', 'on', 'at', 'for', 'to', 'from')
                
                ends_like_sentence = any(stripped.endswith(p) for p in sentence_enders)
                starts_like_sentence = first_word.lower() in sentence_starters and word_count > 3
                
                # If it looks like a header
                if not ends_like_sentence and not starts_like_sentence:
                    lower_text = stripped.lower()
                    
                    # PRIORITY 1: Check for primary H2 keywords (broad sections)
                    has_primary_keyword = any(keyword in lower_text for keyword in h2_keywords_primary)
                    has_short_keyword = any(keyword in lower_text for keyword in h2_keywords_short)
                    
                    # H2 if: has primary keyword OR (has short keyword AND word count <= 3)
                    if has_primary_keyword:
                        is_h2 = True
                    elif has_short_keyword and word_count <= 3:
                        is_h2 = True
                    # PRIORITY 2: Ends with colon → subsection (H3)
                    elif stripped.endswith(':'):
                        is_h3 = True
                    # PRIORITY 3: Contains "/" or "&" → subsection (H3)
                    elif '/' in stripped or '&' in stripped:
                        is_h3 = True
                    # PRIORITY 4: Short capitalized lines (2-4 words) → subsection (H3)
                    elif word_count <= 4:
                        is_h3 = True
                    # Longer specific phrases (5+ words) → subsection (H3)
                    else:
                        is_h3 = True
        
        # Apply appropriate header tag
        if is_h2:
            html_lines.append(f'<h2>{escaped}</h2>')
        elif is_h3:
            html_lines.append(f'<h3>{escaped}</h3>')
        else:
            # Regular paragraph
            html_lines.append(f'<p>{escaped}</p>')
    
    # Close any open list
    if in_list:
        html_lines.append('</ul>')
    
    return '\n'.join(html_lines)


def parse_linkedin_job(linkedin_text: str) -> Dict[str, Any]:
    """
    Parses a LinkedIn job post and extracts DUAL formats:
    1. display_html - Simple text-to-HTML conversion (NO AI, ZERO summarization possible)
    2. structured_data - AI extracts DETAILED structured information for matching
    
    Uses simple regex for display formatting (guarantees exact content)
    Uses GPT-4o-2024-08-06 only for structured data extraction
    
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
        # ===== STEP 1: Generate display_html using simple text-to-HTML conversion (NO AI) =====
        display_html = text_to_html(linkedin_text)
        logger.info("Successfully converted text to HTML (no AI, zero summarization)")
        
        
        # ===== STEP 2: Extract structured_data using AI (complete LinkedIn taxonomy extraction) =====
        structured_prompt = f"""Extract COMPLETE structured data from this LinkedIn job post using LinkedIn's taxonomy. Extract FULL TEXT for everything.

LinkedIn Job Text:
{linkedin_text}

Extract ALL of the following categories:

1. RESPONSIBILITIES (what the person will do):
   - Array of {{category, tasks}}
   - Category: the area (e.g., "Product Strategy", "Team Leadership", "Customer Engagement")
   - Tasks: array of specific responsibilities
   Example: [
     {{"category": "Product Strategy", "tasks": ["Own the product roadmap and prioritize features", "Conduct market research and competitive analysis"]}},
     {{"category": "Team Leadership", "tasks": ["Manage a team of 3-5 engineers", "Run daily standups and sprint planning"]}}
   ]

2. REQUIRED_QUALIFICATIONS (must-have requirements):
   - Array with type, description, weight (1-10), years if applicable
   - Types: "education", "experience", "technical_skill", "certification", "domain_knowledge"
   Example: [
     {{"type": "experience", "description": "2-4 years in product management, preferably in SaaS", "weight": 10, "years_min": 2, "years_max": 4}},
     {{"type": "technical_skill", "description": "Coding or scripting experience (Python, JavaScript, or similar)", "weight": 8}},
     {{"type": "education", "description": "Bachelor's degree in Computer Science or related field", "weight": 7}}
   ]

3. PREFERRED_QUALIFICATIONS (nice-to-have):
   - Array with type, description, weight (1-10)
   Example: [
     {{"type": "experience", "description": "Previous startup experience in fast-paced environment", "weight": 6}},
     {{"type": "technical_skill", "description": "Familiarity with database query languages (SQL)", "weight": 5}}
   ]

4. COMPETENCIES (soft skills, traits, behaviors):
   - Array with name, description, importance (1-10)
   Example: [
     {{"name": "Communication", "description": "Excellent written and verbal communication skills", "importance": 9}},
     {{"name": "Problem Solving", "description": "Ability to break down complex problems and find creative solutions", "importance": 8}},
     {{"name": "Ownership", "description": "Takes full ownership of projects from start to finish", "importance": 10}}
   ]

5. SUCCESS_MILESTONES (what success looks like over time):
   - Array with timeframe, expectations
   Example: [
     {{"timeframe": "30 days", "expectations": ["Complete onboarding", "Ship first small feature", "Build relationships with key stakeholders"]}},
     {{"timeframe": "90 days", "expectations": ["Own the product roadmap", "Drive 3+ feature launches", "Establish metrics tracking"]}},
     {{"timeframe": "1 year", "expectations": ["Increase user engagement by 25%", "Build and mentor product team", "Lead strategic initiatives"]}}
   ]

6. WORK_REQUIREMENTS (logistical constraints):
   - Single object with all work details
   Example: {{
     "timezone": "US Eastern Time",
     "timezone_overlap_hours": 4,
     "visa_sponsorship": false,
     "remote_policy": "Fully remote",
     "hours_per_week": 40,
     "travel_required": "10% for conferences",
     "equipment_provided": ["Laptop", "Monitor", "Ergonomic setup"]
   }}

7. APPLICATION_DELIVERABLES (what candidates must submit):
   - Array with name, type, required (boolean), weight (1-10), instructions
   - Types: "resume", "cover_letter", "portfolio", "code_sample", "video", "questionnaire", "references"
   Example: [
     {{"name": "Resume", "type": "resume", "required": true, "weight": 10, "instructions": "Include GitHub link"}},
     {{"name": "Loom Video", "type": "video", "required": true, "weight": 9, "instructions": "5-min intro: background, interest in role, relevant experience"}},
     {{"name": "Portfolio", "type": "portfolio", "required": false, "weight": 7, "instructions": "Show 2-3 recent projects"}}
   ]

8. SCREENING_QUESTIONS (questions for filtering candidates):
   - Array with question, question_type, ideal_answer, is_required, weight (1-10), deal_breaker (boolean)
   - Types: "years_experience", "skill_level", "availability", "compensation", "work_style", "scenario", "technical"
   Example: [
     {{"question": "How many years of product management experience do you have?", "question_type": "years_experience", "ideal_answer": "2-4 years in SaaS or similar", "is_required": true, "weight": 10, "deal_breaker": true}},
     {{"question": "Are you comfortable with $120k-$150k salary range?", "question_type": "compensation", "ideal_answer": "Yes", "is_required": true, "weight": 10, "deal_breaker": true}},
     {{"question": "Describe your experience with API integrations", "question_type": "technical", "ideal_answer": "Built integrations with REST/GraphQL APIs", "is_required": false, "weight": 7, "deal_breaker": false}}
   ]

Return JSON with this EXACT structure:
{{
  "job_title": "Senior Product Manager",
  "description": "2-3 sentence AI summary",
  "location": "Remote (US Eastern Time)",
  "salary_min": 120000,
  "salary_max": 180000,
  "responsibilities": [...],
  "required_qualifications": [...],
  "preferred_qualifications": [...],
  "competencies": [...],
  "success_milestones": [...],
  "work_requirements": {{}},
  "application_deliverables": [...],
  "screening_questions": [...]
}}

CRITICAL:
- Extract FULL TEXT, never abbreviate
- If a category is not mentioned, use empty array [] or null
- Infer reasonable weights if not explicitly stated (more important = higher weight)
- Extract EVERYTHING - this is for precise AI candidate matching"""

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
            "location": structured_data.get("location"),
            "salary_min": structured_data.get("salary_min"),
            "salary_max": structured_data.get("salary_max"),
            
            # New LinkedIn taxonomy fields
            "responsibilities": structured_data.get("responsibilities", []),
            "required_qualifications": structured_data.get("required_qualifications", []),
            "preferred_qualifications": structured_data.get("preferred_qualifications", []),
            "competencies": structured_data.get("competencies", []),
            "success_milestones": structured_data.get("success_milestones", []),
            "work_requirements": structured_data.get("work_requirements", {}),
            "application_deliverables": structured_data.get("application_deliverables", []),
            "screening_questions": structured_data.get("screening_questions", [])
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


def generate_job_description_from_form(
    job_title: str,
    location: str,
    responsibilities: str,
    required_skills: str,
    nice_to_have_skills: str = "",
    salary_min: Optional[int] = None,
    salary_max: Optional[int] = None,
    hours_per_week: Optional[int] = None,
    additional_context: str = ""
) -> Dict[str, str]:
    """
    Generates a professional LinkedIn-style job description from structured form data.
    
    Args:
        job_title: The job title
        location: Job location
        responsibilities: Key responsibilities (can include bullets)
        required_skills: Required skills (comma-separated or formatted)
        nice_to_have_skills: Optional skills (comma-separated or formatted)
        salary_min: Minimum salary
        salary_max: Maximum salary
        hours_per_week: Expected hours per week
        additional_context: Additional company/role context
    
    Returns:
        Dictionary containing:
            - html_description: Full HTML-formatted job description (LinkedIn-style)
            - plain_text: Plain text version
    """
    client = get_openai_client(timeout=60.0)
    if not client:
        logger.error("Cannot generate job description: OpenAI client not available")
        return {
            "html_description": "<p>Job description generation unavailable - OpenAI API key not configured</p>",
            "plain_text": "Job description generation unavailable - OpenAI API key not configured"
        }
    
    salary_info = ""
    if salary_min and salary_max:
        salary_info = f"${salary_min:,} - ${salary_max:,}"
    elif salary_min:
        salary_info = f"${salary_min:,}+"
    
    hours_info = f"{hours_per_week} hours/week" if hours_per_week else "Full-time"
    
    # Build optional sections outside of f-string
    nice_to_have_section = f"**Nice-to-Have Skills:**\n{nice_to_have_skills}\n\n" if nice_to_have_skills else ""
    additional_context_section = f"**Additional Context:**\n{additional_context}\n\n" if additional_context else ""
    
    prompt = f"""You are an expert recruiter writing a professional LinkedIn job posting.

Create a compelling, detailed job description using this information:

**Job Title:** {job_title}
**Location:** {location}
**Compensation:** {salary_info if salary_info else "Competitive salary"}
**Hours:** {hours_info}

**Key Responsibilities:**
{responsibilities}

**Required Skills:**
{required_skills}

{nice_to_have_section}{additional_context_section}Generate a professional LinkedIn-style job description with these sections:
1. Position Overview (2-3 paragraphs describing the role and impact)
2. Key Responsibilities (expand the provided responsibilities into detailed descriptions with specific deliverables)
3. Required Qualifications (expand skills into detailed requirements with years of experience where appropriate)
4. Nice-to-Have Skills (if provided, expand into preferred qualifications)
5. What We Offer (if context provided, extract benefits/culture; otherwise create professional boilerplate)

Format requirements:
- Use H2 tags for major sections (Position Overview, Key Responsibilities, etc.)
- Use H3 tags for subsections if needed
- Use <ul> and <li> for bullet lists
- Use <strong> for emphasis on key terms
- Use <p> for paragraphs
- Write in a professional, engaging tone
- Be specific and detailed (expand brief points into full descriptions)
- Make it compelling for candidates

Return a JSON object with:
{{
  "html_description": "full HTML content",
  "plain_text": "plain text version"
}}"""

    try:
        response = client.chat.completions.create(
            model="gpt-4o-2024-08-06",  # Use stronger model for generation
            temperature=0.7,  # More creative for writing
            response_format={"type": "json_object"},
            messages=[
                {
                    "role": "system",
                    "content": "You are an expert recruiter and copywriter who creates professional, compelling LinkedIn job postings. Always return valid JSON."
                },
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            max_tokens=4096
        )
        
        content = response.choices[0].message.content
        if not content:
            raise ValueError("Empty response from OpenAI API")
        
        result = json.loads(content)
        
        logger.info(f"Successfully generated job description for: {job_title}")
        return {
            "html_description": result.get("html_description", ""),
            "plain_text": result.get("plain_text", "")
        }
        
    except Exception as e:
        logger.error(f"Error generating job description: {str(e)}")
        return {
            "html_description": f"<p>Error generating job description: {str(e)}</p>",
            "plain_text": f"Error generating job description: {str(e)}"
        }
