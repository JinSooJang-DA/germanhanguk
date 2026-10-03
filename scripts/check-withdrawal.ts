import assert from "node:assert/strict";
import { parseWithdrawalRequest, WITHDRAWAL_CONFIRMATION } from "../lib/withdrawal";

for (const mode of ["preserve", "remove"] as const) {
  assert.equal(parseWithdrawalRequest({ mode, confirmation: "Germanhanguk" }), mode);
  assert.equal(parseWithdrawalRequest({ mode, confirmation: WITHDRAWAL_CONFIRMATION, userId: "victim" }), null);
  for (const confirmation of ["germanhanguk", "GermanHanguk", "GERMANHANGUK", "Germanhanguk ", " Germanhanguk", ""]) {
    assert.equal(parseWithdrawalRequest({ mode, confirmation }), null);
  }
}
for (const value of [null, [], "remove", {}, { mode: "delete", confirmation: WITHDRAWAL_CONFIRMATION }]) {
  assert.equal(parseWithdrawalRequest(value), null);
}
console.log("Withdrawal confirmation and target-injection assertions passed.");
