from google import genai

# Put your actual API key here
genai.configure(api_key="YOUR_GOOGLE_API_KEY_HERE")

print("Checking available models for your API key...")
for m in genai.list_models():
    if 'generateContent' in m.supported_generation_methods:
        print(m.name)