from database import SessionLocal, Job, Application, Candidate

db = SessionLocal()

jobs = db.query(Job).all()
print(f"Total jobs: {len(jobs)}\n")

for job in jobs[:3]:
    app_count = db.query(Application).filter(Application.job_id == job.id).count()
    print(f"Job: {job.title}")
    print(f"  Applicants: {app_count}")

    if app_count > 0:
        apps = db.query(Application, Candidate).join(Candidate).filter(
            Application.job_id == job.id
        ).all()
        for app, candidate in apps:
            print(f"    - {candidate.name} (status: {app.application_status})")
    print()

db.close()