// Codes anglais normalisés stockés en base pour les trois champs à liste :
// Historique piano (maintenance), Intensité d'usage (usage), Vous êtes (who).
// L'interface affiche les libellés FR/EN ; le stockage reste 100 % anglais.

export const MAINTENANCE_CODES = [
  "Standard",
  "Custom regulations",
  "Major modifications",
] as const;

export const USAGE_CODES = ["Low", "Medium", "Intensive"] as const;

export const WHO_PRO = "Pro";
export const WHO_PRIVATE = "Private";
export const WHO_CODES = [WHO_PRO, WHO_PRIVATE] as const;

export const MAINTENANCE_LABELS_EN: Record<string, string> = {
  Standard: "Routine maintenance",
  "Custom regulations": "Custom regulations",
  "Major modifications": "Major modifications",
};

export const MAINTENANCE_LABELS_FR: Record<string, string> = {
  Standard: "Entretien usuel",
  "Custom regulations": "Réglages personnalisés",
  "Major modifications": "Modifications importantes",
};

export const USAGE_LABELS_EN: Record<string, string> = {
  Low: "Low",
  Medium: "Medium",
  Intensive: "Intensive",
};

export const USAGE_LABELS_FR: Record<string, string> = {
  Low: "Faible",
  Medium: "Moyenne",
  Intensive: "Intensive",
};

export const WHO_LABELS_EN: Record<string, string> = {
  Pro: "Technician / Piano builder",
  Private: "Pianist / Private owner",
};

export const WHO_LABELS_FR: Record<string, string> = {
  Pro: "Technicien / Facteur de pianos",
  Private: "Pianiste / Particulier",
};

const clean = (raw: string | null | undefined) =>
  String(raw ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();

/** Ramène tout libellé (FR hérité ou EN) vers le code anglais d'entretien. */
export function normalizeMaintenanceCode(raw: string | null | undefined): string {
  const s = clean(raw);
  if (!s) return "";
  if (s.includes("major") || s.includes("modification")) return "Major modifications";
  if (s.includes("custom") || s.includes("personnalis") || s.includes("reglage")) {
    return "Custom regulations";
  }
  if (s.includes("standard") || s.includes("routine") || s.includes("usuel") || s.includes("entretien")) {
    return "Standard";
  }
  return "";
}

/** Ramène tout libellé vers le code anglais d'intensité d'usage. */
export function normalizeUsageCode(raw: string | null | undefined): string {
  const s = clean(raw);
  if (!s) return "";
  if (s.startsWith("low") || s.includes("faible")) return "Low";
  if (s.startsWith("medium") || s.includes("moyen")) return "Medium";
  if (s.startsWith("intensive") || s.includes("intensif") || s.includes("eleve")) return "Intensive";
  return "";
}

/** Ramène tout libellé vers le code anglais de profil utilisateur. */
export function normalizeWhoCode(raw: string | null | undefined): string {
  const s = clean(raw);
  if (!s) return "";
  if (s.includes("techni") || s.includes("facteur") || s.includes("pro")) return WHO_PRO;
  if (s.includes("private") || s.includes("particulier") || s.includes("pianist")) return WHO_PRIVATE;
  return "";
}
