import type { PoliceDepartment } from "@/components/map/police-department-marker";

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? "http://127.0.0.1:5000";

type DepartmentsResponse = {
  data: PoliceDepartment[];
};

type OfficerRecord = {
  employee_id: number;
  first_name: string | null;
  last_name: string | null;
  rank: string | null;
  zip_code: string | null;
};

type OfficerDistrictRecord = {
  patrol_district: string | null;
  name: string | null;
  total_incidents: number | null;
};

type OfficerCompensationRecord = {
  year: number | null;
  total_pay: number | null;
  regular_pay: string | null;
  ot_pay: string | null;
  other_pay: string | null;
};

export type OfficerProfileResponse = {
  data: {
    officer: OfficerRecord;
    district: OfficerDistrictRecord | null;
    latest_compensation: OfficerCompensationRecord | null;
    metrics: {
      overtime_hours_logged: number | null;
      overtime_pay_total: number | null;
      overtime_to_base_pct: number | null;
      complaints_total: number | null;
      overtime_ratio_percentile: number | null;
      complaints_percentile: number | null;
    } | null;
  };
};

export function parseEmployeeId(value: string | undefined) {
  if (!value) {
    return null;
  }
  const digitsOnly = value.match(/\d+/)?.[0];
  if (!digitsOnly) {
    return null;
  }
  const parsed = Number(digitsOnly);
  return Number.isFinite(parsed) ? parsed : null;
}

export async function fetchPoliceDepartments(query?: {
  districtId?: string;
  search?: string;
  limit?: number;
  delayMs?: number;
}) {
  const endpoint = new URL("/api/departments", API_BASE_URL);

  if (query?.districtId) {
    endpoint.searchParams.set("district_id", query.districtId);
  }
  if (query?.search) {
    endpoint.searchParams.set("q", query.search);
  }
  if (query?.limit) {
    endpoint.searchParams.set("limit", String(query.limit));
  }
  if (query?.delayMs !== undefined) {
    endpoint.searchParams.set("delay_ms", String(query.delayMs));
  }

  const response = await fetch(endpoint.toString());
  if (!response.ok) {
    throw new Error(`Failed to fetch departments (${response.status})`);
  }

  const body = (await response.json()) as DepartmentsResponse;
  return body.data ?? [];
}

export async function fetchOfficerProfile(officerId: string) {
  const employeeId = parseEmployeeId(officerId);
  if (!employeeId) {
    return null;
  }

  const endpoint = new URL(`/api/officers/${employeeId}`, API_BASE_URL);
  const response = await fetch(endpoint.toString());
  if (!response.ok) {
    if (response.status === 404) {
      return null;
    }
    throw new Error(`Failed to fetch officer profile (${response.status})`);
  }

  const body = (await response.json()) as OfficerProfileResponse;
  return body.data ?? null;
}
