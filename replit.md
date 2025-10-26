# Recruitr - Full Stack AI Recruiting Application

## Overview
Recruitr is a full-stack AI-powered recruiting application with a FastAPI backend and Next.js frontend. It helps rank and match candidates based on their resumes against job descriptions using a multi-factor scoring algorithm.

## Recent Changes
- **October 26, 2025**: Reconfigured dual-server setup
  - Separated Backend workflow (port 8000) and Frontend workflow (port 5000)
  - Backend runs on port 8000 with public HTTPS access
  - Frontend runs on port 5000 and connects to backend via public URL
  - Fixed SQLAlchemy type casting issues in main.py
  - Both workflows run simultaneously for integrated development
  
- **October 26, 2025**: Initial project creation
  - Created FastAPI backend with SQLite database
  - Implemented candidate upload and resume parsing
  - Built candidate ranking system with weighted scoring algorithm
  - Added skills extraction and culture signal detection using regex
  - Created Next.js 14 frontend with TailwindCSS
  - Built three main pages: Home, Upload Candidates, Rank Candidates
  - Connected frontend to backend API

## Project Architecture

### Backend (FastAPI)

#### Database Schema (SQLite)
- **candidates**: Stores candidate information (id, name, email)
- **artifacts**: Stores candidate resumes and documents (id, candidate_id, kind, source, text)
- **feedback**: Stores hiring feedback for candidates (id, candidate_id, job_title, label)

#### API Endpoints
1. `GET /` - Root endpoint returns API status
2. `POST /ingest/upload` - Upload candidate resumes (form data: name, email, file)
3. `POST /match/rank` - Rank candidates against a job description

#### Feature Extraction
- **Skills Detection**: Regex-based extraction for: python, fastapi, react, postgres, docker, kubernetes
- **Culture Signals**: Detection of: shipped, launched, owned, documented

#### Scoring Algorithm
The ranking system uses a weighted scoring model:
- **Skills Score (45%)**: Percentage of required skills matched
- **Culture Score (20%)**: Presence of culture keywords (max 4)
- **Potential Score (20%)**: Text similarity between resume and job description
- **Domain Score (10%)**: Placeholder at 0.5
- **Logistics Score (5%)**: Placeholder at 0.5

### Frontend (Next.js 14)

#### Pages
1. **Home (/)**: Welcome page with "Go to App" button
2. **Upload Candidates (/candidates)**: Form to upload candidate resumes with name, email, and file upload
3. **Rank Candidates (/jobs)**: Form to enter job description and rank all candidates

#### Features
- Beautiful TailwindCSS styling with responsive design
- Navigation header across all pages
- Real-time form validation
- Success/error message display
- Skills and culture signals visualization with badges
- Comprehensive ranking table with score breakdowns
- Progress bars for visual score representation

### Technology Stack

**Backend:**
- FastAPI for REST API
- SQLAlchemy for ORM and database management
- SQLite for data persistence
- Uvicorn as ASGI server
- NumPy for calculations
- Python-multipart for file uploads

**Frontend:**
- Next.js 14 with React 18
- TailwindCSS for styling
- Responsive design for mobile and desktop

## How to Run

Both servers run automatically via separate workflows:

**Workflows:**
- **Backend**: Runs FastAPI with Uvicorn on port 8000 (internal)
  - Command: `uvicorn main:app --host 0.0.0.0 --port 8000`
- **Frontend**: Runs Next.js dev server on port 5000 (webview)
  - Command: `cd frontend && npm run dev`

**Access the application:**
- Frontend UI: View the webview (port 5000)
- Backend API: http://6882bd3d-c5e2-4421-9eef-9d1c1ced7776-00-vjrvbrzqocvv.riker.replit.dev:8000

**API Documentation:**
- Access Swagger UI by opening the Backend workflow logs and clicking the docs URL
- Endpoints: `/docs` for Swagger UI, `/redoc` for ReDoc

## File Structure
```
.
├── main.py              # FastAPI application and endpoints
├── database.py          # SQLAlchemy models and database setup
├── recruitr.db          # SQLite database (auto-created)
├── example_usage.md     # API usage examples
├── frontend/
│   ├── pages/
│   │   ├── index.js     # Home page
│   │   ├── candidates.js # Upload candidates page
│   │   ├── jobs.js      # Rank candidates page
│   │   └── _app.js      # App layout with navigation
│   ├── styles/
│   │   └── globals.css  # TailwindCSS styles
│   ├── package.json     # Node.js dependencies
│   ├── tailwind.config.js
│   └── postcss.config.js
├── replit.md            # This file
└── .gitignore           # Git ignore patterns
```

## Usage Flow

1. **Upload Candidates**: Navigate to "Upload Candidates" and submit resume files with candidate information
2. **View Detection Results**: See automatically detected skills and culture signals after upload
3. **Rank Candidates**: Go to "Rank Candidates", enter a job description, and click "Rank Candidates"
4. **Review Rankings**: View candidates sorted by overall score with detailed breakdowns of matched/missing skills

## Future Enhancements
- Advanced NLP for better skill extraction
- Machine learning models for semantic matching
- Candidate profile management endpoints
- Feedback learning system
- Job description templates
- Bulk upload functionality
- Candidate details modal with full resume view
- Export rankings to CSV
- Historical job rankings dashboard
