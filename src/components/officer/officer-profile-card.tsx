import { Link } from "react-router-dom";

import { buildOfficerProfile } from "@/lib/officer-profile";
import { RankBadgeIcon } from "@/components/officer/rank-badge-icon";

type OfficerProfileCardProps = {
  officerId: string;
  district?: string;
  showOpenProfileLink?: boolean;
  className?: string;
};

export function OfficerProfileCard({
  officerId,
  district,
  showOpenProfileLink = true,
  className = "",
}: OfficerProfileCardProps) {
  const profile = buildOfficerProfile(officerId);

  return (
    <article
      className={`rounded-lg border border-blue-300/30 bg-[#101b45]/86 p-4 shadow-[0_0_9px_rgba(59,130,246,0.28)] ${className}`}
    >
      <div className="flex items-start gap-3">
        <RankBadgeIcon rank={profile.rank} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-base font-semibold text-[#e0ecff]">{profile.name}</p>
          <p className="text-xs text-[#b8c9eb]">Badge ID: {profile.badgeId}</p>
          <p className="text-xs text-[#b8c9eb]">{`${profile.rank} • ${profile.sex}, ${profile.race}`}</p>
          {district ? <p className="mt-1 text-xs text-[#9fb6e8]">{district}</p> : null}
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 text-[11px]">
        <div className="rounded border border-cyan-300/20 bg-[#0a1433]/80 px-2 py-1 text-[#b9cff7]">
          Complaints: <span className="text-[#e3f2ff]">{profile.complaintsPercentile.toFixed(1)}</span>
        </div>
        <div className="rounded border border-fuchsia-300/20 bg-[#0a1433]/80 px-2 py-1 text-[#cbc2f2]">
          Overtime: <span className="text-[#f0e8ff]">{profile.overtimePercentile.toFixed(1)}</span>
        </div>
      </div>

      {showOpenProfileLink ? (
        <Link
          to={`/officer/${officerId}${district ? `?district=${encodeURIComponent(district)}` : ""}`}
          className="mt-3 inline-flex rounded-md border border-cyan-300/40 bg-[#122359]/90 px-3 py-1.5 text-xs uppercase tracking-[0.1em] text-[#d7e7ff] transition-colors hover:bg-[#1a2f75]"
        >
          Open full profile + chat
        </Link>
      ) : null}
    </article>
  );
}
