type IdentityUser = { id: string; email?: string; user_metadata: Record<string, unknown>; app_metadata?: { provider?: string } };
type IdentityProfile = { display_name?: string | null; region?: string | null } | null;

export function isValidCommunityName(name: string): boolean {
  const trimmed = name.trim();
  return trimmed.length >= 2 && trimmed.length <= 30 && !/[\u0000-\u001f\u007f]/.test(trimmed);
}

export function hasCommunityIdentity(user: IdentityUser, profile: IdentityProfile): boolean {
  const name = profile?.display_name?.trim() || "";
  if (!isValidCommunityName(name)) return false;
  const completed = user.user_metadata.community_profile_completed;
  if (typeof completed === "boolean") return completed;
  // Legacy signup explicitly collected a nickname. Legacy social onboarding also
  // required residence; retain those members without making residence mandatory now.
  const legacyName = user.user_metadata.display_name;
  if ((user.app_metadata?.provider !== "google" && typeof legacyName === "string" && legacyName.trim()) || profile?.region?.trim()) return true;
  // The database trigger supplies provider names/email handles. They are not a
  // deliberate community identity. A customized legacy nickname remains valid.
  const generatedNames = ["display_name", "full_name", "name", "nickname", "preferred_username"]
    .map((key) => user.user_metadata[key])
    .filter((value): value is string => typeof value === "string")
    .map((value) => value.trim());
  // Different deployed trigger versions used either provider names or email handles.
  generatedNames.push(user.email?.split("@")[0] || "", `회원-${user.id.slice(0, 8)}`);
  return !generatedNames.includes(name);
}
