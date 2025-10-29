import requests

print("Checking available candidate upload endpoints...\n")

# Get the OpenAPI docs to see all endpoints
response = requests.get("http://localhost:8000/openapi.json")
endpoints = response.json()

print("Candidate-related POST endpoints:")
for path, methods in endpoints.get('paths', {}).items():
    if 'candidates' in path.lower() and 'post' in methods:
        print(f"\n  {path}")
        post_info = methods['post']

        # Check parameters
        if 'requestBody' in post_info:
            content = post_info['requestBody'].get('content', {})
            if 'multipart/form-data' in content:
                schema = content['multipart/form-data'].get('schema', {})
                props = schema.get('properties', {})
                print(f"    Parameters: {list(props.keys())}")
            elif 'application/json' in content:
                schema = content['application/json'].get('schema', {})
                if '$ref' in schema:
                    print(f"    Body: {schema['$ref'].split('/')[-1]}")

print("\n" + "="*60)
print("Does any endpoint accept job_id during upload?")