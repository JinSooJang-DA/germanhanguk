import assert from "node:assert/strict";
import { parseWithdrawalRequest } from "../lib/withdrawal";

for (const mode of ["preserve", "remove"] as const) {
  assert.equal(parseWithdrawalRequest({ mode, confirmation: "WITHDRAW" }), mode);
  assert.equal(parseWithdrawalRequest({ mode, confirmation: "WITHDRAW", userId: "victim" }), null);
  assert.equal(parseWithdrawalRequest({ mode, confirmation: "withdraw" }), null);
}
for (const value of [null, [], "remove", {}, { mode: "delete", confirmation: "WITHDRAW" }]) {
  assert.equal(parseWithdrawalRequest(value), null);
}
console.log("Withdrawal confirmation and target-injection assertions passed.");
