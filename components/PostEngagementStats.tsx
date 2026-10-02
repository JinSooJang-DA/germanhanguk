type IconProps = { className?: string };

export function EyeIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" />
      <circle cx="12" cy="12" r="2.75" />
    </svg>
  );
}

export function HeartIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M20.8 4.8a5.5 5.5 0 0 0-7.8 0L12 5.9l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.4a5.5 5.5 0 0 0 0-7.8Z" />
    </svg>
  );
}

type PostEngagementStatsProps = {
  views: number;
  likes: number;
  className?: string;
};

export default function PostEngagementStats({ views, likes, className = "" }: PostEngagementStatsProps) {
  return (
    <span className={`post-engagement-stats ${className}`.trim()} aria-label={`조회 ${views}, 좋아요 ${likes}`}>
      <span className="post-engagement-stat"><EyeIcon /><span>{views}</span></span>
      <span className="post-engagement-stat"><HeartIcon /><span>{likes}</span></span>
    </span>
  );
}
