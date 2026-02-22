export interface Misconduct {
  type: string;
  date: string;
  severityScore: number; // 1-10 scale
}

export interface Officer {
  id: string;
  name: string;
  rank: "Officer" | "Sergeant" | "Detective" | "Lieutenant" | "Captain";
  districtId: string;
  misconductHistory: Misconduct[];
  totalSeverityScore: number;
}

export interface District {
  id: string;
  name: string;
  neighborhoods: string[];
  aggregateScore: number; // Derived from officers in this district
  geojson: any; // GeoJSON geometry
}
