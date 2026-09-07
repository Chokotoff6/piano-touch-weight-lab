// Formulaires PDF vierges interactifs (champs numériques éditables).
// Géométrie fixe pour permettre un ré-import fiable.
import jsPDF from "jspdf";
import { AcroFormTextField } from "jspdf";

const PAGE_W = 210;
const MARGIN = 14;

/** Champs d'identité du piano, communs à tous les exports PDF. */
export type BlankFormMeta = {
  marque?: string;
  modele?: string;
  serial?: string;
  typePiano?: string;
  pays?: string;
  ville?: string;
  entretien?: string;
  usage?: string;
  modifications?: string;
  zone?: string;
  annee?: string;
};

const LABELS_FR = [
  "Marque",
  "Modele",
  "N de serie",
  "Type de piano",
  "Pays / Ville",
  "Type d'entretien",
  "Usage instrument",
  "Modifications importantes",
  "Zone geographique",
  "Annee de fabrication",
];
const LABELS_EN = [
  "Brand",
  "Model",
  "Serial number",
  "Piano type",
  "Country / City",
  "Maintenance type",
  "Instrument usage",
  "Major modifications",
  "Geographic zone",
  "Year of manufacture",
];

const NOTES_FR = ["Do", "Do#", "Ré", "Ré#", "Mi", "Fa", "Fa#", "Sol", "Sol#", "La", "La#", "Si"];
const NOTES_EN = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

/** Nom de la note pour une touche 1..88 (touche 1 = La 0 / A0). */
export function noteName(key: number, lang: "fr" | "en"): string {
  const midi = key + 20;
  const pc = midi % 12;
  const octave = Math.floor(midi / 12) - 1;
  return lang === "en" ? `${NOTES_EN[pc]}${octave}` : `${NOTES_FR[pc]} ${octave}`;
}

const BLACK_PC = new Set([1, 3, 6, 8, 10]);
const isBlackKey = (key: number) => BLACK_PC.has((key + 20) % 12);

function textField(
  pdf: jsPDF,
  name: string,
  x: number,
  y: number,
  w: number,
  h: number,
  value = "",
  size = 8,
) {
  const field = new AcroFormTextField();
  field.fieldName = name;
  (field as unknown as { Rect: number[] }).Rect = [x, y, w, h];
  field.fontSize = size;
  field.maxFontSize = size;
  field.multiline = false;
  if (value) field.value = value;
  pdf.addField(field);
}

function metaValues(meta: BlankFormMeta): string[] {
  const place = [meta.ville, meta.pays].filter(Boolean).join(" / ");
  return [
    meta.marque ?? "",
    meta.modele ?? "",
    meta.serial ?? "",
    meta.typePiano ?? "",
    place,
    meta.entretien ?? "",
    meta.usage ?? "",
    meta.modifications ?? "",
    meta.zone ?? "",
    meta.annee ?? "",
  ];
}

/** Bloc identité (10 champs sur 2 colonnes). Retourne le Y sous le bloc. */
function drawIdentity(
  pdf: jsPDF,
  meta: BlankFormMeta,
  lang: "fr" | "en",
  top: number,
  pageWidth = PAGE_W,
  labelW = 34,
  fieldW = 52,
): number {
  const labels = lang === "en" ? LABELS_EN : LABELS_FR;
  const values = metaValues(meta);
  const colW = (pageWidth - MARGIN * 2) / 2;
  pdf.setFontSize(8);
  labels.forEach((label, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = MARGIN + col * colW;
    const yy = top + row * 9;
    pdf.text(`${label} :`, x, yy + 4);
    textField(pdf, `meta_${i}`, x + labelW, yy, fieldW, 5.5, values[i]);
  });
  return top + Math.ceil(labels.length / 2) * 9 + 4;
}

function header(pdf: jsPDF, title: string, pageWidth = PAGE_W) {
  pdf.setFontSize(13);
  pdf.text(title, pageWidth / 2, 14, { align: "center" });
  pdf.setFontSize(8);
  pdf.text("# ID: CLAVIER_EXPERT_GENUINE_EXPORT", pageWidth / 2, 19, { align: "center" });
}

/** Option 3 : formulaire vierge, tableau textuel avec colonne « Note ». */
export function generateBlankFormPdf(
  filename: string,
  lang: "fr" | "en" = "fr",
  meta: BlankFormMeta = {},
): void {
  const pdf = new jsPDF({ orientation: "portrait", format: "a4", unit: "mm" });
  const isEn = lang === "en";

  header(
    pdf,
    isEn ? "PIANO TOUCH ANALYZER - BLANK ENTRY FORM" : "PIANO TOUCH ANALYZER - FORMULAIRE VIERGE",
  );
  const y = drawIdentity(pdf, meta, lang, 26);

  const drawKeyBlock = (from: number, to: number, top: number) => {
    const colWidth = (PAGE_W - MARGIN * 2) / 2;
    const perCol = Math.ceil((to - from + 1) / 2);
    pdf.setFontSize(8);
    for (let c = 0; c < 2; c++) {
      const x = MARGIN + c * colWidth;
      pdf.text(isEn ? "Key" : "Touche", x, top - 2);
      pdf.text(isEn ? "Note" : "Note", x + 13, top - 2);
      pdf.text("Wa (g)", x + 32, top - 2);
      pdf.text("Wd (g)", x + 60, top - 2);
    }
    for (let i = from; i <= to; i++) {
      const idx = i - from;
      const c = idx < perCol ? 0 : 1;
      const r = idx % perCol;
      const x = MARGIN + c * colWidth;
      const yy = top + r * 6.4;
      pdf.setFontSize(8);
      pdf.text(String(i), x, yy + 4);
      pdf.text(noteName(i, lang), x + 13, yy + 4);
      textField(pdf, `wa_${i}`, x + 31, yy, 24, 5.2);
      textField(pdf, `wd_${i}`, x + 59, yy, 24, 5.2);
    }
  };

  drawKeyBlock(1, 44, y + 6);

  pdf.addPage("a4", "portrait");
  pdf.setFontSize(12);
  pdf.text(isEn ? "KEYS 45 - 88" : "TOUCHES 45 - 88", PAGE_W / 2, 14, { align: "center" });
  drawKeyBlock(45, 88, 24);

  pdf.save(filename);
}

/** Option 4 : formulaire vierge, dessin graphique du clavier (2 pages paysage). */
export function generateBlankKeyboardPdf(
  filename: string,
  lang: "fr" | "en" = "fr",
  meta: BlankFormMeta = {},
): void {
  const isEn = lang === "en";
  const W = 297;
  const pdf = new jsPDF({ orientation: "landscape", format: "a4", unit: "mm" });

  const drawKeyboard = (from: number, to: number, top: number) => {
    const keys = Array.from({ length: to - from + 1 }, (_, i) => from + i);
    const whites = keys.filter((k) => !isBlackKey(k)).length;
    const avail = W - MARGIN * 2;
    const wKey = avail / whites;
    const bKey = wKey * 0.6;
    const kbH = 34;

    let whiteIdx = 0;
    const centers = new Map<number, number>();
    // Touches blanches
    pdf.setDrawColor(60);
    pdf.setLineWidth(0.2);
    for (const k of keys) {
      if (isBlackKey(k)) continue;
      const x = MARGIN + whiteIdx * wKey;
      pdf.setFillColor(255, 255, 255);
      pdf.rect(x, top, wKey, kbH, "FD");
      centers.set(k, x + wKey / 2);
      whiteIdx++;
    }
    // Touches noires
    whiteIdx = 0;
    for (const k of keys) {
      if (!isBlackKey(k)) {
        whiteIdx++;
        continue;
      }
      const boundary = MARGIN + whiteIdx * wKey;
      const x = boundary - bKey / 2;
      pdf.setFillColor(20, 20, 20);
      pdf.rect(x, top, bKey, kbH * 0.62, "F");
      centers.set(k, boundary);
    }

    // Numéros, notes et champs de saisie sous le clavier
    const labelY = top + kbH + 3;
    for (const k of keys) {
      const cx = centers.get(k)!;
      pdf.setFontSize(5);
      pdf.setTextColor(0);
      pdf.text(String(k), cx, labelY, { align: "center" });
      pdf.text(noteName(k, lang), cx, labelY + 3, { align: "center" });
      textField(pdf, `wa_${k}`, cx - wKey / 2 + 0.3, labelY + 4.5, wKey - 0.6, 5, "", 5);
      textField(pdf, `wd_${k}`, cx - wKey / 2 + 0.3, labelY + 10, wKey - 0.6, 5, "", 5);
    }
    pdf.setFontSize(7);
    pdf.text("Wa", MARGIN - 4, labelY + 8.2, { align: "right" });
    pdf.text("Wd", MARGIN - 4, labelY + 13.7, { align: "right" });
  };

  header(
    pdf,
    isEn
      ? "PIANO TOUCH ANALYZER - BLANK KEYBOARD FORM"
      : "PIANO TOUCH ANALYZER - FORMULAIRE CLAVIER VIERGE",
    W,
  );
  const y = drawIdentity(pdf, meta, lang, 24, W, 40, 90);
  pdf.setFontSize(9);
  pdf.text(isEn ? "Keys 1 - 44" : "Touches 1 - 44", MARGIN, y + 4);
  drawKeyboard(1, 44, y + 8);

  pdf.addPage("a4", "landscape");
  pdf.setFontSize(12);
  pdf.text(isEn ? "KEYS 45 - 88" : "TOUCHES 45 - 88", W / 2, 14, { align: "center" });
  drawKeyboard(45, 88, 24);

  pdf.save(filename);
}
