// Formulaires PDF vierges interactifs (champs numériques éditables).
// Géométrie fixe pour permettre un ré-import fiable.
import jsPDF from "jspdf";
import { AcroFormButton, AcroFormTextField } from "jspdf";

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

/**
 * Signaletique de conformite (haut a droite) :
 * - mention verte et grasse, invisible par defaut, qui apparait quand les
 *   88 touches ont Wa et Wd numeriques (script Acrobat embarque) ;
 * - icone « i » toujours visible, rappelant les 2 conditions au clic.
 */
function drawCompliance(pdf: jsPDF, lang: "fr" | "en", pageWidth: number): void {
  const isEn = lang === "en";
  const badgeText = isEn
    ? "Input form compliant for import"
    : "Formulaire de saisie conforme pour import";
  const tip = isEn
    ? "Compliance requirements for import: 1. All 88 keys must be filled out. 2. Only numerical data (Wa and Wd) allowed."
    : "Conditions de conformite pour l'importation : 1. Remplissage obligatoire des 88 touches. 2. Saisie exclusive de valeurs numeriques (Wa et Wd).";

  const badge = new AcroFormTextField();
  badge.fieldName = "compliance_badge";
  (badge as unknown as { Rect: number[] }).Rect = [pageWidth - MARGIN - 84, 6, 78, 6];
  badge.fontSize = 9;
  badge.maxFontSize = 9;
  (badge as unknown as { fontStyle: string }).fontStyle = "bold";
  (badge as unknown as { textColor: string }).textColor = "#008000";
  badge.value = badgeText;
  badge.readOnly = true;
  pdf.addField(badge);

  const info = new AcroFormButton();
  info.fieldName = "compliance_info";
  (info as unknown as { Rect: number[] }).Rect = [pageWidth - MARGIN - 5, 6, 5, 6];
  (info as unknown as { caption: string }).caption = "i";
  info.fontSize = 8;
  pdf.addField(info);

  const script = [
    "function fncCompliance(){",
    "  var ok=true;",
    "  for(var i=1;i<=88;i++){",
    "    var a=this.getField('wa_'+i);var d=this.getField('wd_'+i);",
    "    if(!a||!d){continue;}",
    "    var va=(''+a.value).replace(/^\\s+|\\s+$/g,'');",
    "    var vd=(''+d.value).replace(/^\\s+|\\s+$/g,'');",
    "    if(va===''||vd===''||isNaN(va)||isNaN(vd)){ok=false;break;}",
    "  }",
    "  var b=this.getField('compliance_badge');",
    "  if(b){b.display=ok?display.visible:display.hidden;}",
    "}",
    "for(var j=1;j<=88;j++){",
    "  var fa=this.getField('wa_'+j);if(fa){fa.setAction('Calculate','fncCompliance();');}",
    "  var fd=this.getField('wd_'+j);if(fd){fd.setAction('Calculate','fncCompliance();');}",
    "}",
    "var fi=this.getField('compliance_info');",
    `if(fi){fi.setAction('MouseUp','app.alert("${tip}");');}`,
    "fncCompliance();",
  ].join("\n");
  (pdf as unknown as { addJS: (s: string) => void }).addJS(script);
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
  drawFooter(pdf, lang, PAGE_W, 285);

  pdf.save(filename);
}

const FOOTER_FR =
  "Une fois vos mesures completees, glissez-deposez ce fichier directement sur l'application pour generer instantanement vos graphiques d'analyse et vous comparer au Cloud mondial.";
const FOOTER_EN =
  "Once your measurements are complete, drag and drop this file directly into the application to instantly generate your analysis charts and compare yourself to the global Cloud.";

function drawFooter(pdf: jsPDF, lang: "fr" | "en", pageWidth: number, y: number) {
  pdf.setFontSize(8);
  pdf.setTextColor(60);
  const lines = pdf.splitTextToSize(lang === "en" ? FOOTER_EN : FOOTER_FR, pageWidth - MARGIN * 2);
  pdf.text(lines, pageWidth / 2, y, { align: "center" });
  pdf.setTextColor(0);
}

/** Option 4 : formulaire vierge, dessin graphique du clavier (4 sections / 2 pages). */
export function generateBlankKeyboardPdf(
  filename: string,
  lang: "fr" | "en" = "fr",
  meta: BlankFormMeta = {},
): void {
  const isEn = lang === "en";
  const W = 297;
  const pdf = new jsPDF({ orientation: "landscape", format: "a4", unit: "mm" });

  // Dessin miroir de l'UI : blanches pleine hauteur, noires 62 % centrees
  // sur la separation, deux casiers de saisie empiles dans le corps.
  const drawKeyboard = (from: number, to: number, top: number) => {
    const keys = Array.from({ length: to - from + 1 }, (_, i) => from + i);
    const whites = keys.filter((k) => !isBlackKey(k)).length;
    const avail = W - MARGIN * 2;
    const wKey = avail / whites;
    const bKey = wKey * 0.605;
    const kbH = 46;
    const blackH = kbH * 0.62;

    let whiteIdx = 0;
    const geo = new Map<number, { x: number; w: number; black: boolean }>();
    pdf.setDrawColor(40);
    pdf.setLineWidth(0.25);
    for (const k of keys) {
      if (isBlackKey(k)) continue;
      const x = MARGIN + whiteIdx * wKey;
      pdf.setFillColor(255, 255, 255);
      pdf.rect(x, top, wKey, kbH, "FD");
      geo.set(k, { x, w: wKey, black: false });
      whiteIdx++;
    }
    whiteIdx = 0;
    for (const k of keys) {
      if (!isBlackKey(k)) {
        whiteIdx++;
        continue;
      }
      const x = MARGIN + whiteIdx * wKey - bKey / 2;
      pdf.setFillColor(20, 20, 20);
      pdf.rect(x, top, bKey, blackH, "F");
      geo.set(k, { x, w: bKey, black: true });
    }

    // Casiers de saisie Wa / Wd dans le corps de chaque touche
    const fh = 5;
    for (const k of keys) {
      const g = geo.get(k)!;
      const fw = Math.max(g.w - 1, 3.4);
      const fx = g.x + (g.w - fw) / 2;
      const yWa = g.black ? top + blackH - fh * 2 - 2.4 : top + kbH - fh * 2 - 6;
      const yWd = yWa + fh + 1.2;
      // Repere textuel gris tres clair, visible sous le champ vide
      pdf.setFontSize(5);
      pdf.setTextColor(g.black ? 120 : 205);
      pdf.setFillColor(255, 255, 255);
      if (g.black) pdf.rect(fx, yWa, fw, fh * 2 + 1.2, "F");
      pdf.text("Wa", fx + fw / 2, yWa + fh - 1.4, { align: "center" });
      pdf.text("Wd", fx + fw / 2, yWd + fh - 1.4, { align: "center" });
      pdf.setTextColor(0);
      textField(pdf, `wa_${k}`, fx, yWa, fw, fh, "", 5);
      textField(pdf, `wd_${k}`, fx, yWd, fw, fh, "", 5);
      // Numero de touche sous le clavier
      pdf.setFontSize(5);
      pdf.text(String(k), g.x + g.w / 2, top + kbH + 3, { align: "center" });
    }
  };

  const section = (from: number, to: number, top: number) => {
    pdf.setFontSize(8);
    pdf.setTextColor(0);
    pdf.text(isEn ? `Keys ${from} - ${to}` : `Touches ${from} - ${to}`, MARGIN, top - 2);
    drawKeyboard(from, to, top);
  };

  header(
    pdf,
    isEn
      ? "PIANO TOUCH ANALYZER - BLANK KEYBOARD FORM"
      : "PIANO TOUCH ANALYZER - FORMULAIRE CLAVIER VIERGE",
    W,
  );
  const y = drawIdentity(pdf, meta, lang, 24, W, 40, 90);
  section(1, 22, y + 8);
  section(23, 44, y + 68);

  pdf.addPage("a4", "landscape");
  pdf.setFontSize(12);
  pdf.text(isEn ? "KEYS 45 - 88" : "TOUCHES 45 - 88", W / 2, 12, { align: "center" });
  section(45, 66, 26);
  section(67, 88, 96);
  drawFooter(pdf, lang, W, 190);

  pdf.save(filename);
}
