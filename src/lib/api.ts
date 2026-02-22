import type { PoliceDepartment } from "@/components/map/police-department-marker";

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? "http://127.0.0.1:5000";

type DepartmentsResponse = {
  data: PoliceDepartment[];
};

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
