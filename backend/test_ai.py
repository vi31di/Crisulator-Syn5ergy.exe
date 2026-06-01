from ai_client import ask_ai

response = ask_ai([
    {
        "role": "user",
        "content": "Say hello from Syn5ergy"
    }
])

print(response)