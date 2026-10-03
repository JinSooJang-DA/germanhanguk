import assert from "node:assert/strict";
import { getBerlinArticleAutomationSlot } from "../lib/articles/automation/schedule";

const summerMorning = getBerlinArticleAutomationSlot(new Date("2026-07-01T06:15:00Z"));
assert.deepEqual(summerMorning, { localDate: "2026-07-01", localHour: 8, slotKey: "2026-07-01:08" });

const winterMorning = getBerlinArticleAutomationSlot(new Date("2026-12-01T07:15:00Z"));
assert.deepEqual(winterMorning, { localDate: "2026-12-01", localHour: 8, slotKey: "2026-12-01:08" });

const summerEvening = getBerlinArticleAutomationSlot(new Date("2026-07-01T17:30:00Z"));
assert.equal(summerEvening?.slotKey, "2026-07-01:19");

const winterEvening = getBerlinArticleAutomationSlot(new Date("2026-12-01T18:30:00Z"));
assert.equal(winterEvening?.slotKey, "2026-12-01:19");

assert.equal(getBerlinArticleAutomationSlot(new Date("2026-07-01T07:15:00Z")), null);
assert.equal(getBerlinArticleAutomationSlot(new Date("2026-12-01T06:15:00Z")), null);
console.log("article automation schedule checks passed");
