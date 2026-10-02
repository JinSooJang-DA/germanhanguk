import { supabase } from "@/lib/supabase";
import { COMMUNITY_REPUTATION_ENABLED } from "@/lib/communityReputation";

export type PublicCommunityIdentity = {
  user_id: string;
  reputation_xp: number | null;
  tenure_value: number | null;
  tenure_unit: string | null;
  show_community_level: boolean;
  show_germany_tenure: boolean;
};

export type PublicCommunityIdentityMap = Record<string, PublicCommunityIdentity>;

export async function fetchPublicCommunityIdentities(userIds: Array<string | null | undefined>): Promise<PublicCommunityIdentityMap> {
  if (!COMMUNITY_REPUTATION_ENABLED) return {};
  const uniqueIds = Array.from(new Set(userIds.filter((id): id is string => Boolean(id))));
  if (uniqueIds.length === 0) return {};

  const { data, error } = await supabase.rpc("get_public_community_identities", { p_user_ids: uniqueIds });
  if (error) {
    console.error("Community identity batch load error:", error);
    return {};
  }

  return ((data || []) as PublicCommunityIdentity[]).reduce<PublicCommunityIdentityMap>((map, item) => {
    map[item.user_id] = item;
    return map;
  }, {});
}