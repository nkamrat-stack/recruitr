from app.services.ai_service import generate_embedding, semantic_match_candidates

print("Testing semantic matching...\n")

# Create job embedding
job_text = "Senior Python developer with FastAPI experience"
job_embedding = generate_embedding(job_text)
print(f"Job: {job_text}")

# Create mock candidates with embeddings
candidates = [
    {
        "candidate_id": 1,
        "name": "Python Expert",
        "profile_embedding": generate_embedding("Expert Python developer with 8 years FastAPI experience")
    },
    {
        "candidate_id": 2,
        "name": "Frontend Developer",
        "profile_embedding": generate_embedding("React and JavaScript frontend specialist")
    },
    {
        "candidate_id": 3,
        "name": "Marketing Manager",
        "profile_embedding": generate_embedding("Marketing and social media expert")
    }
]

print(f"Matching {len(candidates)} candidates...\n")

results = semantic_match_candidates(job_embedding, candidates)

print("RESULTS (sorted by similarity):")
for i, result in enumerate(results, 1):
    print(f"{i}. {result['name']}: {result['similarity_score']:.4f}")

# Verify
if results[0]['name'] == "Python Expert":
    print("\n✅ Semantic matching works! Python Expert is #1")
else:
    print(f"\n❌ Wrong order - {results[0]['name']} is #1")