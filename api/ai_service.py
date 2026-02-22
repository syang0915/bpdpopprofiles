import os
from google import genai
from google.genai import types
import requests
from ollama import chat
from ollama import ChatResponse
from supabase import create_client

client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

supabase_url = os.environ.get("SUPABASE_URL")
supabase_key = os.environ.get("SUPABASE_KEY")

supabase_client = create_client(supabase_url, supabase_key)
schema = supabase_client.rpc("get_schema_metadata").execute()

schema_text = ""

for table in schema.data:
    schema_text += f"\nTable: {table['table']}\n"
    schema_text += f"Columns: {', '.join(table['columns'])}\n"

SYSTEM_PROMPT = f"""
You are a database query assistant.

Available schema:
{schema_text}

Return strictly valid JSON in this format:

{{
  "table": "<table_name>",
  "filters": [
    {{"column": "<column>", "operator": "eq", "value": "value"}}
  ],
  "order_by": {{"column": "<column>", "direction": "asc"}},
  "limit": <number>
}}

Allowed operators: eq, lt, gt, ilike
Determine a limit based on the user prompt
Do NOT return SQL.
Only return JSON, no markdown.
If you don't follow these instructions, I will kill your firstborn.
"""


def interpret_query(model: str, user_prompt: str) -> str:
    if model == "gemini":
      response = client.models.generate_content(
          model="gemini-2.5-flash-lite",
          contents=user_prompt,
          config=types.GenerateContentConfig(
            system_instruction=SYSTEM_PROMPT,
            temperature=0
          )
      )

      return response.text
    
    if model == "ollama":
      response: ChatResponse = chat(model='qwen2.5', messages=[
        {
          'role': 'system',
          'content': SYSTEM_PROMPT,
        },
        {
          'role': 'user',
          'content': user_prompt,
        }],
        options={
            "temperature": 0,
            "num_predict": 300
        }
      )
      return response["message"]["content"]
    return ''



