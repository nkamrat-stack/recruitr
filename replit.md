# Recruitr API

## Overview
Recruitr is an AI-powered recruiting backend built with FastAPI. It helps rank and match candidates based on their resumes against job descriptions using a multi-factor scoring algorithm.

## Recent Changes
- **October 26, 2025**: Initial project creation
  - Created FastAPI backend with SQLite database
  - Implemented candidate upload and resume parsing
  - Built candidate ranking system with weighted scoring algorithm
  - Added skills extraction and culture signal detection using regex

## Project Architecture

### Database Schema (SQLite)
- **candidates**: Stores candidate information (id, name, email)
- **artifacts**: Stores candidate resumes and documents (id, candidate_id, kind, source, text)
- **feedback**: Stores hiring feedback for candidates (id, candidate_id, job_title, label)

### API Endpoints
1. `GET /` - Root endpoint returns API status
2. `POST /ingest/upload` - Upload candidate resumes (form data: name, email, file)
3. `POST /match/rank` - Rank candidates against a job description

### Feature Extraction
- **Skills Detection**: Regex-based extraction for: python, fastapi, react, postgres, docker, kubernetes
- **Culture Signals**: Detection of: shipped, launched, owned, documented

### Scoring Algorithm
The ranking system uses a weighted scoring model:
- **Skills Score (45%)**: Percentage of required skills matched
- **Culture Score (20%)**: Presence of culture keywords (max 4)
- **Potential Score (20%)**: Text similarity between resume and job description
- **Domain Score (10%)**: Placeholder at 0.5
- **Logistics Score (5%)**: Placeholder at 0.5

### Technology Stack
- FastAPI for REST API
- SQLAlchemy for ORM and database management
- SQLite for data persistence
- Uvicorn as ASGI server
- NumPy for calculations
- Python-multipart for file uploads

## How to Run
The server starts automatically via the workflow on port 5000. Access the API at:
- API Docs: http://localhost:5000/docs
- Root endpoint: http://localhost:5000/

## File Structure
```
.
├── main.py           # FastAPI application and endpoints
├── database.py       # SQLAlchemy models and database setup
├── recruitr.db       # SQLite database (auto-created)
├── replit.md         # This file
└── .gitignore        # Git ignore patterns
```

## Future Enhancements
- Advanced NLP for better skill extraction
- Machine learning models for semantic matching
- Candidate profile management endpoints
- Feedback learning system
- Job description templates
- Bulk upload functionality
