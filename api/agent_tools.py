import os
import re
from dataclasses import fields
from typing import Any, Callable, Dict, Iterable, List, Optional, Sequence, Type, TypeVar

from supabase import Client, create_client

from api.types import Compensation, Department, Incident, OfficerReal

T = TypeVar("T")

SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY")

_DEFAULT_EMPLOYEE_ID_COLUMNS: Dict[str, Sequence[str]] = {
    "officers": ("employee_id", "Employee ID", "Employee_ID"),
    "compensation": ("employee_id", "Employee ID", "Employee_ID"),
    "incidents": ("employee_id", "Employee_ID", "Employee ID"),
    "department": ("employee_id", "Employee_ID", "Employee ID"),
}


def _get_supabase() -> Client:
    if not SUPABASE_URL or not SUPABASE_KEY:
        raise RuntimeError("SUPABASE_URL and SUPABASE_KEY must be set")
    return create_client(SUPABASE_URL, SUPABASE_KEY)


def _normalize_key(key: str) -> str:
    return re.sub(r"[^a-z0-9]+", "_", key.strip().lower()).strip("_")


def _row_to_dataclass(model: Type[T], row: Optional[Dict[str, Any]]) -> Optional[T]:
    if not row:
        return None

    normalized = {_normalize_key(k): v for k, v in row.items()}
    data: Dict[str, Any] = {}
    for f in fields(model):
        if f.name in row:
            data[f.name] = row[f.name]
            continue
        normalized_name = _normalize_key(f.name)
        if normalized_name in normalized:
            data[f.name] = normalized[normalized_name]
    return model(**data)


def _rows_to_dataclasses(model: Type[T], rows: Iterable[Dict[str, Any]]) -> List[T]:
    return [result for row in rows if (result := _row_to_dataclass(model, row))]


def _execute_with_column_fallback(
    query_factory: Callable[[], Any],
    columns: Sequence[str],
    value: Any,
):
    last_error = None
    for column in columns:
        response = query_factory().eq(column, value).execute()
        if response.error:
            last_error = response.error
            continue
        return response
    if last_error:
        raise RuntimeError(str(last_error))
    raise RuntimeError("No valid column found for query")


def get_officer_by_employee_id(employee_id: int) -> Optional[OfficerReal]:
    print('get_officer_by_employee_id called with employee_id:', employee_id)
    supabase = _get_supabase()
    response = _execute_with_column_fallback(
        lambda: supabase.table("officers_real").select("*"),
        _DEFAULT_EMPLOYEE_ID_COLUMNS["officers"],
        employee_id,
    )
    return _row_to_dataclass(OfficerReal, response.data)


def list_officers(limit: int = 50, offset: int = 0) -> List[OfficerReal]:
    print('list_officers called with limit:', limit, 'offset:', offset)

    supabase = _get_supabase()
    response = (
        supabase
        .table("officers")
        .select("*")
        .range(offset, max(offset, offset + limit - 1))
        .execute()
    )
    return _rows_to_dataclasses(OfficerReal, response.data or [])


def find_officers_by_name(
    first_name: Optional[str] = None,
    last_name: Optional[str] = None,
    limit: int = 50,
) -> List[OfficerReal]:
    print('find_officers_by_name called with first_name:', first_name, 'last_name:', last_name, 'limit:', limit)
    supabase = _get_supabase()
    query = supabase.table("officers").select("*")
    if first_name:
        query = query.ilike("first_name", f"%{first_name}%")
    if last_name:
        query = query.ilike("last_name", f"%{last_name}%")
    response = query.limit(limit).execute()
    return _rows_to_dataclasses(OfficerReal, response.data or [])


def get_compensation_for_employee(
    employee_id: int,
    year: Optional[int] = None,
) -> List[Compensation]:
    print('get_compensation_for_employee called with employee_id:', employee_id, 'year:', year)
    supabase = _get_supabase()
    response = _execute_with_column_fallback(
        lambda: supabase.table("compensation").select("*"),
        _DEFAULT_EMPLOYEE_ID_COLUMNS["compensation"],
        employee_id,
    )
    data = response.data or []
    if year is not None:
        data = [row for row in data if row.get("year") == year]
    return _rows_to_dataclasses(Compensation, data)


def get_compensation_by_year(year: int, limit: int = 200) -> List[Compensation]:
    print('get_compensation_by_year called with year:', year, 'limit:', limit)
    supabase = _get_supabase()
    response = (
        supabase
        .table("compensation")
        .select("*")
        .eq("year", year)
        .limit(limit)
        .execute()
    )
    return _rows_to_dataclasses(Compensation, response.data or [])


def get_incidents_for_employee(
    employee_id: int,
    limit: int = 100,
) -> List[Incident]:
    print('get_incidents_for_employee called with employee_id:', employee_id, 'limit:', limit)
    supabase = _get_supabase()
    response = _execute_with_column_fallback(
        lambda: supabase.table("incidents").select("*"),
        _DEFAULT_EMPLOYEE_ID_COLUMNS["incidents"],
        employee_id,
    )
    data = response.data or []
    return _rows_to_dataclasses(Incident, data[:limit])


def get_incidents_by_year(year: int, limit: int = 100) -> List[Incident]:
    print('get_incidents_by_year called with year:', year, 'limit:', limit)
    supabase = _get_supabase()
    response = (
        supabase
        .table("incidents")
        .select("*")
        .eq("incident_year", year)
        .limit(limit)
        .execute()
    )
    return _rows_to_dataclasses(Incident, response.data or [])


def list_departments(limit: int = 100) -> List[Department]:
    print('list_departments called with limit:', limit)
    supabase = _get_supabase()
    response = (
        supabase
        .table("department")
        .select("*")
        .limit(limit)
        .execute()
    )
    return _rows_to_dataclasses(Department, response.data or [])


def get_department_by_employee_id(employee_id: int) -> Optional[Department]:
    print('get_department_by_employee_id called with employee_id:', employee_id)
    supabase = _get_supabase()
    response = _execute_with_column_fallback(
        lambda: supabase.table("department").select("*"),
        _DEFAULT_EMPLOYEE_ID_COLUMNS["department"],
        employee_id,
    )
    return _row_to_dataclass(Department, response.data)


def get_officer_profile(employee_id: int) -> Dict[str, Any]:
    print('get_officer_profile called with employee_id:', employee_id)
    officer = get_officer_by_employee_id(employee_id)
    return {
        "officer": officer,
        "compensation": get_compensation_for_employee(employee_id),
        "incidents": get_incidents_for_employee(employee_id),
        "department": get_department_by_employee_id(employee_id),
    }