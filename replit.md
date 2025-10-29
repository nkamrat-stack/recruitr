# Recruitr - Full Stack AI Recruiting Application

### Overview
Recruitr is a full-stack AI-powered recruiting application designed to streamline the hiring process. It leverages AI to rank and match candidates against job descriptions using a multi-factor scoring algorithm. The application aims to automate resume analysis, generate comprehensive candidate profiles, and provide recruiters with insightful data to make informed hiring decisions.

### User Preferences
I prefer detailed explanations.
Do not make changes to the folder `Z`.
Do not make changes to the file `Y`.

### System Architecture

#### UI/UX Decisions
- **Color Schemes**: Professional, clean aesthetics with gradient cards and subtle shadows.
- **Templates**: Consistent layout across pages with clear information presentation.
- **Design Approaches**: Responsive design using TailwindCSS; uses status badges, score progress bars, and icon-based cues.

#### Technical Implementations
**Backend (FastAPI)**
- **Database**: SQLite with SQLAlchemy ORM.
  - **Schema**: Includes `candidates`, `candidate_artifacts`, `candidate_profiles` (with `profile_embedding` for semantic search), `jobs` (with `linkedin_original_text`, `display_description`, `description`, `job_embedding`), `matches`, `applications`, `feedback`, `company_profile`.
  - **Applications Table**: Manages candidate-job relationships and application statuses.
  - **Jobs Table**: Supports LinkedIn import, AI-generated descriptions, evaluation pipelines, and screening questions.
- **API Endpoints**:
  - **Candidates**: CRUD, artifact management, AI profile generation, job application management (apply, list applications, update status).
  - **Jobs**: CRUD, match generation, weight updates for qualifications/competencies, LinkedIn parsing (both display HTML and structured AI data), AI description generation, evaluation pipeline management, applicant tracking.
  - **Company Profile**: CRUD operations for managing company information.
  - **Ingest**: Streamlined candidate resume upload with AI-powered data extraction (name, email, skills, culture signals) and profile generation.
  - **AI Analysis**: Endpoints for AI capability testing.
- **Feature Extraction**: Regex-based skill detection and culture signal identification.
- **Scoring Algorithm**: Weighted model combining Skills (45%), Culture (20%), Potential (20%), Domain (10%), and Logistics (5%) scores.
- **Candidate Matching**: AI-powered scoring, ranking, and compatibility assessment against jobs.

**Frontend (Next.js 14)**
- **Pages**:
  - **Home (`/`)**: Entry point.
  - **Candidates List (`/candidates`)**: Displays candidates with AI status, scores, applied jobs, and bulk actions.
  - **Candidate Detail (`/candidates/[id]`)**: Comprehensive view with materials, compliance, and AI analysis.
  - **Jobs List (`/jobs`)**: Manages job postings with AI creation tools and enhanced navigation.
  - **Job Detail (`/jobs/[id]`)**: Tabbed interface for description, requirements (with editable weights), screening questions, applicant tracking, and a configurable evaluation pipeline builder. Features advanced AI-powered LinkedIn job parsing and description generation.
  - **Job Matches (`/jobs/[id]/matches`)**: Displays ranked candidates for a job with scores, compatibility badges, AI reasoning, and filtering options.
  - **Company Profile (`/settings/company`)**: Manages company information in view/edit modes.
- **Features**: Real-time validation, TailwindCSS styling, responsive design, dynamic display of AI analysis status, and workflow-driven UI.

#### System Design Choices
- **Dual-server setup**: FastAPI backend and Next.js frontend communicating via HTTPS.
- **AI Integration**: Deep integration with OpenAI's GPT-4o-mini for analysis, profile generation, and matching using JSON mode.
- **Scalability**: Optimized backend queries and efficient frontend bulk operations.
- **Modularity**: Separation of concerns with dedicated routers and a distinct AI service module.

### External Dependencies

- **FastAPI**: Python web framework.
- **Next.js 14**: React framework.
- **TailwindCSS**: CSS framework.
- **SQLAlchemy**: Python ORM.
- **SQLite**: Database.
- **Uvicorn**: ASGI server.
- **NumPy**: Numerical operations.
- **Python-multipart**: File uploads.
- **OpenAI API**: For AI-powered text analysis (GPT-4o-mini).