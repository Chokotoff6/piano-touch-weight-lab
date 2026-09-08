// Génération du rapport PDF Premium (A4 paysage, 2 pages, téléchargement direct).
import jsPDF from "jspdf";
import html2canvas from "html2canvas-pro";

type Capture = { dataUrl: string; width: number; height: number };

const PAGE_W = 297; // mm (A4 paysage)
const PAGE_H = 210;
const MARGIN = 8;
const GAP = 4;

/** Attend que le navigateur ait peint (double rAF) puis laisse respirer le rendu. */
function settle(ms: number): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(resolve, ms)));
  });
}

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
        frame.style.height = "auto";
        frame.style.maxHeight = "none";
        frame.style.overflow = "visible";
        frame.style.opacity = "1";
      });
      // Les blocs d'expertise (Friction / Poids d'équilibre) sous chaque
      // demi-clavier sont masqués à l'écran (h-0 + opacity-0). On les force
      // visibles dans le clone pour que la capture du clavier inclue ses
      // rangées d'expertise.
      doc.querySelectorAll("[data-pdf-result-frame]").forEach((node) => {
        const frame = node as HTMLElement;
        frame.style.height = "auto";
        frame.style.maxHeight = "none";
        frame.style.overflow = "visible";
        frame.style.opacity = "1";
      });
      // Compactage du grand cadre « Mesures poids statiques » (page 1) :
      // réduction stricte d'échelle + resserrage des marges internes pour que
      // sa hauteur totale tienne intégralement sur la page.
      doc.querySelectorAll("[data-pdf-compact]").forEach((node) => {
        const frame = node as HTMLElement;
        frame.style.paddingTop = "6px";
        frame.style.paddingBottom = "2px";
        frame.style.marginTop = "0px";
        frame.style.marginBottom = "0px";
        frame.style.zoom = "0.9";
      });
    },
  });
  return {
    dataUrl: canvas.toDataURL("image/png"),
    width: canvas.width,
    height: canvas.height,
  };
}


const HEADER_H = 14; // mm réservés en haut des pages 2 et 3

/** Échelle (mm/px) tenant dans une page A4 paysage pour une pile de blocs. */
function pageRatio(blocks: Capture[], topOffset: number): number {
  const availW = PAGE_W - MARGIN * 2;
  const availH = PAGE_H - MARGIN * 2 - topOffset - GAP * (blocks.length - 1) - 6;
  const maxPxW = Math.max(...blocks.map((b) => b.width));
  const totalPxH = blocks.reduce((sum, b) => sum + b.height, 0);
  return Math.min(availW / maxPxW, availH / totalPxH);
}

/** Empile verticalement les blocs capturés sur une page A4 paysage, à l'échelle imposée. */
function drawPage(pdf: jsPDF, blocks: Capture[], ratio: number, topOffset: number) {
  const availW = PAGE_W - MARGIN * 2;
  let y = MARGIN + topOffset;
  for (const block of blocks) {
    const w = block.width * ratio;
    const h = block.height * ratio;
    const x = MARGIN + (availW - w) / 2;
    pdf.addImage(block.dataUrl, "PNG", x, y, w, h, undefined, "FAST");
    y += h + GAP;
  }
}

/**
 * Capture les blocs page par page, compose autant de pages A4 paysage que
 * demandé (saut de page physique entre chacune), puis déclenche le
 * téléchargement local direct (pdf.save). Aucune requête réseau n'intervient :
 * le rapport est entièrement construit à partir du DOM local.
 * `header` : 3 lignes d'identification imprimées en haut à droite des pages 2+.
 */
export async function generateLandscapeReport(
  pages: HTMLElement[][],
  filename: string,
  header: string[] = [],
): Promise<void> {
  const captured: Capture[][] = [];
  // Stabilisation : on laisse aux graphiques Recharts le temps d'être
  // intégralement calculés et figés avant la première capture.
  await settle(1500);
  for (const page of pages) {
    const blocks = page.filter(Boolean);
    if (blocks.length === 0) continue;
    const shots: Capture[] = [];
    for (const block of blocks) {
      await settle(300);
      shots.push(await capture(block));
    }
    captured.push(shots);
  }
  if (captured.length === 0) return;

  const pdf = new jsPDF({ orientation: "landscape", format: "a4", unit: "mm" });
  const total = captured.length;
  const stamp = exportStamp();
  captured.forEach((blocks, index) => {
    if (index > 0) pdf.addPage("a4", "landscape");
    const withHeader = index > 0 && header.length > 0;
    const topOffset = withHeader ? HEADER_H : 0;
    if (withHeader) drawHeader(pdf, header);
    drawPage(pdf, blocks, pageRatio(blocks, topOffset), topOffset);
    drawFooter(pdf, index + 1, total, stamp);
  });
  pdf.save(filename);
}

/** En-tête d'identification (3 lignes) en haut à droite des pages 2 et 3. */
function drawHeader(pdf: jsPDF, lines: string[]) {
  pdf.setTextColor(0);
  lines.slice(0, 3).forEach((line, i) => {
    pdf.setFontSize(i === 0 ? 10 : 8);
    pdf.text(line, PAGE_W - MARGIN, MARGIN + 3 + i * 4, { align: "right" });
  });
}

/** Horodatage d'export : « DD-MM-YYYY à HH:MM ». */
function exportStamp(): string {
  const now = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(now.getDate())}-${p(now.getMonth() + 1)}-${now.getFullYear()} à ${p(now.getHours())}:${p(now.getMinutes())}`;
}

/** Pied de page discret en bas à droite : numéro de page et date d'export. */
function drawFooter(pdf: jsPDF, page: number, total: number, stamp: string) {
  pdf.setFontSize(7);
  pdf.setTextColor(120);
  pdf.text(`Page ${page} / ${total}`, PAGE_W - MARGIN, PAGE_H - MARGIN - 3, { align: "right" });
  pdf.text(`Exporté le : ${stamp}`, PAGE_W - MARGIN, PAGE_H - MARGIN, { align: "right" });
  pdf.setTextColor(0);
}

