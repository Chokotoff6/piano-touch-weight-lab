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
      // Substitution textuelle : les notices/résumés sont vidés (textContent = "")
      // pour que les bordures se referment sans trou blanc. Les boutons et
      // pastilles interactives restent masqués en visibilité.
      doc.querySelectorAll("[data-pdf-hide]").forEach((node) => {
        const el = node as HTMLElement;
        if (el.tagName === "SPAN") {
          el.textContent = "";
        } else {
          el.style.visibility = "hidden";
        }
      });
      // Le conteneur de capture est masqué à l'écran par hauteur nulle
      // (h-0 + overflow-hidden + opacity-0). On le force temporairement
      // visible dans le clone pour qu'html2canvas peigne son contenu
      // (sinon la Page 2 du PDF sort blanche).
      doc.querySelectorAll("[data-pdf-capture-frame]").forEach((node) => {
        const frame = node as HTMLElement;
        // `md:hidden` masque le cadre à l'écran (display:none). html2canvas
        // ignore les media queries `print:`, il faut donc forcer `display:block`
        // dans le clone pour que les blocs d'expertise soient peints (Page 2).
        frame.style.display = "block";
        frame.style.height = "auto";
        frame.style.maxHeight = "none";
        frame.style.overflow = "visible";
        frame.style.opacity = "1";
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
  drawFooter(pdf, 1);
  pdf.addPage("a4", "landscape");
  drawPage(pdf, captures2, ratio);
  drawFooter(pdf, 2);
  pdf.save(filename);
}

/** Pied de page discret en bas à droite : numéro de page et date d'export. */
function drawFooter(pdf: jsPDF, page: number) {
  const now = new Date();
  const dd = String(now.getDate()).padStart(2, "0");
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const date = `${dd}-${mm}-${now.getFullYear()}`;
  pdf.setFontSize(7);
  pdf.setTextColor(120);
  pdf.text(`Page ${page} / 2`, PAGE_W - MARGIN, PAGE_H - MARGIN - 3, { align: "right" });
  pdf.text(`Exporté le : ${date}`, PAGE_W - MARGIN, PAGE_H - MARGIN, { align: "right" });
  pdf.setTextColor(0);
}
