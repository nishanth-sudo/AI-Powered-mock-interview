import requests
import json

def test_ollama_api():
    try:
        # Test the generate API
        print("Testing Ollama Generate API...")
        response = requests.post(
            "http://localhost:11434/api/generate",
            json={
                "model": "interview:latest",
                "prompt": "Candidate answered: I have 5 years of experience in Python. Continue the mock interview.",
                "stream": False
            }
        )
        
        print(f"Status code: {response.status_code}")
        print(f"Content type: {response.headers.get('Content-Type')}")
        print(f"Raw response (first 500 chars): {response.text[:500]}")
        
        try:
            # Try to parse as JSON
            result = response.json()
            print(f"JSON keys: {list(result.keys())}")
            if "response" in result:
                print(f"Response content: {result['response'][:100]}...")
        except json.JSONDecodeError as e:
            print(f"Not valid JSON: {str(e)}")
            
    except Exception as e:
        print(f"Error testing API: {str(e)}")

if __name__ == "__main__":
    test_ollama_api()
