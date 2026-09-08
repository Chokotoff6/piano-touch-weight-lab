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

/** Un bloc n'est capturable que s'il possède une surface réelle (pas display:none). */
function isRenderable(el: HTMLElement): boolean {
  return el.offsetWidth > 0 && el.offsetHeight > 0;
}

/** Réduction d'échelle imposée au cadre « Mesures poids statiques » (page 1). */
const COMPACT_SCALE = 0.82;

async function capture(el: HTMLElement): Promise<Capture> {
  // Marge haute : les titres des cadres débordent au-dessus de la bordure.
  const PAD = 14;
  const compact = el.hasAttribute("data-pdf-compact");
  // Le clone est réduit (transform-origin: top center) : la fenêtre de capture
  // est réduite d'autant, sinon html2canvas laisserait un large vide en bas.
  const height = compact
    ? Math.ceil(el.offsetHeight * COMPACT_SCALE) + PAD * 2
    : el.offsetHeight + PAD * 2;
  const canvas = await html2canvas(el, {
    scale: 2,
    backgroundColor: "#ffffff",
    useCORS: true,
    logging: false,
    y: -PAD,
    height,

    onclone: (doc) => {
      // Normalisation typographique : html2canvas rend mal les utilitaires de
      // tracking (textes et chiffres qui se chevauchent horizontalement).
      const style = doc.createElement("style");
      style.textContent = `
        [data-pdf-compact], [data-pdf-compact] * {
          letter-spacing: normal !important;
          word-spacing: normal !important;
          font-variant-ligatures: none !important;
          font-kerning: none !important;
        }
        /* Gabarit rigide de la page 1 : largeur et typographie réduites pour que
           le cadre « Mesures poids statiques » tienne intégralement sur la page. */
        [data-pdf-compact] {
          width: 850px !important;
          max-width: 850px !important;
          margin-left: auto !important;
          margin-right: auto !important;
          font-size: 11px !important;
          padding: 8px !important;
        }
        [data-pdf-compact] td,
        [data-pdf-compact] th,
        [data-pdf-compact] span,
        [data-pdf-compact] div,
        [data-pdf-compact] input {
          line-height: 1.15 !important;
        }
        [data-pdf-compact] input {
          text-align: center !important;
          font-size: 10px !important;
          height: 16px !important;
          min-height: 0 !important;
          padding: 0 !important;
        }
      `;
      doc.head.appendChild(style);
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
      // Cadre « Mesures poids statiques » (page 1) : rendu forcé (il peut être
      // déporté hors écran quand l'export part de la page Infopiano), marges
      // supprimées et réduction d'échelle stricte pour que ses 8 rangées
      // d'expertise et sa bordure basse tiennent entièrement sur la page 1.
      doc.querySelectorAll("[data-pdf-compact]").forEach((node) => {
        const frame = node as HTMLElement;
        frame.style.setProperty("position", "static", "important");
        frame.style.setProperty("left", "auto", "important");
        frame.style.setProperty("top", "auto", "important");
        frame.style.setProperty("opacity", "1", "important");
        frame.style.setProperty("visibility", "visible", "important");
        frame.style.setProperty("display", "block", "important");
        frame.style.setProperty("height", "auto", "important");
        frame.style.setProperty("max-height", "none", "important");
        frame.style.setProperty("overflow", "visible", "important");
        frame.style.setProperty("margin-top", "0", "important");
        frame.style.setProperty("margin-bottom", "2rem", "important");
        frame.style.setProperty("padding-top", "10px", "important");
        frame.style.setProperty("padding-bottom", "2px", "important");
        frame.style.setProperty("transform", `scale(${COMPACT_SCALE})`, "important");
        frame.style.setProperty("transform-origin", "top center", "important");
      });
      // Aucun conteneur interne ne doit rogner la bordure basse du cadre.
      doc.querySelectorAll("[data-pdf-compact] *").forEach((node) => {
        const el = node as HTMLElement;
        el.style.setProperty("max-height", "none", "important");
        el.style.setProperty("overflow", "visible", "important");
      });
      // Centrage horizontal absolu des chiffres du tableau (page 1) : styles
      // en ligne posés directement sur chaque champ et son conteneur, car
      // html2canvas ignore une partie des règles utilitaires de mise en page.
      doc.querySelectorAll("[data-pdf-compact] input").forEach((node) => {
        const input = node as HTMLElement;
        input.style.setProperty("text-align", "center", "important");
        input.style.setProperty("justify-content", "center", "important");
        input.style.setProperty("font-weight", "bold", "important");
        input.style.setProperty("padding", "0", "important");
        input.style.setProperty("margin", "0 auto", "important");
        input.style.setProperty("width", "100%", "important");
        input.style.setProperty("text-indent", "0", "important");
        const cell = input.parentElement;
        if (cell) {
          cell.style.setProperty("display", "flex", "important");
          cell.style.setProperty("justify-content", "center", "important");
          cell.style.setProperty("align-items", "center", "important");
          cell.style.setProperty("padding", "0", "important");
          cell.style.setProperty("text-align", "center", "important");
        }
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

/** Images haute définition d'un rapport, prêtes à être assemblées en PDF. */
export type ReportCaptures = Capture[][];

/**
 * Cache persistant (portée module) : il survit à la navigation entre les pages
 * Saisie et Résultats, donc l'export reste instantané au retour.
 */
let cacheKey = "";
let cacheShots: ReportCaptures | null = null;

/** Stockage de session : les captures survivent à toute navigation (Saisie / Résultats / Comparer). */
const STORE_KEY = "pdf_cached_charts";

export function getCachedCaptures(key: string): ReportCaptures | null {
  if (cacheKey === key && cacheShots) return cacheShots;
  try {
    const raw = sessionStorage.getItem(STORE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { key: string; shots: ReportCaptures };
    if (parsed?.key !== key || !Array.isArray(parsed.shots)) return null;
    cacheKey = key;
    cacheShots = parsed.shots;
    return cacheShots;
  } catch {
    return null;
  }
}

export function setCachedCaptures(key: string, shots: ReportCaptures): void {
  cacheKey = key;
  cacheShots = shots;
  try {
    sessionStorage.setItem(STORE_KEY, JSON.stringify({ key, shots }));
  } catch (error) {
    // Quota dépassé : le cache mémoire reste actif pour la page courante.
    console.warn("[pdf] cache session indisponible", error);
  }
}


/**
 * Capture les blocs page par page (html2canvas). Opération lente : elle peut
 * être lancée en tâche de fond dès que la saisie est conforme, puis mise en
 * cache pour un téléchargement instantané.
 */
export async function captureReportPages(pages: HTMLElement[][]): Promise<ReportCaptures> {
  const captured: ReportCaptures = [];
  // Stabilisation : on laisse aux graphiques Recharts le temps d'être
  // intégralement calculés et figés avant la première capture.
  await settle(1500);
  for (const page of pages) {
    const blocks = page.filter((block) => Boolean(block) && isRenderable(block));
    if (blocks.length === 0) continue;
    const shots: Capture[] = [];
    for (const block of blocks) {
      await settle(300);
      // Étanchéité totale : un bloc non capturable est ignoré, jamais bloquant.
      try {
        const shot = await capture(block);
        if (shot.width > 0 && shot.height > 0) shots.push(shot);
      } catch (error) {
        console.warn("[pdf] bloc ignoré", error);
      }
    }
    if (shots.length > 0) captured.push(shots);
  }
  return captured;
}

/**
 * Assemble les captures déjà prêtes en A4 paysage (saut de page physique entre
 * chacune) et déclenche le téléchargement local direct (pdf.save).
 * `header` : 3 lignes d'identification imprimées en haut à droite des pages 2+.
 */
export function buildReportPdf(
  captured: ReportCaptures,
  filename: string,
  header: string[] = [],
): void {
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

/** Capture puis télécharge en une seule opération (chemin sans pré-rendu). */
export async function generateLandscapeReport(
  pages: HTMLElement[][],
  filename: string,
  header: string[] = [],
): Promise<void> {
  buildReportPdf(await captureReportPages(pages), filename, header);
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

