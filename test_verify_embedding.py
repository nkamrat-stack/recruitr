from database import SessionLocal, CandidateProfile
import json

db = SessionLocal()

profile = db.query(CandidateProfile).filter(CandidateProfile.candidate_id == 1).first()

if not profile:
    print("❌ No profile found")
else:
    print("Profile found:")
    print(f"  Name: John Smith")
    print(f"  Skills: {profile.technical_skills[:50]}...")
    print(f"  Best fit: {profile.best_role_fit}")

    if profile.profile_embedding:
        embedding = json.loads(profile.profile_embedding)
        print(f"\n✅ EMBEDDING STORED!")
        print(f"  Length: {len(embedding)}")
        print(f"  First 3 values: {embedding[:3]}")
        print(f"  All floats? {all(isinstance(x, float) for x in embedding[:10])}")
    else:
        print("\n❌ NO EMBEDDING - Something went wrong")

db.close()