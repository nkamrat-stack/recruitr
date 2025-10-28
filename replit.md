# Recruitr - Full Stack AI Recruiting Application

### Overview
Recruitr is a full-stack AI-powered recruiting application designed to streamline the hiring process. It leverages AI to rank and match candidates against job descriptions using a multi-factor scoring algorithm. The application aims to automate resume analysis, generate comprehensive candidate profiles, and provide recruiters with insightful data to make informed hiring decisions.

### User Preferences
I prefer detailed explanations.
Do not make changes to the folder `Z`.
Do not make changes to the file `Y`.

### System Architecture

#### UI/UX Decisions
- **Color Schemes**: Utilizes professional, clean aesthetics with gradient cards and subtle shadows.
- **Templates**: Consistent layout across pages with a focus on clear information presentation.
- **Design Approaches**: Responsive design using TailwindCSS for optimal viewing on various devices. Uses status badges, score progress bars, and icon-based cues for intuitive interaction.

#### Technical Implementations
**Backend (FastAPI)**
- **Database**: SQLite, managed with SQLAlchemy ORM.
  - **Schema**: `candidates`, `candidate_artifacts`, `candidate_profiles`, `jobs`, `matches`, `feedback`, `company_profile`.
  - **Jobs Table**: Includes dual-format LinkedIn storage:
    - `linkedin_original_text` - Raw pasted LinkedIn job text
    - `display_description` - HTML-formatted description preserving original LinkedIn structure
    - `description` - AI-generated summary for quick reference
- **API Endpoints**:
  - **Candidates**: CRUD operations, artifact management, AI profile generation and retrieval.
  - **Jobs**: CRUD operations, listing jobs with match counts, AI-powered job creation tools, candidate matching, multi-level evaluation pipelines, LinkedIn import with screening questions.
    - `POST /jobs/parse-linkedin`: Parse complete LinkedIn job posts and extract structured data including screening questions using AI.
      - Extracts: job_title, description, required_skills (array), nice_to_have_skills (array), salary range, location
      - Extracts screening questions: must_have_questions and preferred_questions with {question, ideal_answer} structure
      - Returns structured JSON for auto-filling job creation form
    - `POST /jobs/parse-description`: Parse LinkedIn job descriptions and extract structured fields using AI (legacy endpoint).
    - `POST /jobs/generate-description`: Generate professional job descriptions from job fields using AI.
    - `GET /jobs/{job_id}/matches`: Retrieve existing candidate matches for a job.
    - `POST /jobs/{job_id}/match`: Match all candidates with AI profiles to a job, scoring and ranking them.
    - **Evaluation Pipeline**: Jobs include configurable multi-level evaluation workflows stored as JSON in `evaluation_levels` field.
      - Each level specifies: level_number, level_name, required_deliverables, optional_deliverables, advance_count.
      - Supports unlimited levels with customizable deliverable requirements at each stage.
      - Company profile linkage via `company_profile_id` foreign key.
    - **Screening Questions**: Jobs can store screening questions parsed from LinkedIn posts in `screening_questions` field (JSON).
      - Each question has: question, ideal_answer, is_required (boolean)
      - Questions from LinkedIn's "Must-have Qualifications" are marked as required
      - Questions from "Preferred Qualifications" are marked as optional
  - **Company Profile**: Manage company information and culture.
    - `GET /company/profile`: Retrieve company profile (404 if none exists).
    - `POST /company/profile`: Create or update company profile (upserts single profile).
  - **AI Analysis**: Endpoints for testing AI capabilities.
- **Feature Extraction**: Regex-based skill detection (e.g., python, react, docker) and culture signal identification (e.g., shipped, launched).
- **Scoring Algorithm**: Weighted model combining Skills (45%), Culture (20%), Potential (20%), Domain (10%), and Logistics (5%) scores.
- **Candidate Matching**: AI-powered endpoint that scores all candidates against a job, calculates compatibility constraints (salary, hours, location, visa, availability), and stores ranked matches in the database.

**Frontend (Next.js 14)**
- **Pages**:
  - **Home (`/`)**: Entry point.
  - **Candidates List (`/candidates`)**: Displays all candidates with AI status, scores, and bulk actions.
  - **Candidate Detail (`/candidates/[id]`)**: Comprehensive view with materials management, compliance checklist, and AI analysis.
  - **Jobs List (`/jobs`)**: Manages job postings with AI-powered creation tools.
  - **Job Detail (`/jobs/[id]`)**: Tabbed interface for comprehensive job viewing:
    - **Description Tab**: Displays LinkedIn job in original format with HTML rendering (sanitized with DOMPurify)
    - **Requirements Tab**: Shows structured data (required/nice-to-have skills, evaluation pipeline)
    - **Screening Questions Tab**: Lists all screening questions with required/preferred badges
    - Professional design with job header (title, location, salary, hours, status badges)
    - Actions: "View Candidate Matches" and "Edit Job" buttons
    - **Import from LinkedIn**: Advanced AI-powered LinkedIn job parser with dual-format extraction:
      - Paste complete LinkedIn job posts (including job description, must-have qualifications, preferred qualifications)
      - **Dual Format Extraction**:
        * **Display Format**: Preserves EXACT original LinkedIn formatting using HTML (sections, bullets, headings, bold text)
        * **Structured Format**: Extracts comprehensive data for AI matching (skills, experience requirements, work constraints)
      - AI extracts all fields: job title, description summary, skills (required/nice-to-have), salary, location, experience years
      - AI extracts screening questions with ideal answers from qualification sections
      - AI extracts work requirements: timezone, visa sponsorship, remote policy, work hours
      - Auto-fills job creation form with all parsed data
      - Stores raw LinkedIn text, formatted HTML, and structured data in database
      - Maps must-have questions to required deliverables in evaluation pipeline
      - Maps preferred questions to optional deliverables in evaluation pipeline
      - **Security**: HTML sanitized with DOMPurify before rendering (XSS protection)
    - **Generate Description**: AI generates professional LinkedIn-style descriptions from job fields.
    - **Evaluation Pipeline Builder**: Fully configurable multi-level hiring workflow:
      - Add/remove/reorder evaluation levels (unlimited stages)
      - Configure required and optional deliverables for each level (preset options + custom)
      - Preset deliverables: Resume, Loom Video, Cover Letter, Questionnaire, Portfolio, GitHub, Code Sample, Interview Transcript
      - Set advance count (number of candidates advancing to next level, or "All" for final stage)
      - Collapsible level cards with intuitive controls and validation
      - Visual level progression display
    - Standard CRUD operations: create, edit, delete job postings.
  - **Job Matches (`/jobs/[id]/matches`)**: Displays ranked candidates for a specific job:
    - Fetches existing matches (fast) or regenerates with AI (on-demand).
    - Shows rank, overall score with progress bar, 5 dimension scores (Skills, Culture, Communication, Quality, Potential).
    - Displays 5 compatibility badges (Salary, Hours, Location, Visa, Availability).
    - Expandable AI reasoning sections.
    - Filtering: compatible-only toggle, score threshold slider (0-100).
    - Links to candidate profiles for detailed review.
  - **Company Profile (`/settings/company`)**: Manage company information and culture:
    - **View/Edit Mode**: After saving, displays as read-only with "Edit Profile" button. Click to switch to edit mode.
    - **Read-Only Display**: Shows all company data as formatted text (not form inputs) for professional presentation.
    - Form fields: Company Name (required), About, Mission, Vision, Core Values, Culture Description, Website URL (flexible format).
    - Single profile design: creates on first save, updates on subsequent saves.
    - Enhanced success feedback: Prominent green banner with checkmark, 5-second auto-dismiss.
    - Professional TailwindCSS styling with validation and error handling.
- **Features**:
  - Real-time form validation, professional TailwindCSS styling, and responsive design.
  - Dynamic display of AI analysis status and scores.
  - Workflow-driven UI for material submission and AI profile generation.
  - AI-powered job creation tools: Import from LinkedIn, Generate Description with AI.

#### System Design Choices
- **Dual-server setup**: FastAPI backend (port 8000) and Next.js frontend (port 5000) run simultaneously, communicating via HTTPS to avoid mixed content errors.
- **AI Integration**: Deep integration of OpenAI's GPT-4o-mini for artifact analysis, profile generation, and job matching, utilizing JSON mode for structured outputs.
- **Scalability**: Optimized backend queries (e.g., aggregated match counts, `latest_artifact_uploaded_at`) to prevent N+1 issues and improve performance. Frontend bulk operations are designed for efficiency.
- **Modularity**: Separation of concerns with dedicated routers for candidates and jobs, and a distinct AI service module.

### External Dependencies

- **FastAPI**: Python web framework for building APIs.
- **Next.js 14**: React framework for frontend development.
- **TailwindCSS**: Utility-first CSS framework for styling.
- **SQLAlchemy**: Python SQL toolkit and Object-Relational Mapper.
- **SQLite**: Lightweight disk-based database.
- **Uvicorn**: ASGI server for FastAPI.
- **NumPy**: Library for numerical operations.
- **Python-multipart**: Library for handling file uploads.
- **OpenAI API**: For AI-powered text analysis, profile generation, and candidate scoring (GPT-4o-mini).