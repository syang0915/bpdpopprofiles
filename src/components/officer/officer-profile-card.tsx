import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { buildOfficerProfile } from "@/lib/officer-profile";
import { fetchOfficerProfile, parseEmployeeId } from "@/lib/api";
import { RankBadgeIcon } from "@/components/officer/rank-badge-icon";

type OfficerProfileCardProps = {
  officerId: string;
  officerName?: string;
  officerRank?: string | null;
  complaintsPercentile?: number | null;
  overtimePercentile?: number | null;
  district?: string;
  showOpenProfileLink?: boolean;
  className?: string;
};

export function OfficerProfileCard({
  officerId,
  officerName,
  officerRank,
  district,
  showOpenProfileLink = true,
  className = "",
}: OfficerProfileCardProps) {
  const profile = buildOfficerProfile(officerId);
  const [liveOfficerName, setLiveOfficerName] = useState<string | null>(null);
  const [liveOfficerRank, setLiveOfficerRank] = useState<string | null>(null);
  const employeeId = parseEmployeeId(officerId);

  useEffect(() => {
    let isCancelled = false;
    async function loadOfficer() {
      try {
        const data = await fetchOfficerProfile(officerId);
        if (isCancelled || !data) {
          return;
        }
        const firstName = data.officer.first_name?.trim() ?? "";
        const lastName = data.officer.last_name?.trim() ?? "";
        const fullName = `${firstName} ${lastName}`.trim();
        if (fullName) {
          setLiveOfficerName(fullName);
        }
        const rank = data.officer.rank?.trim() ?? "";
        if (rank) {
          setLiveOfficerRank(rank);
        }
      } catch {
        // Keep mock profile visuals if live API is unavailable.
      }
    }
    void loadOfficer();
    return () => {
      isCancelled = true;
    };
  }, [officerId]);

  const displayName = liveOfficerName ?? officerName ?? "Officer";
  const displayBadgeId = employeeId ? `EMP-${employeeId}` : profile.badgeId;
  const displayRank = liveOfficerRank ?? officerRank ?? "Unknown";

  return (
    <article
      className={`rounded-lg border border-blue-300/30 bg-[#101b45]/86 p-4 shadow-[0_0_9px_rgba(59,130,246,0.28)] ${className}`}
    >
      <div className="flex items-start gap-3">
        <RankBadgeIcon rank={displayRank} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-base font-semibold text-[#e0ecff]">{displayName}</p>
          <p className="text-xs text-[#b8c9eb]">Rank: {displayRank}</p>
          <p className="text-xs text-[#b8c9eb]">Badge ID: {displayBadgeId}</p>
        </div>
      </div>

      {showOpenProfileLink ? (
        <Link
          to={`/officer/${officerId}?name=${encodeURIComponent(displayName)}${
            district ? `&district=${encodeURIComponent(district)}` : ""
          }`}
          className="mt-3 inline-flex rounded-md border border-cyan-300/40 bg-[#122359]/90 px-3 py-1.5 text-xs uppercase tracking-[0.1em] text-[#d7e7ff] transition-colors hover:bg-[#1a2f75]"
        >
          Open full profile + chat
        </Link>
      ) : null}
    </article>
  );
}
