from google.genai import types
from api import agent_tools 


tools = [
    types.Tool(
        function_declarations=[
            types.FunctionDeclaration(
                name="get_officer_by_employee_id",
                description="Fetch a single officer record by employee id",
                parameters={
                    "type": "object",
                    "properties": {
                        "employee_id": {"type": "integer"}
                    },
                    "required": ["employee_id"],
                },
            ),
            types.FunctionDeclaration(
                name="list_officers",
                description="List officers with pagination",
                parameters={
                    "type": "object",
                    "properties": {
                        "limit": {"type": "integer", "minimum": 1},
                        "offset": {"type": "integer", "minimum": 0}
                    },
                },
            ),
            types.FunctionDeclaration(
                name="find_officers_by_name",
                description="Search officers by first or last name",
                parameters={
                    "type": "object",
                    "properties": {
                        "first_name": {"type": "string"},
                        "last_name": {"type": "string"},
                        "limit": {"type": "integer", "minimum": 1}
                    },
                },
            ),
            types.FunctionDeclaration(
                name="get_compensation_for_employee",
                description="Get compensation records for an employee",
                parameters={
                    "type": "object",
                    "properties": {
                        "employee_id": {"type": "integer"},
                        "year": {"type": "integer"}
                    },
                    "required": ["employee_id"],
                },
            ),
            types.FunctionDeclaration(
                name="get_compensation_by_year",
                description="Get compensation records for a given year",
                parameters={
                    "type": "object",
                    "properties": {
                        "year": {"type": "integer"},
                        "limit": {"type": "integer", "minimum": 1}
                    },
                    "required": ["year"],
                },
            ),
            types.FunctionDeclaration(
                name="get_incidents_for_employee",
                description="Get incidents linked to an employee",
                parameters={
                    "type": "object",
                    "properties": {
                        "employee_id": {"type": "integer"},
                        "limit": {"type": "integer", "minimum": 1}
                    },
                    "required": ["employee_id"],
                },
            ),
            types.FunctionDeclaration(
                name="get_incidents_by_year",
                description="Get incidents for a specific year",
                parameters={
                    "type": "object",
                    "properties": {
                        "year": {"type": "integer"},
                        "limit": {"type": "integer", "minimum": 1}
                    },
                    "required": ["year"],
                },
            ),
            types.FunctionDeclaration(
                name="list_departments",
                description="List department records",
                parameters={
                    "type": "object",
                    "properties": {
                        "limit": {"type": "integer", "minimum": 1}
                    },
                },
            ),
            types.FunctionDeclaration(
                name="get_department_by_employee_id",
                description="Fetch department record by employee id",
                parameters={
                    "type": "object",
                    "properties": {
                        "employee_id": {"type": "integer"}
                    },
                    "required": ["employee_id"],
                },
            ),
            types.FunctionDeclaration(
                name="get_officer_profile",
                description="Fetch an officer with compensation, incidents, and department",
                parameters={
                    "type": "object",
                    "properties": {
                        "employee_id": {"type": "integer"}
                    },
                    "required": ["employee_id"],
                },
            ),
        ]
    )
]


TOOL_FUNCTIONS = {
    "get_officer_by_employee_id": agent_tools.get_officer_by_employee_id,
    "list_officers": agent_tools.list_officers,
    "find_officers_by_name": agent_tools.find_officers_by_name,
    "get_compensation_for_employee": agent_tools.get_compensation_for_employee,
    "get_compensation_by_year": agent_tools.get_compensation_by_year,
    "get_incidents_for_employee": agent_tools.get_incidents_for_employee,
    "get_incidents_by_year": agent_tools.get_incidents_by_year,
    "list_departments": agent_tools.list_departments,
    "get_department_by_employee_id": agent_tools.get_department_by_employee_id,
    "get_officer_profile": agent_tools.get_officer_profile,
}
