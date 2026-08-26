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
    friction: ((wd - wa) / 2).toFixed(1),
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
