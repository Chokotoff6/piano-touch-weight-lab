// Génération du rapport PDF Premium (A4 paysage, 2 pages, téléchargement direct).
import jsPDF from "jspdf";
import html2canvas from "html2canvas-pro";

type Capture = { dataUrl: string; width: number; height: number };

const PAGE_W = 297; // mm (A4 paysage)
const PAGE_H = 210;
const MARGIN = 8;
const GAP = 4;
/** Largeur fixe du conteneur isolé photographié par html2canvas. */
const CAPTURE_W = 1120;

/**
 * Clone le bloc dans un conteneur caché de 1120 px de large, purge les éléments
 * interactifs (`data-pdf-hide`), révèle les compléments PDF (`data-pdf-only`),
 * puis photographie ce conteneur isolé.
 */
async function capture(el: HTMLElement): Promise<Capture> {
  const host = document.createElement("div");
  host.style.cssText =
    "position:fixed;left:-9999px;top:0;width:1120px;max-width:1120px;background:#ffffff;padding:16px;z-index:-1;";
  const clone = el.cloneNode(true) as HTMLElement;
  clone.style.width = `${CAPTURE_W - 32}px`;
  clone.style.maxWidth = `${CAPTURE_W - 32}px`;
  clone.style.margin = "0";
  host.appendChild(clone);
  document.body.appendChild(host);

  // Les champs clonés perdent leur valeur (propriété, pas attribut) : on la recopie.
  const sources = el.querySelectorAll<HTMLInputElement>("input");
  const targets = clone.querySelectorAll<HTMLInputElement>("input");
  targets.forEach((input, i) => {
    const value = sources[i]?.value ?? "";
    input.setAttribute("value", value);
    input.value = value;
  });

  host.querySelectorAll<HTMLElement>("[data-pdf-hide]").forEach((node) => {
    node.style.display = "none";
  });
  host.querySelectorAll<HTMLElement>("[data-pdf-only]").forEach((node) => {
    node.style.display = "inline";
  });

  try {
    const canvas = await html2canvas(host, {
      scale: 2,
      backgroundColor: "#ffffff",
      useCORS: true,
      logging: false,
      width: CAPTURE_W,
      windowWidth: CAPTURE_W,
    });
    return {
      dataUrl: canvas.toDataURL("image/png"),
      width: canvas.width,
      height: canvas.height,
    };
  } finally {
    host.remove();
  }
}

/** Empile verticalement les blocs capturés sur une page A4 paysage, à l'échelle. */
function drawPage(pdf: jsPDF, blocks: Capture[]) {
  const availW = PAGE_W - MARGIN * 2;
  const availH = PAGE_H - MARGIN * 2 - GAP * (blocks.length - 1);
  // Échelle commune : mm par pixel, limitée par la largeur ET la hauteur totale.
  const maxPxW = Math.max(...blocks.map((b) => b.width));
  const totalPxH = blocks.reduce((sum, b) => sum + b.height, 0);
  const ratio = Math.min(availW / maxPxW, availH / totalPxH);
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
  const captures1: Capture[] = [];
  for (const el of page1) captures1.push(await capture(el));
  const captures2: Capture[] = [];
  for (const el of page2) captures2.push(await capture(el));

  const pdf = new jsPDF({ orientation: "landscape", format: "a4", unit: "mm" });
  drawPage(pdf, captures1);
  pdf.addPage("a4", "landscape");
  drawPage(pdf, captures2);
  pdf.save(filename);
}
