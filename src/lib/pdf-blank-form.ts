// Formulaire PDF vierge interactif (2 pages A4 portrait, champs numériques éditables).
// Géométrie fixe pour permettre un ré-import fiable.
import jsPDF from "jspdf";
import { AcroFormTextField } from "jspdf";

const PAGE_W = 210;
const MARGIN = 14;

const IDENTITY_FIELDS_FR = [
  "Marque",
  "Modele",
  "N de serie",
  "Type de piano",
  "Pays / Ville",
  "Type d'entretien",
];
const IDENTITY_FIELDS_EN = [
  "Brand",
  "Model",
  "Serial number",
  "Piano type",
  "Country / City",
  "Maintenance type",
];

function textField(pdf: jsPDF, name: string, x: number, y: number, w: number, h: number) {
  const field = new AcroFormTextField();
  field.fieldName = name;
  (field as unknown as { Rect: number[] }).Rect = [x, y, w, h];
  field.fontSize = 8;
  field.maxFontSize = 8;
  field.multiline = false;
  pdf.addField(field);
}

/** Génère et télécharge le formulaire vierge ré-importable. */
export function generateBlankFormPdf(filename: string, lang: "fr" | "en" = "fr"): void {
  const pdf = new jsPDF({ orientation: "portrait", format: "a4", unit: "mm" });
  const isEn = lang === "en";

  // ---- Page 1 : identité + touches 1 à 44 ----
  pdf.setFontSize(14);
  pdf.text(
    isEn ? "PIANO TOUCH ANALYZER - BLANK ENTRY FORM" : "PIANO TOUCH ANALYZER - FORMULAIRE VIERGE",
    PAGE_W / 2,
    16,
    { align: "center" },
  );
  pdf.setFontSize(8);
  pdf.text("# ID: CLAVIER_EXPERT_GENUINE_EXPORT", PAGE_W / 2, 21, { align: "center" });

  const labels = isEn ? IDENTITY_FIELDS_EN : IDENTITY_FIELDS_FR;
  pdf.setFontSize(9);
  let y = 30;
  labels.forEach((label, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = MARGIN + col * 92;
    const yy = y + row * 10;
    pdf.text(`${label} :`, x, yy + 4);
    textField(pdf, `meta_${i}`, x + 34, yy, 52, 6);
  });
  y += Math.ceil(labels.length / 2) * 10 + 6;

  const drawKeyBlock = (from: number, to: number, top: number) => {
    const colWidth = (PAGE_W - MARGIN * 2) / 2;
    const perCol = Math.ceil((to - from + 1) / 2);
    pdf.setFontSize(9);
    for (let c = 0; c < 2; c++) {
      const x = MARGIN + c * colWidth;
      pdf.text(isEn ? "Key" : "Touche", x, top - 2);
      pdf.text("Wa (g)", x + 22, top - 2);
      pdf.text("Wd (g)", x + 58, top - 2);
    }
    for (let i = from; i <= to; i++) {
      const idx = i - from;
      const c = idx < perCol ? 0 : 1;
      const r = idx % perCol;
      const x = MARGIN + c * colWidth;
      const yy = top + r * 6.6;
      pdf.setFontSize(8);
      pdf.text(String(i), x, yy + 4);
      textField(pdf, `wa_${i}`, x + 20, yy, 30, 5.5);
      textField(pdf, `wd_${i}`, x + 56, yy, 30, 5.5);
    }
  };

  drawKeyBlock(1, 44, y + 6);

  // ---- Page 2 : touches 45 à 88 ----
  pdf.addPage("a4", "portrait");
  pdf.setFontSize(12);
  pdf.text(isEn ? "KEYS 45 - 88" : "TOUCHES 45 - 88", PAGE_W / 2, 16, { align: "center" });
  drawKeyBlock(45, 88, 26);

  pdf.save(filename);
}
