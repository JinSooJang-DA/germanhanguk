/** Profiles are the source of truth; snapshots support deleted/unavailable authors. */
export function resolveAuthorName(
  authorId: string | null | undefined,
  snapshot: string,
  names: Record<string, string | null | undefined>,
): string {
  return (authorId && names[authorId]?.trim()) || snapshot;
}
