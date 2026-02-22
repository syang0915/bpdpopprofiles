import time
from flask import Flask, request
from flask_cors import CORS
import os
import pandas as pd
from supabase import create_client
from mock_data import MOCK_DEPARTMENTS

try:
    from supabase import create_client
except ImportError:
    create_client = None

COORDS = pd.read_csv("../data/district_latlong.csv")

# CLIENNNTTT 
url = os.environ.get("SUPABASE_URL")
key = os.environ.get("SUPABASE_KEY")
db = create_client(url, key) if create_client and url and key else None

app = Flask(__name__)
CORS(app)

hot_reload = HotReload(app, includes=['templates', 'static', '.'], excludes=['__pycache__', 'node_modules', '.git'])

@app.route('/api/time')
def get_current_time():
    return {'time': time.time()}


@app.route('/test')
def db_query():
    if db is None:
        return {"message": "Supabase not configured", "data": []}
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
    if db is None:
        return {"message": []}
    employee_id = request.args.get('employee_id')
    response = db.table("officers_real").select("*").eq("employee_id", employee_id).execute()
    
    return {"message": response.data}

@app.route('/departments/incidents')
def get_all_departments_and_officers():
    """
    read func name lol :((( )))
    """
    unique_districts = db.table("districts").select("patrol_district").execute().data
    unique_districts = list(set([d["patrol_district"] for d in unique_districts]))
    districts = []

    for district in unique_districts: 
        officers = db.table("districts").select("*, officers_real(*)").eq("patrol_district", district).execute().data
        officers = [{"first_name": o["officers_real"]["first_name"], "last_name": o["officers_real"]["last_name"], "employee_id": o["officers_real"]["employee_id"]} for o in officers]
        dist_dict = {
            "district": district,
            "officers": officers,
            "position": [COORDS[COORDS["district"] == district]["latitude"].values[0], COORDS[COORDS["district"] == district]["longitude"].values[0]],
            "mapping_score": 0.85 # todo get score 
        }
        
        districts.append(dist_dict)
       
    # AHHHHHHHHHHHHHHHHHHHHH
#     result = [{
#     "id": "a-1",
#     "district": "Boston Police District A-1",
#     "address": "40 New Sudbury St, Boston, MA 02114",
#     "position": [42.3613, -71.0598],
#     "officers": [
#       { "id": "det-rivera", "name": "Det. Rivera" },
#       { "id": "sgt-oneil", "name": "Sgt. O'Neil" },
#       { "id": "officer-patel", "name": "Officer Patel" },
#       { "id": "officer-kim", "name": "Officer Kim" },
#       { "id": "officer-thomas", "name": "Officer Thomas" },
#       { "id": "officer-murphy", "name": "Officer Murphy" },
#       { "id": "officer-lee", "name": "Officer Lee" },
#       { "id": "officer-hughes", "name": "Officer Hughes" },
#     ],
#     "mapping_score": 0.85
#   }]
    
    return {"message": districts}
    


@app.route("/departments/incidents/<department_id>")
def get_incidents_by_department(department_id):
    """
    SELECT * FROM incidents WHERE department_id = <department_id>
    """
    # join with departments table to get department name join on employee_id
    response = db.table("incidents").select("*").eq("department_id", department_id).execute()
    return {"message": response.data}

@app.route('/api/departments')
def get_departments():
    """
    Pretends to run a query layer while filtering in-memory mock data.
    Query params:
      - district_id: exact district id (e.g. a-1)
      - q: case-insensitive search over district/address/officer names
      - limit: max number of departments to return
      - delay_ms: optional simulated latency
    """
    district_id = request.args.get('district_id')
    search = (request.args.get('q') or '').strip().lower()
    delay_ms = max(0, int(request.args.get('delay_ms', 180)))
    limit_param = request.args.get('limit')

    if delay_ms:
        time.sleep(min(delay_ms, 1200) / 1000)

    departments = MOCK_DEPARTMENTS

    if district_id:
        departments = [department for department in departments if department["id"] == district_id]

    if search:
        def matches(department):
            district_hit = search in department["district"].lower()
            address_hit = search in department["address"].lower()
            officer_hit = any(
                search in officer["name"].lower() or search in officer["id"].lower()
                for officer in department["officers"]
            )
            return district_hit or address_hit or officer_hit

        departments = [department for department in departments if matches(department)]

    if limit_param:
        try:
            limit = max(1, int(limit_param))
            departments = departments[:limit]
        except ValueError:
            pass

    return {
        "data": departments,
        "meta": {
            "source": "mock",
            "count": len(departments),
            "query": {
                "district_id": district_id,
                "q": search,
                "limit": limit_param,
            },
        },
    }

