// Empreinte navigateur anonyme et stable (localStorage).
const KEY = "ptw_user_fingerprint";

export function getFingerprint(): string {
  try {
    const existing = window.localStorage.getItem(KEY);
    if (existing) return existing;
    const value =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `fp-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    window.localStorage.setItem(KEY, value);
    return value;
  } catch {
    return "anonyme";
  }
}
