// Génération du rapport PDF Premium (A4 paysage, 2 pages, téléchargement direct).
import jsPDF from "jspdf";
import html2canvas from "html2canvas-pro";

type Capture = { dataUrl: string; width: number; height: number };

const PAGE_W = 297; // mm (A4 paysage)
const PAGE_H = 210;
const MARGIN = 8;
const GAP = 4;

async function capture(el: HTMLElement): Promise<Capture> {
  // Marge haute : les titres des cadres débordent au-dessus de la bordure.
  const PAD = 14;
  const canvas = await html2canvas(el, {
    scale: 2,
    backgroundColor: "#ffffff",
    useCORS: true,
    logging: false,
    y: -PAD,
    height: el.offsetHeight + PAD * 2,
    onclone: (doc) => {
      // Les commandes interactives n'ont pas leur place dans le rapport.
      doc.querySelectorAll("[data-pdf-hide]").forEach((node) => {
        (node as HTMLElement).style.visibility = "hidden";
      });
    },
  });
  return {
    dataUrl: canvas.toDataURL("image/png"),
    width: canvas.width,
    height: canvas.height,
  };
}


/** Échelle (mm/px) tenant dans une page A4 paysage pour une pile de blocs. */
function pageRatio(blocks: Capture[]): number {
  const availW = PAGE_W - MARGIN * 2;
  const availH = PAGE_H - MARGIN * 2 - GAP * (blocks.length - 1);
  const maxPxW = Math.max(...blocks.map((b) => b.width));
  const totalPxH = blocks.reduce((sum, b) => sum + b.height, 0);
  return Math.min(availW / maxPxW, availH / totalPxH);
}

/** Empile verticalement les blocs capturés sur une page A4 paysage, à l'échelle imposée. */
function drawPage(pdf: jsPDF, blocks: Capture[], ratio: number) {
  const availW = PAGE_W - MARGIN * 2;
  let y = MARGIN;
  for (const block of blocks) {
    const w = block.width * ratio;
    const h = block.height * ratio;
    const x = MARGIN + (availW - w) / 2;
    pdf.addImage(block.dataUrl, "PNG", x, y, w, h, undefined, "FAST");
    y += h + GAP;
  }
}

/**
 * Capture les blocs, compose deux pages A4 paysage séparées par un saut de page
 * physique, puis déclenche le téléchargement local direct (pdf.save).
 */
export async function generateLandscapeReport(
  page1: HTMLElement[],
  page2: HTMLElement[],
  filename: string,
): Promise<void> {
  const captures1 = await Promise.all(page1.map(capture));
  const captures2 = await Promise.all(page2.map(capture));

  const pdf = new jsPDF({ orientation: "landscape", format: "a4", unit: "mm" });
  // Échelle commune aux deux pages : les cadres partagés (Moyennes) gardent
  // exactement la même largeur d'une page à l'autre.
  const ratio = Math.min(pageRatio(captures1), pageRatio(captures2));
  drawPage(pdf, captures1, ratio);
  pdf.addPage("a4", "landscape");
  drawPage(pdf, captures2, ratio);
  pdf.save(filename);
}
