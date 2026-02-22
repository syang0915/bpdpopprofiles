from flask import Flask, request
from flask_cors import CORS
from dotenv import load_dotenv
import os
from google import genai
from supabase import create_client

from api.ai_service import interpret_query

load_dotenv()

genAiKey = api_key=os.getenv("GEMINI_API_KEY")
supabase_url = os.environ.get("SUPABASE_URL")
supabase_key = os.environ.get("SUPABASE_KEY")

app = Flask(__name__)
CORS(app)

client = genai.Client(api_key=genAiKey)
supabase_client = create_client(supabase_url, supabase_key)

@app.route('/')
def health_check():
    return "alive"


@app.route('/api/prompt', methods = ['POST'])
async def prompt():

    print(request.get_json())
    data = request.get_json()

    query_output = interpret_query(data['model'], data['prompt'])

    return {
        "output": query_output
    }

@app.route('/officers')
def get_officer_data():
    """ 
    SELECT * from officers where first_name='John' and last_name='Smith'
    """
    employee_id = request.args.get('employee_id')
    response = supabase_client.table("officers").select("*").eq("Employee ID", employee_id).execute()
    return {"message": response.data}
