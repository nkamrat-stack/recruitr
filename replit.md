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
  - **Schema**: `candidates`, `candidate_artifacts`, `candidate_profiles`, `jobs`, `matches`, `feedback`.
- **API Endpoints**:
  - **Candidates**: CRUD operations, artifact management, AI profile generation and retrieval.
  - **Jobs**: CRUD operations, listing jobs with match counts, AI-powered job creation tools, candidate matching.
    - `POST /jobs/parse-description`: Parse LinkedIn job descriptions and extract structured fields using AI.
    - `POST /jobs/generate-description`: Generate professional job descriptions from job fields using AI.
    - `GET /jobs/{job_id}/matches`: Retrieve existing candidate matches for a job.
    - `POST /jobs/{job_id}/match`: Match all candidates with AI profiles to a job, scoring and ranking them.
  - **AI Analysis**: Endpoints for testing AI capabilities.
- **Feature Extraction**: Regex-based skill detection (e.g., python, react, docker) and culture signal identification (e.g., shipped, launched).
- **Scoring Algorithm**: Weighted model combining Skills (45%), Culture (20%), Potential (20%), Domain (10%), and Logistics (5%) scores.
- **Candidate Matching**: AI-powered endpoint that scores all candidates against a job, calculates compatibility constraints (salary, hours, location, visa, availability), and stores ranked matches in the database.

**Frontend (Next.js 14)**
- **Pages**:
  - **Home (`/`)**: Entry point.
  - **Candidates List (`/candidates`)**: Displays all candidates with AI status, scores, and bulk actions.
  - **Candidate Detail (`/candidates/[id]`)**: Comprehensive view with materials management, compliance checklist, and AI analysis.
  - **Jobs List (`/jobs`)**: Manages job postings with AI-powered creation tools:
    - **Import from LinkedIn**: Paste job descriptions from LinkedIn or any source, AI extracts all fields automatically.
    - **Generate Description**: AI generates professional LinkedIn-style descriptions from job fields.
    - Standard CRUD operations: create, edit, delete job postings.
  - **Job Matches (`/jobs/[id]/matches`)**: Displays ranked candidates for a specific job:
    - Fetches existing matches (fast) or regenerates with AI (on-demand).
    - Shows rank, overall score with progress bar, 5 dimension scores (Skills, Culture, Communication, Quality, Potential).
    - Displays 5 compatibility badges (Salary, Hours, Location, Visa, Availability).
    - Expandable AI reasoning sections.
    - Filtering: compatible-only toggle, score threshold slider (0-100).
    - Links to candidate profiles for detailed review.
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