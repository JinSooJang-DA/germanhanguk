export type WithdrawalMode = "preserve" | "remove";

export function parseWithdrawalRequest(value: unknown): WithdrawalMode | null {
  if (!value || typeof value !== "object") return null;
  const body = value as Record<string, unknown>;
  if (Object.keys(body).some((key) => key !== "mode" && key !== "confirmation")) return null;
  if (body.confirmation !== "WITHDRAW") return null;
  return body.mode === "preserve" || body.mode === "remove" ? body.mode : null;
}
