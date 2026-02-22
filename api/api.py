from http.client import HTTPException
import time
from flask import Flask, json, request
from flask_cors import CORS
from dotenv import load_dotenv
import asyncio
import os
from google import genai
from supabase import create_client, Client

from ai_service import interpret_query

load_dotenv()

genAiKey = api_key=os.getenv("GEMINI_API_KEY")
supabase_url = os.environ.get("SUPABASE_URL")
supabase_key = os.environ.get("SUPABASE_KEY")

ALLOWED_COLUMNS = {"id", "name", "category", "price", "in_stock"}
ALLOWED_OPERATORS = {"eq", "lt", "gt", "ilike"}

app = Flask(__name__)
CORS(app)

client = genai.Client(api_key=genAiKey)
supabase_client = create_client(supabase_url, supabase_key)

@app.route('/')
def health_check():
    return "alive"

@app.route('/api/time')
def get_current_time():
    return {'time': time.time()}


@app.route('/api/dbquery')
def db_query():
    return {'message': "HELLO WORLD",
        'data': [1,2,3,4,5]
        }

@app.route('/test')
def tester():
    resp = supabase_client.table("officers_real").select("*").limit(1).execute()
    return { "status": getattr(resp, "status_code", None), "error": getattr(resp, "error", None), "data": resp.data }


@app.route('/api/prompt', methods = ['POST'])
async def prompt():

    print(request.get_json())
    data = request.get_json()

    query_output = interpret_query(data['model'], data['prompt'])

    print("AI RESPONSE:", query_output)

    try:
        query_json = json.loads(query_output)
    except:
        raise HTTPException(status_code=400, detail="Invalid AI JSON output")
    
    db_query = supabase_client.table(query_json["table"]).select("*")

    for f in query_json.get("filters", []):
        col = f["column"]
        op = f["operator"]
        val = f["value"]

        if col not in ALLOWED_COLUMNS:
            raise HTTPException(status_code=400, detail="Invalid column")

        if op not in ALLOWED_OPERATORS:
            raise HTTPException(status_code=400, detail="Invalid operator")

        if op == "eq":
            print("adding eq")
            db_query = db_query.eq(col, val)
        elif op == "ilike":
            print("adding ilike")
            db_query = db_query.ilike(col, f"%{val}%")
        elif op == "lt":
            db_query = db_query.lt(col, val)
        elif op == "gt":
            db_query = db_query.gt(col, val)

    if "order_by" in query_json and query_json["order_by"]:
        db_query = db_query.order(
            query_json["order_by"]["column"],
            desc=query_json["order_by"]["direction"] == "desc"
        )

    if "limit" in query_json and query_json["limit"]:
        db_query = db_query.limit(min(query_json["limit"], 50))

    result = db_query.execute()

    return {
        "output": result.data
    }