import os
from flask import json
from google import genai
from google.genai import types
import requests
from ollama import chat
from ollama import ChatResponse
from supabase import create_client
from api.tools import TOOL_FUNCTIONS, tools
import pprint

client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

supabase_url = os.environ.get("SUPABASE_URL")
supabase_key = os.environ.get("SUPABASE_KEY")

supabase_client = create_client(supabase_url, supabase_key)

def interpret_query(model: str, user_prompt: str) -> str:
    if model == "gemini":
      conversation = [
          types.Content(
              role="user",
              parts=[types.Part.from_text(text=user_prompt)]
          )
      ]

      while True:
          response = client.models.generate_content(
              model="gemini-2.5-flash",
              contents=conversation,
              config=types.GenerateContentConfig(tools=tools),
          )

          candidate = response.candidates[0]
          conversation.append(candidate.content)

          function_calls = [
              p for p in candidate.content.parts
              if p.function_call and candidate.content
          ]

          if not function_calls:
              return response.text  # final answer

          for call in function_calls:
              fn = TOOL_FUNCTIONS[call.function_call.name]
              result = fn(**call.function_call.args)

              conversation.append(
                  types.Content(
                      role="tool",
                      parts=[
                          types.Part.from_function_response(
                              name=call.function_call.name,
                              response=result,
                          )
                      ],
                  )
              )

    
    if model == "ollama":
      response: ChatResponse = chat(model='qwen2.5', messages=[
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



