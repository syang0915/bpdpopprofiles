type RankBadgeIconProps = {
  rank: string;
  className?: string;
};

function getRankEmoji(rank: string) {
  if (rank.includes("Superintendent") || rank === "Deputy" || rank === "Depsup") {
    return "🦅";
  }
  if (rank.includes("Detective")) {
    return "🕵️";
  }
  if (rank.includes("Lieutenant") || rank === "Lieut" || rank === "Captain" || rank === "Sergeant") {
    return "⭐";
  }
  return "👮";
}

export function RankBadgeIcon({ rank, className = "" }: RankBadgeIconProps) {
  const emoji = getRankEmoji(rank);

  return (
    <div
      className={`relative h-16 w-16 shrink-0 overflow-hidden rounded-full border border-cyan-200/45 bg-[#0a1433] shadow-[0_0_10px_rgba(56,189,248,0.34)] ${className}`}
    >
      <div className="flex h-full w-full items-center justify-center text-[1.9rem]">
        <span role="img" aria-label={`${rank} badge`}>
          {emoji}
        </span>
      </div>
    </div>
  );
}
