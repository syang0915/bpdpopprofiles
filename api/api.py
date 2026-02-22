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
SESSION_CACHE = {
    "initialized": False,
    "error": None,
    "officers_by_employee": {},
    "district_by_employee": {},
    "latest_comp_by_employee": {},
    "incidents_by_employee": {},
    "metrics_by_employee": {},
    "departments": [],
    "employee_ids_by_department_id": {},
}

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


def _to_float(value):
    if value is None:
        return 0.0
    if isinstance(value, (int, float)):
        return float(value)
    cleaned = re.sub(r"[^0-9.\-]", "", str(value))
    if not cleaned:
        return 0.0
    try:
        return float(cleaned)
    except ValueError:
        return 0.0


def _build_department_payload(district_name, rows, metrics_by_employee=None, mapping_score=0.0):
    department_id = _district_id_from_name(district_name)
    officers = []
    for row in rows:
        officer = row.get("officers_real") or {}
        employee_id = officer.get("employee_id")
        metric_row = metrics_by_employee.get(employee_id, {}) if metrics_by_employee else {}
        first_name = officer.get("first_name") or ""
        last_name = officer.get("last_name") or ""
        full_name = f"{first_name} {last_name}".strip() or f"Officer {employee_id}"
        officers.append(
            {
                "id": str(employee_id) if employee_id is not None else "unknown",
                "name": full_name,
                "employee_id": employee_id,
                "rank": officer.get("rank"),
                "complaints_percentile": metric_row.get("complaints_percentile"),
                "overtime_ratio_percentile": metric_row.get("overtime_ratio_percentile"),
            }
        )

    return {
        "id": department_id,
        "district": district_name,
        "address": ADDRESS_BY_DISTRICT_ID.get(department_id, "Address unavailable"),
        "position": _coords_for_district(district_name),
        "officers": officers,
        "mapping_score": round(float(mapping_score or 0.0), 2),
    }


def _percentile_for_value(values, target):
    if not values:
        return None
    less_or_equal = sum(1 for value in values if value <= target)
    percentile = (less_or_equal / len(values)) * 100
    return round(percentile, 1)


def _incident_employee_id(row):
    return row.get("Employee ID") or row.get("employee_id")


def _incident_severity(row):
    return _to_float(row.get("severity") or row.get("Severity"))


def _compute_percentile_metrics(officer_rows, compensation_rows, incident_rows):
    overtime_by_employee = {}
    base_by_employee = {}
    for row in compensation_rows:
        employee_id = row.get("employee_id")
        if employee_id is None:
            continue
        overtime_by_employee[employee_id] = overtime_by_employee.get(employee_id, 0.0) + _to_float(row.get("ot_pay"))
        base_by_employee[employee_id] = base_by_employee.get(employee_id, 0.0) + _to_float(row.get("regular_pay"))

    complaints_by_employee = {}
    for row in incident_rows:
        employee_id = _incident_employee_id(row)
        if employee_id is None:
            continue
        complaints_by_employee[employee_id] = complaints_by_employee.get(employee_id, 0) + 1

    all_employee_ids = {row.get("employee_id") for row in officer_rows if row.get("employee_id") is not None}
    all_employee_ids |= set(overtime_by_employee.keys()) | set(complaints_by_employee.keys())
    overtime_ratio_by_employee = {}
    for employee_id in all_employee_ids:
        overtime_total = overtime_by_employee.get(employee_id, 0.0)
        base_total = base_by_employee.get(employee_id, 0.0)
        overtime_ratio_by_employee[employee_id] = (overtime_total / base_total * 100.0) if base_total > 0 else 0.0

    overtime_ratio_values = [overtime_ratio_by_employee.get(employee_id, 0.0) for employee_id in all_employee_ids]
    complaint_values = [complaints_by_employee.get(employee_id, 0) for employee_id in all_employee_ids]

    metrics_by_employee = {}
    for employee_id in all_employee_ids:
        overtime_total = overtime_by_employee.get(employee_id, 0.0)
        overtime_ratio_pct = overtime_ratio_by_employee.get(employee_id, 0.0)
        complaints_total = complaints_by_employee.get(employee_id, 0)
        metrics_by_employee[employee_id] = {
            "overtime_pay_total": round(overtime_total, 2),
            "overtime_to_base_pct": round(overtime_ratio_pct, 2),
            "complaints_total": complaints_total,
            "overtime_ratio_percentile": _percentile_for_value(overtime_ratio_values, overtime_ratio_pct),
            "complaints_percentile": _percentile_for_value(complaint_values, complaints_total),
        }

    return metrics_by_employee


def _initialize_session_cache():
    officer_rows = db.table("officers_real").select("*").execute().data
    district_rows = db.table("districts").select("employee_id,patrol_district,name,total_incidents").execute().data
    district_join_rows = db.table("districts").select("patrol_district,employee_id,officers_real(*)").execute().data
    compensation_rows = db.table("compensation").select("*").execute().data
    incident_rows = db.table("incidents").select("*").execute().data

    officers_by_employee = {
        row["employee_id"]: row for row in officer_rows if row.get("employee_id") is not None
    }

    district_by_employee = {}
    employee_ids_by_department_id = {}
    for row in district_rows:
        employee_id = row.get("employee_id")
        if employee_id is None:
            continue
        district_by_employee[employee_id] = row
        department_id = _district_id_from_name(row.get("patrol_district"))
        employee_ids_by_department_id.setdefault(department_id, []).append(employee_id)

    latest_comp_by_employee = {}
    for row in compensation_rows:
        employee_id = row.get("employee_id")
        if employee_id is None:
            continue
        year = row.get("year") or 0
        existing = latest_comp_by_employee.get(employee_id)
        existing_year = existing.get("year") if existing else -1
        if existing is None or year >= existing_year:
            latest_comp_by_employee[employee_id] = row

    incidents_by_employee = {}
    severity_by_employee = {}
    for row in incident_rows:
        employee_id = _incident_employee_id(row)
        if employee_id is None:
            continue
        incidents_by_employee.setdefault(employee_id, []).append(row)
        severity_by_employee[employee_id] = severity_by_employee.get(employee_id, 0.0) + _incident_severity(row)

    mapping_score_by_department_id = {}
    for department_id, employee_ids in employee_ids_by_department_id.items():
        unique_employee_ids = set(employee_ids)
        mapping_score_by_department_id[department_id] = sum(
            severity_by_employee.get(employee_id, 0.0)
            for employee_id in unique_employee_ids
        )

    metrics_by_employee = _compute_percentile_metrics(officer_rows, compensation_rows, incident_rows)

    grouped = {}
    for row in district_join_rows:
        district_name = row.get("patrol_district")
        if not district_name:
            continue
        grouped.setdefault(district_name, []).append(row)
    departments = [
        _build_department_payload(
            name,
            rows,
            metrics_by_employee,
            mapping_score_by_department_id.get(_district_id_from_name(name), 0.0),
        )
        for name, rows in grouped.items()
    ]

    SESSION_CACHE["officers_by_employee"] = officers_by_employee
    SESSION_CACHE["district_by_employee"] = district_by_employee
    SESSION_CACHE["latest_comp_by_employee"] = latest_comp_by_employee
    SESSION_CACHE["incidents_by_employee"] = incidents_by_employee
    SESSION_CACHE["metrics_by_employee"] = metrics_by_employee
    SESSION_CACHE["departments"] = departments
    SESSION_CACHE["employee_ids_by_department_id"] = employee_ids_by_department_id
    SESSION_CACHE["initialized"] = True
    SESSION_CACHE["error"] = None


def _ensure_session_cache():
    if db is None:
        return False
    if SESSION_CACHE["initialized"]:
        return True
    try:
        _initialize_session_cache()
        return True
    except Exception as error:
        SESSION_CACHE["error"] = str(error)
        return False

@app.route('/api/time')
def get_current_time():
    return {'time': time.time()}


@app.route('/test')
def db_query():
    if db is None:
        return {"message": "Supabase not configured", "data": []}
    if not _ensure_session_cache():
        return {"message": "Failed to warm cache", "error": SESSION_CACHE["error"], "data": []}, 500
    sample = list(SESSION_CACHE["officers_by_employee"].values())[:20]
    return {"data": sample}

@app.route('/officers')
def get_officer_data():
    if db is None:
        return {"message": "Supabase not configured", "data": []}
    if not _ensure_session_cache():
        return {"message": "Failed to warm cache", "error": SESSION_CACHE["error"], "data": []}, 500
    employee_id = request.args.get('employee_id')
    if not employee_id:
        return {"message": "employee_id query param is required", "data": []}, 400
    try:
        employee_id_int = int(employee_id)
    except ValueError:
        return {"message": "employee_id must be numeric", "data": []}, 400
    officer = SESSION_CACHE["officers_by_employee"].get(employee_id_int)
    response = [officer] if officer else []
    return {"message": response, "data": response}


@app.route("/api/officers/<int:employee_id>")
def get_officer_profile(employee_id):
    if db is None:
        return {"message": "Supabase not configured", "data": None}, 503
    if not _ensure_session_cache():
        return {"message": "Failed to warm cache", "error": SESSION_CACHE["error"], "data": None}, 500

    officer_data = SESSION_CACHE["officers_by_employee"].get(employee_id)
    if not officer_data:
        return {"message": "Officer not found", "data": None}, 404
    department_data = SESSION_CACHE["district_by_employee"].get(employee_id)
    compensation_data = SESSION_CACHE["latest_comp_by_employee"].get(employee_id)
    percentile_metrics = SESSION_CACHE["metrics_by_employee"].get(
        employee_id,
        {
            "overtime_pay_total": 0.0,
            "overtime_to_base_pct": 0.0,
            "complaints_total": 0,
            "overtime_ratio_percentile": None,
            "complaints_percentile": None,
        },
    )

    return {
        "data": {
            "officer": officer_data,
            "district": department_data,
            "latest_compensation": compensation_data,
            "metrics": {
                "overtime_hours_logged": None,
                "overtime_pay_total": percentile_metrics["overtime_pay_total"],
                "overtime_to_base_pct": percentile_metrics["overtime_to_base_pct"],
                "complaints_total": percentile_metrics["complaints_total"],
                "overtime_ratio_percentile": percentile_metrics["overtime_ratio_percentile"],
                "complaints_percentile": percentile_metrics["complaints_percentile"],
            },
        }
    }

@app.route('/departments/incidents')
def get_all_departments_and_officers():
    if db is None:
        return {"message": "Supabase not configured", "data": []}, 503
    if not _ensure_session_cache():
        return {"message": "Failed to warm cache", "error": SESSION_CACHE["error"], "data": []}, 500
    districts = SESSION_CACHE["departments"]
    return {"message": districts, "data": districts}


@app.route('/departments/severity')
def get_all_departments_and_severity():
    if db is None:
        return {"message": "Supabase not configured", "data": []}, 503
    if not _ensure_session_cache():
        return {"message": "Failed to warm cache", "error": SESSION_CACHE["error"], "data": []}, 500
    districts = SESSION_CACHE["departments"]
    return {"message": districts, "data": districts}


@app.route("/departments/incidents/<department_id>")
def get_incidents_by_department(department_id):
    if db is None:
        return {"message": "Supabase not configured", "data": []}, 503
    if not _ensure_session_cache():
        return {"message": "Failed to warm cache", "error": SESSION_CACHE["error"], "data": []}, 500
    matching_employee_ids = SESSION_CACHE["employee_ids_by_department_id"].get(department_id, [])

    if not matching_employee_ids:
        return {"data": [], "meta": {"department_id": department_id, "count": 0}}

    incidents = []
    for employee_id in matching_employee_ids:
        incidents.extend(SESSION_CACHE["incidents_by_employee"].get(employee_id, []))
    return {
        "data": incidents,
        "meta": {"department_id": department_id, "count": len(incidents)},
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
        if not _ensure_session_cache():
            return {"message": "Failed to warm cache", "error": SESSION_CACHE["error"], "data": []}, 500
        source = "supabase-cache"
        departments = SESSION_CACHE["departments"]

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


if db is not None and not SESSION_CACHE["initialized"]:
    try:
        _initialize_session_cache()
    except Exception as error:
        SESSION_CACHE["error"] = str(error)
