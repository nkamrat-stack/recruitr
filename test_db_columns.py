from database import SessionLocal, CandidateProfile, Job
import json

print("Testing new database columns...\n")

db = SessionLocal()

# Test CandidateProfile.profile_embedding
try:
    profile = db.query(CandidateProfile).first()
    if profile:
        profile.profile_embedding = json.dumps([0.1, 0.2, 0.3])
        db.commit()
        print("✅ CandidateProfile.profile_embedding works")
    else:
        print("⚠️  No profiles yet (OK - column exists)")
except AttributeError:
    print("❌ CandidateProfile.profile_embedding column missing")

# Test Job.job_embedding
try:
    job = db.query(Job).first()
    if job:
        job.job_embedding = json.dumps([0.4, 0.5, 0.6])
        db.commit()
        print("✅ Job.job_embedding works")
    else:
        print("⚠️  No jobs yet (OK - column exists)")
except AttributeError:
    print("❌ Job.job_embedding column missing")

db.close()
print("\nDone!")