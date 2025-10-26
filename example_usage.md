# Recruitr API - Usage Examples

## Base URL
```
http://localhost:5000
```

## 1. Check API Status
```bash
curl http://localhost:5000/
```
Response:
```json
{"message": "Recruitr API"}
```

## 2. Upload a Candidate Resume

```bash
curl -X POST http://localhost:5000/ingest/upload \
  -F "name=John Doe" \
  -F "email=john@example.com" \
  -F "file=@resume.txt"
```

Example resume.txt content:
```
John Doe
Senior Software Engineer

I have shipped multiple products using Python and FastAPI.
Launched a microservices platform with Docker and Kubernetes.
Owned the backend architecture for a React-based web application.
Documented all APIs and best practices for the team.

Skills: Python, FastAPI, React, PostgreSQL, Docker, Kubernetes
```

Response:
```json
{
  "id": 1,
  "name": "John Doe",
  "email": "john@example.com",
  "skills_detected": ["python", "fastapi", "react", "postgres", "docker", "kubernetes"],
  "culture_signals": ["shipped", "launched", "owned", "documented"],
  "message": "Candidate uploaded successfully"
}
```

## 3. Rank Candidates Against Job Description

```bash
curl -X POST http://localhost:5000/match/rank \
  -H "Content-Type: application/json" \
  -d '{
    "description": "Looking for a senior engineer with Python and Docker experience who has launched products",
    "required_skills": ["python", "docker", "kubernetes"]
  }'
```

Response:
```json
[
  {
    "id": 1,
    "name": "John Doe",
    "email": "john@example.com",
    "overall_score": 0.823,
    "skills_score": 1.0,
    "culture_score": 1.0,
    "potential_score": 0.245,
    "domain_score": 0.5,
    "logistics_score": 0.5,
    "matched_skills": ["python", "docker", "kubernetes"],
    "missing_skills": [],
    "evidence": [
      "...using Python and FastAPI...",
      "...with Docker and Kubernetes...",
      "...have shipped multiple products..."
    ]
  }
]
```

## Interactive API Documentation

Visit http://localhost:5000/docs for the interactive Swagger UI where you can test all endpoints directly in your browser.

## Scoring Algorithm

The ranking system uses weighted scoring:
- **Skills (45%)**: Percentage of required skills matched
- **Culture (20%)**: Presence of action keywords (shipped, launched, owned, documented)
- **Potential (20%)**: Text similarity between resume and job description
- **Domain (10%)**: Placeholder score
- **Logistics (5%)**: Placeholder score

Total score ranges from 0.0 to 1.0, with candidates sorted by highest score first.
