from app.services.ai_service import generate_embedding, generate_profile_embedding, generate_job_embedding
import os

print("Testing embedding generation functions...\n")

# Check OpenAI key
if not os.environ.get('OPENAI_API_KEY'):
    print("❌ OPENAI_API_KEY not set!")
    exit(1)

# Test 1: Basic embedding
print("Test 1: generate_embedding()")
text = "Python developer with 5 years experience"
embedding = generate_embedding(text)
print(f"  Text: {text}")
print(f"  Embedding length: {len(embedding)}")
print(f"  First 3 values: {embedding[:3]}")

if len(embedding) == 1536:
    print("  ✅ Correct embedding size")
else:
    print(f"  ❌ Wrong size: {len(embedding)}")

# Test 2: Profile embedding
print("\nTest 2: generate_profile_embedding()")
profile_data = {
    "technical_skills": '["Python", "FastAPI"]',
    "strengths": "Strong problem solver",
    "personality_traits": '["detail-oriented"]',
    "culture_signals": '["shipped products"]'
}
profile_emb = generate_profile_embedding(profile_data)
print(f"  Embedding length: {len(profile_emb)}")

if len(profile_emb) == 1536:
    print("  ✅ Profile embedding works")
else:
    print(f"  ❌ Wrong size: {len(profile_emb)}")

# Test 3: Job embedding
print("\nTest 3: generate_job_embedding()")
job_data = {
    "title": "Senior Engineer",
    "description": "Build backend systems",
    "required_skills": "Python, FastAPI",
    "culture_requirements": "Ownership mentality"
}
job_emb = generate_job_embedding(job_data)
print(f"  Embedding length: {len(job_emb)}")

if len(job_emb) == 1536:
    print("  ✅ Job embedding works")
else:
    print(f"  ❌ Wrong size: {len(job_emb)}")

print("\n✅ All embedding functions working!")