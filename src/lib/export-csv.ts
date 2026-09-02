// Génération du fichier CSV local (métadonnées + 88 lignes de pesées).
export type ExportMeta = Record<string, string>;
export type ExportRow = { wa: string; wd: string };

const cell = (value: string) => {
  const v = value ?? "";
  return /[";\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
};

const line = (values: string[]) => values.map(cell).join(";");

export function computeRow(r: ExportRow) {
  const wa = Number(r.wa);
  const wd = Number(r.wd);
  if (!r.wa || !r.wd || !Number.isFinite(wa) || !Number.isFinite(wd)) {
    return { friction: "", balance: "" };
  }
  return {
    friction: Math.abs((wa - wd) / 2).toFixed(1),
    balance: ((wd + wa) / 2).toFixed(1),
  };
}

export function buildCsv(meta: ExportMeta, rows: ExportRow[]): string {
  const lines: string[] = [];
  for (const [label, value] of Object.entries(meta)) {
    lines.push(line([label, value ?? ""]));
  }
  lines.push("");
  lines.push(line(["Touche", "Wa (g)", "Wd (g)", "Friction (g)", "Balance (g)"]));
  for (let i = 0; i < 88; i++) {
    const r = rows[i] ?? { wa: "", wd: "" };
    const { friction, balance } = computeRow(r);
    lines.push(line([String(i + 1), r.wa ?? "", r.wd ?? "", friction, balance]));
  }
  return lines.join("\r\n");
}

export function downloadCsv(filename: string, content: string): void {
  const blob = new Blob(["\uFEFF" + content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

const FILENAME_UNSAFE = /[^a-zA-Z0-9_-]/g;

function removeAccents(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

/**
 * Normalise un segment du nom de fichier : majuscules, tirets à la place des espaces,
 * sans accents, sans caractères spéciaux. Retourne "INCONNU" si la valeur est vide.
 */
export function normalizeFilenameSegment(value: string | undefined | null): string {
  const v = (value ?? "").trim();
  if (!v) return "INCONNU";
  return removeAccents(v)
    .replace(/&/g, "-")
    .replace(/\s+/g, "-")
    .replace(FILENAME_UNSAFE, "")
    .replace(/-+/g, "-")
    .toUpperCase();
}

const pad2 = (n: number) => String(n).padStart(2, "0");

/** Date locale au format AAAA-MM-JJ. */
export function formatLocalDate(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

/** Date + heure locales au format AAAA-MM-JJ HH:MM. */
export function formatLocalDateTime(d: Date): string {
  return `${formatLocalDate(d)} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

/**
 * Construit le nom de fichier d'export (CSV ou PDF) à partir des métadonnées.
 * Format strict : MARQUE_MODELE_NUMEROSERIE_AAAA-MM-JJ_HHMM.<ext>
 */
export function buildExportFilename(
  marque: string | undefined | null,
  modele: string | undefined | null,
  numeroSerie: string | undefined | null,
  date: Date | string | undefined | null,
  extension: "csv" | "pdf" = "csv",
): string {
  const brand = normalizeFilenameSegment(marque);
  const model = normalizeFilenameSegment(modele);
  const serial = normalizeFilenameSegment(numeroSerie);
  const parsed = date ? new Date(date) : new Date();
  const d = Number.isNaN(parsed.getTime()) ? new Date() : parsed;
  const stamp = `${formatLocalDate(d)}_${pad2(d.getHours())}${pad2(d.getMinutes())}`;
  return `${brand}_${model}_${serial}_${stamp}.${extension}`;
}

