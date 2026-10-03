import assert from "node:assert/strict";
import { resolveAuthorName } from "../lib/authorName";

const profiles = { owner: " 현재 이름 ", other: "다른 회원", blank: "  " };
// The same resolution applies to posts, root comments, and nested replies.
for (const snapshot of ["Old post name", "Old comment name", "Old reply name"]) {
  assert.equal(resolveAuthorName("owner", snapshot, profiles), "현재 이름");
  assert.equal(resolveAuthorName("other", snapshot, profiles), "다른 회원");
  assert.equal(resolveAuthorName("missing", snapshot, profiles), snapshot);
  assert.equal(resolveAuthorName(null, snapshot, profiles), snapshot);
  assert.equal(resolveAuthorName("blank", snapshot, profiles), snapshot);
}
console.log("Author name assertions passed.");
