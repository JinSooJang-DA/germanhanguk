export type WithdrawalMode = "preserve" | "remove";
export const WITHDRAWAL_CONFIRMATION = "Germanhanguk";

export function parseWithdrawalRequest(value: unknown): WithdrawalMode | null {
  if (!value || typeof value !== "object") return null;
  const body = value as Record<string, unknown>;
  if (Object.keys(body).some((key) => key !== "mode" && key !== "confirmation")) return null;
  if (body.confirmation !== WITHDRAWAL_CONFIRMATION) return null;
  return body.mode === "preserve" || body.mode === "remove" ? body.mode : null;
}
