import { formatGermanyTenure, getCommunityLevel } from "@/lib/communityReputation";

type Props = {
  xp?: number | null;
  germanySince?: string | null;
  showLevel?: boolean;
  showTenure?: boolean;
  compact?: boolean;
};

export default function CommunityIdentity({
  xp,
  germanySince,
  showLevel = true,
  showTenure = false,
  compact = false,
}: Props) {
  const level = getCommunityLevel(xp);
  const tenure = showTenure ? formatGermanyTenure(germanySince) : null;
  if (!showLevel && !tenure) return null;

  return (
    <span className={`community-identity${compact ? " community-identity--compact" : ""}`}>
      {showLevel && <span className="community-identity__level">{level.icon} {level.label}</span>}
      {showLevel && tenure && <span className="community-identity__dot" aria-hidden="true">·</span>}
      {tenure && <span className="community-identity__tenure">🇩🇪 {tenure.replace("독일생활 ", "")}</span>}
    </span>
  );
}