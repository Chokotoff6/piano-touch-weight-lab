// Carnet d'historique du piano : document A4 portrait autonome (jsPDF vectoriel),
// indépendant des exports Bilan / Analyse. N'affiche que des données réellement saisies.
import jsPDF from "jspdf";
import type { KwDocument, KwRow } from "@/lib/kw-file";
import { FACTORY_INTERVENTIONS, ANTECEDENT_ITEMS } from "@/lib/interventions";
import { parseAntecedents } from "@/lib/interventions";
import { parseAntecedentDates, parseCustomAntecedents } from "@/components/AntecedentsDialog";

const W = 210;
const H = 297;
const M = 15;

const num = (v: string | undefined) => {
  const n = Number(String(v ?? "").replace(",", "."));
  return String(v ?? "").trim() !== "" && Number.isFinite(n) ? n : null;
};

/** Moyennes Stanwood : wd = descendant, wa = remontant. */
export function historyAverages(rows: KwRow[]) {
  let d = 0, a = 0, n = 0, nd = 0, na = 0;
  rows.forEach((r) => {
    const wd = num(r.wd), wa = num(r.wa);
    if (wd !== null) { d += wd; nd++; }
    if (wa !== null) { a += wa; na++; }
    if (wd !== null || wa !== null) n++;
  });
  const pd = nd ? d / nd : null;
  const pr = na ? a / na : null;
  return {
    pd, pr,
    pe: pd !== null && pr !== null ? (pd + pr) / 2 : null,
    f: pd !== null && pr !== null ? (pd - pr) / 2 : null,
    count: n,
  };
}

const fmtDate = (iso: string, en: boolean) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString(en ? "en-GB" : "fr-FR");
};
const fmtMonth = (v: string) => {
  const [y, m] = v.split("-");
  return m ? `${m}/${y}` : y ?? "";
};

export function generateHistoryPdf(doc: KwDocument, info: Record<string, string>, en: boolean) {
  const pdf = new jsPDF({ orientation: "portrait", format: "a4", unit: "mm" });
  const g = (v: number | null) => (v === null ? "—" : `${v.toFixed(1).replace(".", en ? "." : ",")} g`);
  let y = M + 6;

  const section = (title: string) => {
    if (y > H - 40) { pdf.addPage(); y = M + 6; }
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(11);
    pdf.text(title, M, y);
    pdf.setLineWidth(0.3);
    pdf.line(M, y + 1.5, W - M, y + 1.5);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(9);
    y += 7;
  };

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(15);
  pdf.text(en ? "PIANO HISTORY" : "HISTORIQUE DU PIANO", W / 2, y, { align: "center" });
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9);
  pdf.text("KeyWeight", W / 2, y + 5, { align: "center" });
  y += 14;

  // 1. Fiche technique
  section(en ? "TECHNICAL SHEET" : "FICHE TECHNIQUE");
  const type = info["type_piano"] ?? "";
  const serial = [info["sn_prefix"], info["sn_num"], info["sn_suffix"]].map((s) => String(s ?? "").trim()).filter(Boolean).join("");
  const fields: [string, string][] = [
    [en ? "Brand" : "Marque", info["marque"] ?? ""],
    [en ? "Model" : "Modèle", info["modele"] ?? ""],
    [en ? "Type" : "Type", type],
    [en ? "Serial no." : "N° de série", serial],
    [en ? "Manufacturing year" : "Année de fabrication", info["fabrication"] ?? ""],
  ].filter(([, v]) => String(v).trim() !== "") as [string, string][];
  fields.forEach(([l, v], i) => {
    const x = i % 2 === 0 ? M : W / 2;
    if (i % 2 === 0 && i > 0) y += 6;
    pdf.setFont("helvetica", "bold"); pdf.text(`${l} :`, x, y);
    pdf.setFont("helvetica", "normal"); pdf.text(String(v), x + pdf.getTextWidth(`${l} : `) + 1, y);
  });
  y += 7;
  const rem = (info["remarques"] ?? "").trim();
  if (rem) {
    pdf.setFont("helvetica", "bold"); pdf.text(en ? "Remarks :" : "Remarques :", M, y);
    pdf.setFont("helvetica", "normal");
    const lines = pdf.splitTextToSize(rem, W - 2 * M - 22);
    pdf.text(lines, M + 22, y);
    y += lines.length * 4.5;
  }
  y += 5;

  // 2. Antécédents avant KeyWeight (si renseignés)
  const ids = parseAntecedents(info["antecedents"]).filter((id) => id !== "initial");
  const dates = parseAntecedentDates(info["antecedents_dates"]);
  const customs = parseCustomAntecedents(info["antecedents_custom"]).filter((c) => c.label.trim());
  const ante = [
    ...ids.map((id) => {
      const it = ANTECEDENT_ITEMS.find((i) => i.id === id) ?? FACTORY_INTERVENTIONS.find((i) => i.id === id);
      return { label: it ? (en ? it.en : it.fr) : id, date: dates[id] ?? "" };
    }),
    ...customs.map((c) => ({ label: c.label.trim(), date: c.date })),
  ];
  if (ante.length) {
    section(en ? "HISTORY PRIOR TO KEYWEIGHT" : "ANTÉCÉDENTS AVANT KEYWEIGHT");
    ante.forEach((a) => {
      pdf.text(`•  ${a.date ? fmtMonth(a.date) + " — " : ""}${a.label}`, M + 2, y);
      y += 5;
    });
    y += 4;
  }

  // 3. Points d'historique KeyWeight
  section(en ? "KEYWEIGHT HISTORY POINTS" : "POINTS D'HISTORIQUE KEYWEIGHT");
  const cols = [M, M + 24, M + 92, M + 112, M + 132, M + 152, M + 170] as const;
  const head = [en ? "Date" : "Date", en ? "Work carried out" : "Interventions", en ? "DW avg" : "PD moy", en ? "UW avg" : "PR moy", en ? "BW avg" : "PE moy", en ? "F avg" : "F moy", en ? "Keys" : "Touches"];
  pdf.setFont("helvetica", "bold");
  head.forEach((h, i) => pdf.text(h, cols[i] ?? M, y));
  pdf.setFont("helvetica", "normal");
  y += 2;
  pdf.setLineWidth(0.15);
  pdf.line(M, y, W - M, y);
  y += 4.5;
  doc.history_points.forEach((p) => {
    const av = historyAverages(p.rows);
    const label = pdf.splitTextToSize(p.name || "—", cols[2] - cols[1] - 3) as string[];
    if (y + label.length * 4.5 > H - 22) { pdf.addPage(); y = M + 6; }
    pdf.text(fmtDate(p.created_at, en), cols[0], y);
    pdf.text(label, cols[1], y);
    [g(av.pd), g(av.pr), g(av.pe), g(av.f), String(av.count)].forEach((v, i) => pdf.text(v, cols[i + 2] ?? M, y));
    y += Math.max(1, label.length) * 4.5 + 1.5;
  });
  if (!doc.history_points.length) pdf.text("—", M, y);

  // Pied de page
  const stamp = new Date().toLocaleDateString(en ? "en-GB" : "fr-FR");
  const total = pdf.getNumberOfPages();
  for (let i = 1; i <= total; i++) {
    pdf.setPage(i);
    pdf.setFontSize(7);
    pdf.setTextColor(120);
    pdf.text("Keyweight.app © 2026", M, H - M);
    pdf.text(`Page ${i} / ${total}`, W / 2, H - M, { align: "center" });
    pdf.text(`${en ? "Exported on:" : "Exporté le :"} ${stamp}`, W - M, H - M, { align: "right" });
    pdf.setTextColor(0);
  }

  const seg = (v: string | undefined) => (String(v ?? "").trim().replace(/[^\w-]+/g, "_") || (en ? "UNKNOWN" : "INCONNU"));
  pdf.save(`${seg(info["marque"])}_${seg(info["modele"])}_${en ? "HISTORY" : "HISTORIQUE"}.pdf`);
}
