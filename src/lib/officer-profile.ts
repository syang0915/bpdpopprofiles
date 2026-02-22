export type OfficerProfile = {
  id: string;
  name: string;
  badgeId: string;
  sex: string;
  race: string;
  rank: string;
  complaintsPercentile: number;
  overtimePercentile: number;
};

const SEXES = ["Male", "Female"] as const;
const RACES = ["Black", "White", "Hispanic", "Asian", "Multiracial"] as const;
const RANKS = [
  "Sergeant Detective",
  "Police Officer",
  "Detective",
  "Sergeant",
  "Lieutenant",
  "Lieutenantenant Detective",
  "Lieutenantenant",
  "Superintendent",
  "Captain",
  "Lieutenant Detective",
  "Lieut",
  "Depsup",
  "Deputy",
] as const;

function hashString(value: string) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }
  return hash;
}

export function formatOfficerName(officerId: string | undefined) {
  if (!officerId) {
    return "Officer";
  }
  return officerId
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export function buildOfficerProfile(officerId: string | undefined): OfficerProfile {
  const normalizedOfficerId = officerId ?? "officer";
  const name = formatOfficerName(normalizedOfficerId);
  const officerHash = hashString(normalizedOfficerId);
  const badgeId = `BPD-${1000 + (officerHash % 9000)}`;
  const sex = SEXES[officerHash % SEXES.length];
  const race = RACES[(officerHash >>> 4) % RACES.length];
  const rank = RANKS[(officerHash >>> 8) % RANKS.length];
  const complaintsPercentile = Number((((officerHash >>> 12) % 1000) / 10).toFixed(1));
  const overtimePercentile = Number((((officerHash >>> 17) % 1000) / 10).toFixed(1));

  return {
    id: normalizedOfficerId,
    name,
    badgeId,
    sex,
    race,
    rank,
    complaintsPercentile,
    overtimePercentile,
  };
}
