from database import SessionLocal, Job

db = SessionLocal()
job = db.query(Job).filter(Job.title.like("%CPaaS%")).first()

if job:
    print(f"Job: {job.title}")
    print(f"Status: {job.status}")
    print(f"ID: {job.id}")
else:
    print("Job not found")

db.close()