from dataclasses import dataclass
from typing import Optional

@dataclass
class OfficerReal:
    employee_id: int  # PK
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    zip_code: Optional[str] = None
    rank: Optional[str] = None


@dataclass
class Compensation:
    employee_id: int  # PK (composite)
    year: int        # PK (composite)
    regular_pay: Optional[str] = None
    retro_pay: Optional[str] = None
    other_pay: Optional[str] = None
    ot_pay: Optional[str] = None
    injured_pay: Optional[str] = None
    detail_pay: Optional[str] = None
    quinn_pay: Optional[str] = None
    total_pay: Optional[float] = None


@dataclass
class Incident:
    incident_id: int  # PK
    Unnamed_0: Optional[str] = None
    inc_IA_no: Optional[str] = None
    inc_incident_type: Optional[str] = None
    inc_received_date: Optional[str] = None
    inc_occurred_date: Optional[str] = None
    offSnp_title_rank: Optional[str] = None
    off_first_name: Optional[str] = None
    off_last_name: Optional[str] = None
    alg_allegation: Optional[str] = None
    alg_finding: Optional[str] = None
    act_action_taken: Optional[str] = None
    act_days_hours_suspended: Optional[str] = None
    act_action_taken_date: Optional[str] = None
    first_name: Optional[str] = None
    middle_initial: Optional[str] = None
    incident_year: Optional[int] = None
    full_name: Optional[str] = None
    Employee_ID: Optional[int] = None
    employee_id_text: Optional[str] = None
    first_name_dup: Optional[str] = None
    last_name_dup: Optional[str] = None
    zip_code: Optional[str] = None


@dataclass
class Department:
    Employee_ID: int  # PK
    unit: Optional[str] = None