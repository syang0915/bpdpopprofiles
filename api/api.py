import os
import re
import time
import pandas as pd
from flask import Flask, request
from flask_cors import CORS
from mock_data import MOCK_DEPARTMENTS

try:
    from supabase import create_client
except ImportError:
    create_client = None

try:
    from dotenv import load_dotenv
except ImportError:
    load_dotenv = None

DATA_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "data"))
COORDS_PATH = os.path.join(DATA_DIR, "district_latlong.csv")
COORDS = pd.read_csv(COORDS_PATH) if os.path.exists(COORDS_PATH) else pd.DataFrame()

if not COORDS.empty:
    COORDS["district_key"] = COORDS["district"].astype(str).str.lower().str.strip()
    COORDS_BY_DISTRICT = {
        row["district_key"]: [float(row["latitude"]), float(row["longitude"])]
        for row in COORDS.to_dict("records")
    }
else:
    COORDS_BY_DISTRICT = {}

FALLBACK_COORDS = [42.3601, -71.0589]
ADDRESS_BY_DISTRICT_ID = {item["id"]: item["address"] for item in MOCK_DEPARTMENTS}

if load_dotenv:
    load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))
    load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

url = (
    os.environ.get("SUPABASE_URL")
    or os.environ.get("VITE_SUPABASE_URL")
)
key = (
    os.environ.get("SUPABASE_KEY")
    or os.environ.get("SUPABASE_ANON_KEY")
    or os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    or os.environ.get("VITE_SUPABASE_ANON_KEY")
)
db = create_client(url, key) if create_client and url and key else None

app = Flask(__name__)
CORS(app)


def _district_id_from_name(name):
    if not name:
        return "unknown"
    match = re.search(r"([A-Za-z])\s*-\s*(\d{1,2})", str(name))
    if match:
        return f"{match.group(1).lower()}-{int(match.group(2))}"
    normalized = re.sub(r"[^a-z0-9]+", "-", str(name).strip().lower())
    return normalized.strip("-") or "unknown"


def _coords_for_district(name):
    return COORDS_BY_DISTRICT.get(str(name).lower().strip(), FALLBACK_COORDS)


def _build_department_payload(district_name, rows):
    department_id = _district_id_from_name(district_name)
    officers = []
    for row in rows:
        officer = row.get("officers_real") or {}
        employee_id = officer.get("employee_id")
        first_name = officer.get("first_name") or ""
        last_name = officer.get("last_name") or ""
        full_name = f"{first_name} {last_name}".strip() or f"Officer {employee_id}"
        officers.append(
            {
                "id": str(employee_id) if employee_id is not None else "unknown",
                "name": full_name,
                "employee_id": employee_id,
                "rank": officer.get("rank"),
            }
        )

    return {
        "id": department_id,
        "district": district_name,
        "address": ADDRESS_BY_DISTRICT_ID.get(department_id, "Address unavailable"),
        "position": _coords_for_district(district_name),
        "officers": officers,
        "mapping_score": 0.85,
    }

@app.route('/api/time')
def get_current_time():
    return {'time': time.time()}


@app.route('/test')
def db_query():
    if db is None:
        return {"message": "Supabase not configured", "data": []}
    response = db.table("officers_real").select("*").limit(20).execute()
    return {"data": response.data}

@app.route('/officers')
def get_officer_data():
    if db is None:
        return {"message": "Supabase not configured", "data": []}
    employee_id = request.args.get('employee_id')
    if not employee_id:
        return {"message": "employee_id query param is required", "data": []}, 400
    response = db.table("officers_real").select("*").eq("employee_id", employee_id).execute()
    return {"message": response.data, "data": response.data}


@app.route("/api/officers/<int:employee_id>")
def get_officer_profile(employee_id):
    if db is None:
        return {"message": "Supabase not configured", "data": None}, 503

    officer_response = db.table("officers_real").select("*").eq("employee_id", employee_id).limit(1).execute()
    officer_data = officer_response.data[0] if officer_response.data else None
    if not officer_data:
        return {"message": "Officer not found", "data": None}, 404

    department_response = (
        db.table("districts")
        .select("patrol_district,name,total_incidents")
        .eq("employee_id", employee_id)
        .limit(1)
        .execute()
    )
    compensation_response = (
        db.table("compensation")
        .select("year,total_pay,regular_pay,ot_pay,other_pay")
        .eq("employee_id", employee_id)
        .order("year", desc=True)
        .limit(1)
        .execute()
    )

    return {
        "data": {
            "officer": officer_data,
            "district": department_response.data[0] if department_response.data else None,
            "latest_compensation": compensation_response.data[0] if compensation_response.data else None,
        }
    }

@app.route('/departments/incidents')
def get_all_departments_and_officers():
    if db is None:
        return {"message": "Supabase not configured", "data": []}, 503

    unique_districts = db.table("districts").select("patrol_district").execute().data
    unique_districts = sorted(list(set([d["patrol_district"] for d in unique_districts if d.get("patrol_district")])))
    districts = []

    for district in unique_districts:
        officers = db.table("districts").select("*, officers_real(*)").eq("patrol_district", district).execute().data
        districts.append(_build_department_payload(district, officers))

    return {"message": districts, "data": districts}


@app.route("/departments/incidents/<department_id>")
def get_incidents_by_department(department_id):
    if db is None:
        return {"message": "Supabase not configured", "data": []}, 503

    district_rows = db.table("districts").select("employee_id,patrol_district").execute().data
    matching_employee_ids = []
    for row in district_rows:
        district_name = row.get("patrol_district")
        if _district_id_from_name(district_name) == department_id:
            matching_employee_ids.append(row["employee_id"])

    if not matching_employee_ids:
        return {"data": [], "meta": {"department_id": department_id, "count": 0}}

    response = db.table("incidents").select("*").in_("Employee ID", matching_employee_ids).execute()
    return {
        "data": response.data,
        "meta": {"department_id": department_id, "count": len(response.data)},
    }

@app.route('/api/departments')
def get_departments():
    district_id = request.args.get('district_id')
    search = (request.args.get('q') or '').strip().lower()
    delay_ms = max(0, int(request.args.get('delay_ms', 0)))
    limit_param = request.args.get('limit')

    if delay_ms:
        time.sleep(min(delay_ms, 1200) / 1000)

    source = "mock"
    departments = MOCK_DEPARTMENTS
    if db is not None:
        source = "supabase"
        district_rows = db.table("districts").select("patrol_district, employee_id, officers_real(*)").execute().data
        grouped = {}
        for row in district_rows:
            district_name = row.get("patrol_district")
            if not district_name:
                continue
            grouped.setdefault(district_name, []).append(row)
        departments = [_build_department_payload(name, rows) for name, rows in grouped.items()]

    if district_id:
        departments = [department for department in departments if department["id"].lower() == district_id.lower()]

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
            "source": source,
            "count": len(departments),
            "query": {
                "district_id": district_id,
                "q": search,
                "limit": limit_param,
            },
        },
    }
