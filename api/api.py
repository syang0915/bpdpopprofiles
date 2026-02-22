import time
from flask import Flask, request
from flask_cors import CORS
import os
from supabase import create_client
from flask_hot_reload import HotReload


# CLIENNNTTT 
url = os.environ.get("SUPABASE_URL")
key = os.environ.get("SUPABASE_KEY")
db = create_client(url, key)

app = Flask(__name__)
CORS(app)

hot_reload = HotReload(app, includes=['templates', 'static', '.'], excludes=['__pycache__', 'node_modules', '.git'])

@app.route('/api/time')
def get_current_time():
    return {'time': time.time()}


@app.route('/test')
def db_query():
    response = (
    db.table("officers")
    .select("*")
    .execute()
)
    return {"message": response.data}

@app.route('/officers')
def get_officer_data():
    """ 
    SELECT * from officers where first_name='John' and last_name='Smith'
    """
    employee_id = request.args.get('employee_id')
     

    response = db.table("officers").select("*").eq("Employee ID", employee_id).execute()
    
    return {"message": response.data}


@app.route("/departments/incidents/<department_id>")
def get_incidents_by_department(department_id):
    """
    SELECT * FROM incidents WHERE department_id = <department_id>
    """
    response = db.table("incidents").select("*").eq("department_id", department_id).execute()
    return {"message": response.data}
