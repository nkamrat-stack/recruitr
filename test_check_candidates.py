from database import SessionLocal, Candidate, CandidateArtifact

db = SessionLocal()

candidates = db.query(Candidate).all()
print(f"Total candidates: {len(candidates)}\n")

for candidate in candidates[:5]:  # Show first 5
    artifact_count = db.query(CandidateArtifact).filter(
        CandidateArtifact.candidate_id == candidate.id
    ).count()
    print(f"ID: {candidate.id} | {candidate.name} | {artifact_count} artifacts")

db.close()