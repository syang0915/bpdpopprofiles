import os
from flask import json
from google import genai
from google.genai import types
import requests
from ollama import chat
from ollama import ChatResponse
from supabase import create_client
from api.tools import TOOL_FUNCTIONS, tools

client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

supabase_url = os.environ.get("SUPABASE_URL")
supabase_key = os.environ.get("SUPABASE_KEY")

supabase_client = create_client(supabase_url, supabase_key)

def interpret_query(model: str, user_prompt: str) -> str:
    if model == "gemini":
      response = client.models.generate_content(
          model="gemini-2.5-flash-lite",
          contents=user_prompt,
          config=types.GenerateContentConfig(
            tools=tools
          ),
      )

      candidate = response.candidates[0]
      part = candidate.content.parts[0]

      for part in candidate.content.parts:
        if part.function_call:
          function_name = part.function_call.name
          args = part.function_call.args

          if function_name in TOOL_FUNCTIONS:
              tool_function = TOOL_FUNCTIONS[function_name]
              result = None
              try:
                  result = tool_function(**args)
                  print(f"Tool {function_name} returned: {result}")
              except Exception as e:
                  print(f"Error calling tool {function_name}: {e}")

              final_output = client.models.generate_content(
                  model="gemini-2.5-flash-lite",
                  contents=[
                      # 1️⃣ original user message
                      types.Content(
                          role="user",
                          parts=[types.Part.from_text(text=user_prompt)]
                      ),

                      # 2️⃣ model function call turn
                      candidate.content,

                      # 3️⃣ tool response turn
                      types.Content(
                          role="tool",
                          parts=[
                              types.Part.from_function_response(
                                  name=function_name,
                                  response=result,
                              )
                          ],
                      ),
                  ],
              )


              return final_output.text


      print(' failed to call tool', response.text)
      return None
    
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



