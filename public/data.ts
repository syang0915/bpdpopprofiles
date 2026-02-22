import { Officer, District } from "./types";

export const RANKS = [
  "Officer",
  "Sergeant",
  "Detective",
  "Lieutenant",
  "Captain",
];

export const MOCK_OFFICERS: Officer[] = [
  {
    id: "1",
    name: "John Doe",
    rank: "Sergeant",
    districtId: "A1",
    totalSeverityScore: 85,
    misconductHistory: [
      { type: "Excessive Force", date: "2023-11-12", severityScore: 9 },
    ],
  },
  {
    id: "2",
    name: "Jane Smith",
    rank: "Officer",
    districtId: "A1",
    totalSeverityScore: 40,
    misconductHistory: [
      { type: "Unprofessional Conduct", date: "2024-01-05", severityScore: 4 },
    ],
  },
  // Add more mock officers for different districts...
];

// Helper to get color based on severity score
export const getChoroplethColor = (score: number) => {
  return score > 80
    ? "#800026"
    : score > 60
    ? "#BD0026"
    : score > 40
    ? "#E31A1C"
    : score > 20
    ? "#FC4E2A"
    : "#FEB24C";
};
