import assert from "node:assert/strict";
import { hasCommunityIdentity, isValidCommunityName } from "../lib/communityProfile";

const user = { id: "12345678-abcd", email: "member@example.com", user_metadata: {} };
const profile = { display_name: "Community Nick", region: null };
for (const invalid of ["", "  ", "a", "x".repeat(31), "ab\ncd"]) {
  assert.equal(isValidCommunityName(invalid), false);
  assert.equal(hasCommunityIdentity({ ...user, user_metadata: { community_profile_completed: true } }, { display_name: invalid }), false);
}
assert.equal(isValidCommunityName(" 한국어 "), true);
assert.equal(hasCommunityIdentity(user, null), false);
assert.equal(hasCommunityIdentity({ ...user, user_metadata: { community_profile_completed: false } }, profile), false);
assert.equal(hasCommunityIdentity({ ...user, user_metadata: { community_profile_completed: true } }, profile), true);
assert.equal(hasCommunityIdentity(user, { display_name: "member" }), false);
const google = { ...user, user_metadata: { full_name: "Real Name" } };
assert.equal(hasCommunityIdentity(google, { display_name: "Real Name" }), false);
assert.equal(hasCommunityIdentity(google, { display_name: "member" }), false);
assert.equal(hasCommunityIdentity({ ...google, user_metadata: { full_name: "Real Name", name: "Other Provider Name" } }, { display_name: "Other Provider Name" }), false);
assert.equal(hasCommunityIdentity({ ...user, email: undefined }, { display_name: "회원-12345678" }), false);
assert.equal(hasCommunityIdentity({ ...user, user_metadata: { display_name: " ", full_name: "Real Name" } }, { display_name: "Real Name" }), false);
assert.equal(hasCommunityIdentity({ ...google, user_metadata: { ...google.user_metadata, community_profile_completed: false, display_name: "Old Nick" } }, { ...profile, region: "Berlin" }), false);
assert.equal(isValidCommunityName("ab"), true);
assert.equal(isValidCommunityName("x".repeat(30)), true);
assert.equal(hasCommunityIdentity(google, profile), true);
assert.equal(hasCommunityIdentity(google, { display_name: "Real Name", region: "Berlin" }), true);
assert.equal(hasCommunityIdentity({ ...user, user_metadata: { display_name: "member" } }, { display_name: "member" }), true);
assert.equal(hasCommunityIdentity({ ...google, user_metadata: { ...google.user_metadata, community_profile_completed: true } }, { display_name: "Real Name" }), true);
assert.equal(hasCommunityIdentity({ ...google, app_metadata: { provider: "google" }, user_metadata: { display_name: "Real Name" } }, { display_name: "Real Name" }), false);
console.log("Community profile assertions passed.");
