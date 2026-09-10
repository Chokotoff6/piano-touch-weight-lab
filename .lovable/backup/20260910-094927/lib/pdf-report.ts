// Génération du rapport PDF Premium (A4 paysage, 2 pages, téléchargement direct).
import jsPDF from "jspdf";
import html2canvas from "html2canvas-pro";

type Capture = {
  dataUrl: string;
  width: number;
  height: number;
  insertionScale: number;
  format?: "PNG" | "JPEG";
};

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
  const chart = Boolean(el.hasAttribute("data-pdf-chart") || el.closest?.("[data-pdf-chart]") || el.hasAttribute("data-frame"));
  // Blocs « Réglages » / « Moyennes » de la page Comparer : hauteur contrainte
  // à l'écran (sticky). La capture prend leur hauteur réelle de contenu pour
  // qu'aucun filtre ni aucune ligne de texte ne soit tronqué.
  const expand = el.hasAttribute("data-pdf-expand");
  const height = (expand ? Math.max(el.scrollHeight, el.offsetHeight) : el.offsetHeight) + PAD * 2;
  const started = performance.now();
  const canvas = await html2canvas(el, {
    // Définition ajustée à la taille exacte d'insertion PDF : les graphiques
    // s'impriment à leur largeur CSS (scale 1 suffit), seul le miroir du
    // tableau reste en scale 2 pour la netteté des 88 chiffres.
    scale: 2,
    backgroundColor: "#ffffff",
    useCORS: true,
    logging: false,
    imageTimeout: 0,
    removeContainer: true,
    foreignObjectRendering: false,
    y: -PAD,
    height,
    windowWidth: compact ? 1300 : 1500,

    // Élagage du clonage : html2canvas duplique tout le document à chaque
    // capture. Les blocs lourds étrangers à la cible sont écartés avant le
    // clonage, SANS toucher à la géométrie du bloc capturé :
    //  - le miroir des 88 touches est hors flux (position absolue hors écran),
    //    son retrait ne déplace donc aucun autre bloc ;
    //  - les cadres graphiques sont situés APRÈS le miroir dans le document,
    //    leur retrait ne décale pas ce qui les précède.
    ignoreElements: (node: Element) => {
      if (node === el || node.contains(el) || el.contains(node)) return false;
      if (!compact && node instanceof HTMLElement && node.hasAttribute("data-pdf-compact")) return true;
      if (node instanceof HTMLElement && node.hasAttribute("data-frame")) return true;
      return false;
    },


    onclone: (doc: Document, cloned: HTMLElement) => {
      // Isolation stricte : toutes les retouches sont limitées au nœud cloné
      // (miroir hors écran), jamais au document entier. Aucune dépendance à
      // l'état React ni à l'historique Undo/Redo n'est parcourue.
      const root: HTMLElement = cloned ?? (doc.body as HTMLElement);
      const pick = (selector: string): HTMLElement[] => {
        const list = Array.from(root.querySelectorAll<HTMLElement>(selector));
        if (root.matches?.(selector)) list.unshift(root);
        return list;
      };
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
        /* Le miroir PDF possède déjà sa géométrie définitive. Le clone ne
           change ni sa largeur ni celle de ses deux demi-claviers. */
        [data-pdf-compact] {
          width: 1250px !important;
          min-width: 1250px !important;
          max-width: 1250px !important;
          font-size: 11px !important;
          padding: 8px !important;
          overflow: visible !important;
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
          text-align-last: center !important;
          font-size: 10px !important;
          height: 16px !important;
          min-height: 0 !important;
          padding: 0 !important;
        }
        /* Noir pur : plus aucune nuance de gris clair dans le cadre Page 1. */
        [data-pdf-compact], [data-pdf-compact] * {
          color: #000000 !important;
          -webkit-text-fill-color: #000000 !important;
        }
        /* Cadres graphiques (pages 2 et 3) : géométrie et bordure identiques. */
        [data-pdf-chart] {
          width: 100% !important;
          max-width: 100% !important;
          display: block !important;
          border: 1px solid #e2e8f0 !important;
          border-radius: 0.5rem !important;
          background-color: #ffffff !important;
          padding: 1rem !important;
          overflow: visible !important;
        }
      `;
      doc.head.appendChild(style);
      // Substitution textuelle : les notices/résumés sont vidés (textContent = "")
      // pour que les bordures se referment sans trou blanc. Les boutons et
      // pastilles interactives restent masqués en visibilité.
      pick("[data-pdf-hide]").forEach((node) => {
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
      pick("[data-pdf-capture-frame]").forEach((node) => {
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
      pick("[data-pdf-result-frame]").forEach((node) => {
        const frame = node as HTMLElement;
        frame.style.height = "auto";
        frame.style.maxHeight = "none";
        frame.style.overflow = "visible";
        frame.style.opacity = "1";
      });
      // Blocs « Réglages » et « Moyennes » (page Comparer) : la hauteur fixe
      // et le positionnement collant sont neutralisés dans le clone pour que
      // l'intégralité des filtres et des valeurs soit peinte, sans coupure.
      pick("[data-pdf-expand]").forEach((node) => {
        const frame = node as HTMLElement;
        frame.style.setProperty("position", "static", "important");
        frame.style.setProperty("height", "auto", "important");
        frame.style.setProperty("max-height", "none", "important");
        frame.style.setProperty("overflow", "visible", "important");
      });
      pick("[data-pdf-expand] *").forEach((node) => {
        const child = node as HTMLElement;
        child.style.setProperty("max-height", "none", "important");
        child.style.setProperty("overflow", "visible", "important");
      });
      // Miroir « Mesures poids statiques » : rendu hors écran remis à l'origine
      // du clone, sans transformation. La réduction 0,82 est appliquée lors de
      // l'insertion dans le PDF, après une capture intégrale nette.
      pick("[data-pdf-compact]").forEach((node) => {
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
        // Marge basse renforcée : la rangée « Poids d'équilibre » ne colle plus
        // à la bordure inférieure du cadre.
        frame.style.setProperty("padding-bottom", "24px", "important");
        frame.style.setProperty("margin-bottom", "16px", "important");
        frame.style.setProperty("transform", "none", "important");
      });
      // Aucun conteneur interne ni parent ne doit rogner le cadre : ni la
      // bordure basse, ni les touches à l'extrême droite du clavier.
      pick("[data-pdf-compact] *").forEach((node) => {
        const el = node as HTMLElement;
        el.style.setProperty("max-height", "none", "important");
        el.style.setProperty("overflow", "visible", "important");
      });
      pick("[data-pdf-compact]").forEach((node) => {
        let parent = (node as HTMLElement).parentElement;
        while (parent && parent !== doc.body) {
          parent.style.setProperty("overflow", "visible", "important");
          parent.style.setProperty("max-width", "none", "important");
          parent = parent.parentElement;
        }
      });
      // Centrage horizontal absolu des chiffres du tableau (page 1) : styles
      // en ligne posés directement sur chaque champ et son conteneur, car
      // html2canvas ignore une partie des règles utilitaires de mise en page.
      pick("[data-pdf-compact] input").forEach((node) => {
        const input = node as HTMLElement;
        input.style.textAlign = "center";
        input.style.paddingLeft = "0px";
        input.style.paddingRight = "0px";
        input.style.margin = "0px";
        input.style.setProperty("text-align-last", "center", "important");
        input.style.setProperty("justify-content", "center", "important");
        input.style.setProperty("font-weight", "bold", "important");
        input.style.setProperty("width", "100%", "important");
        input.style.setProperty("text-indent", "0", "important");
        const cell = input.parentElement;
        if (cell) {
          cell.style.textAlign = "center";
          cell.style.paddingLeft = "0px";
          cell.style.paddingRight = "0px";
          cell.style.margin = "0px";
          cell.style.setProperty("display", "flex", "important");
          cell.style.setProperty("align-items", "center", "important");
          cell.style.setProperty("justify-content", "center", "important");
          cell.style.setProperty("text-align-last", "center", "important");
          cell.style.setProperty("width", "100%", "important");
        }
      });
      // Cadres graphiques (pages 2 et 3) : styles imposés en ligne pour que le
      // cadre « Friction » ne sorte plus brisé, sans bordure ni décalé.
      pick("[data-pdf-chart]").forEach((node) => {
        const chart = node as HTMLElement;
        chart.style.setProperty("width", "100%", "important");
        chart.style.setProperty("max-width", "100%", "important");
        chart.style.setProperty("display", "block", "important");
        chart.style.setProperty("border", "1px solid #e2e8f0", "important");
        chart.style.setProperty("border-radius", "0.5rem", "important");
        chart.style.setProperty("background-color", "#ffffff", "important");
        chart.style.setProperty("padding", "1rem", "important");
        chart.style.setProperty("overflow", "visible", "important");
      });
    },
  });
  // Encodage : PNG natif sans perte pour TOUS les blocs (tableau et
  // graphiques). Le JPEG introduisait des artefacts visibles sur les tracés
  // et les libellés techniques.
  const format: "PNG" | "JPEG" = "PNG";
  const dataUrl = canvas.toDataURL("image/png");
  console.info(
    `[pdf] capture ${compact ? "tableau" : chart ? "graphique" : "bloc"} : ${Math.round(performance.now() - started)} ms`,
  );
  return {
    dataUrl,
    format,
    width: canvas.width,
    height: canvas.height,
    insertionScale: compact ? COMPACT_SCALE : 1,
  };
}



const HEADER_H = 14; // mm réservés en haut des pages 2 et 3

/** Échelle (mm/px) tenant dans une page A4 paysage pour une pile de blocs. */
function pageRatio(blocks: Capture[], topOffset: number): number {
  const availW = PAGE_W - MARGIN * 2;
  const availH = PAGE_H - MARGIN * 2 - topOffset - GAP * (blocks.length - 1) - 6;
  const maxPxW = Math.max(...blocks.map((b) => b.width * b.insertionScale));
  const totalPxH = blocks.reduce((sum, b) => sum + b.height * b.insertionScale, 0);
  return Math.min(availW / maxPxW, availH / totalPxH);
}

/** Empile verticalement les blocs capturés sur une page A4 paysage, à l'échelle imposée. */
function drawPage(pdf: jsPDF, blocks: Capture[], ratio: number, topOffset: number) {
  const availW = PAGE_W - MARGIN * 2;
  let y = MARGIN + topOffset;
  for (const block of blocks) {
    const w = block.width * block.insertionScale * ratio;
    const h = block.height * block.insertionScale * ratio;
    const x = MARGIN + (availW - w) / 2;
    pdf.addImage(block.dataUrl, block.format ?? "PNG", x, y, w, h, undefined, "FAST");
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
 * Capture les blocs page par page (html2canvas), en extraction brute : les
 * nœuds sont utilisés tels quels, sans lecture d'état applicatif.
 */
export async function captureReportPages(pages: HTMLElement[][]): Promise<ReportCaptures> {
  // Les blocs (miroir fixe hors écran + graphiques) sont déjà peints en
  // mémoire : une seule frame d'attente suffit, l'export reste immédiat.
  await settle(0);
  const total = performance.now();
  // Captures séquentielles avec restitution de la main à l'affichage entre
  // chacune : html2canvas travaille de toute façon sur l'unique fil de rendu,
  // les lancer ensemble ne partage aucun travail et fige l'écran. Ici le
  // message « Export en cours... » reste peint pendant toute l'opération.
  const captured: ReportCaptures = [];
  for (const page of pages) {
    const shots: Capture[] = [];
    for (const block of page) {
      if (!block || !isRenderable(block)) continue;
      // Étanchéité totale : un bloc non capturable est ignoré, jamais bloquant.
      try {
        const shot = await capture(block);
        if (shot.width > 0 && shot.height > 0) shots.push(shot);
      } catch (error) {
        console.warn("[pdf] bloc ignoré", error);
      }
      await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));
    }
    if (shots.length > 0) captured.push(shots);
  }
  console.info(`[pdf] captures totales : ${Math.round(performance.now() - total)} ms`);
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

/**
 * OUTIL DE DÉBOGAGE TEMPORAIRE : capture html2canvas brute d'un seul bloc
 * (cadre « Mesures poids statiques ») et téléchargement direct en PNG,
 * sans passer par jsPDF, pour analyse visuelle du recadrage.
 */
export async function downloadDebugPng(el: HTMLElement, filename: string): Promise<void> {
  const shot = await capture(el);
  const link = document.createElement("a");
  link.href = shot.dataUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
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


/**
 * Extraction brute du miroir PDF « Mesures poids statiques » (conteneur fixe
 * de 1250px placé hors écran). Le nœud est récupéré directement dans le DOM,
 * sans passer par les refs React ni par la pile Undo/Redo.
 */
export function rawPdfMirror(): HTMLElement | null {
  return document.querySelector<HTMLElement>("[data-pdf-compact]");
}

// ---------------------------------------------------------------------------
// Rapport autonome de la page Comparer : 3 pages A4 PORTRAIT, encodage PNG
// natif sans perte (scale 2), pied de page « Page X / 3 ».
// ---------------------------------------------------------------------------
const P_W = 210; // mm (A4 portrait)
const P_H = 297;

function portraitRatio(blocks: Capture[]): number {
  const availW = P_W - MARGIN * 2;
  const availH = P_H - MARGIN * 2 - GAP * (blocks.length - 1) - 6;
  const maxPxW = Math.max(...blocks.map((b) => b.width * b.insertionScale));
  const totalPxH = blocks.reduce((sum, b) => sum + b.height * b.insertionScale, 0);
  return Math.min(availW / maxPxW, availH / totalPxH);
}

function drawPortraitPage(pdf: jsPDF, blocks: Capture[], ratio: number) {
  const availW = P_W - MARGIN * 2;
  let y = MARGIN;
  for (const block of blocks) {
    const w = block.width * block.insertionScale * ratio;
    const h = block.height * block.insertionScale * ratio;
    const x = MARGIN + (availW - w) / 2;
    pdf.addImage(block.dataUrl, "PNG", x, y, w, h, undefined, "FAST");
    y += h + GAP;
  }
}

/** Capture puis télécharge le comparatif en A4 portrait (3 pages, PNG). */
export async function generatePortraitReport(
  pages: HTMLElement[][],
  filename: string,
  /** Numéro de la première page imprimée (section comparative : 4). */
  startPage = 1,
  /** Nombre total affiché au pied de page (section comparative : 5). */
  totalPages?: number,
): Promise<void> {
  const captured = await captureReportPages(pages);
  if (captured.length === 0) return;
  const pdf = new jsPDF({ orientation: "portrait", format: "a4", unit: "mm" });
  const total = totalPages ?? startPage - 1 + captured.length;
  const stamp = exportStamp();
  captured.forEach((blocks, index) => {
    if (index > 0) pdf.addPage("a4", "portrait");
    drawPortraitPage(pdf, blocks, portraitRatio(blocks));
    pdf.setFontSize(7);
    pdf.setTextColor(120);
    pdf.text(`Page ${startPage + index} / ${total}`, P_W - MARGIN, P_H - MARGIN - 3, { align: "right" });
    pdf.text(`Exporté le : ${stamp}`, P_W - MARGIN, P_H - MARGIN, { align: "right" });
    pdf.setTextColor(0);
  });
  pdf.save(filename);
}

// ---------------------------------------------------------------------------
// Section comparative : 3 pages A4 PAYSAGE (4, 5 et 6).
// Page 4 : titre souligné + « Réglages » (gauche) et « Moyennes » (droite)
// côte à côte. Pages 5 et 6 : une paire de graphiques empilée par page.
// ---------------------------------------------------------------------------

/** Une page paysage : blocs côte à côte (row) ou empilés (column). */
export type LandscapePage = {
  blocks: HTMLElement[];
  layout: "row" | "column";
  title?: string;
};

/**
 * Dessine les blocs côte à côte à HAUTEUR STRICTEMENT ÉGALE (même bordure
 * inférieure) et centrés verticalement dans la hauteur utile de la page.
 */
function drawRow(pdf: jsPDF, blocks: Capture[], topOffset: number) {
  const availW = PAGE_W - MARGIN * 2 - GAP * (blocks.length - 1);
  const availH = PAGE_H - MARGIN * 2 - topOffset - 6;
  // Rapport largeur/hauteur de chaque bloc : à hauteur commune H, la largeur
  // totale vaut H × Σ(aspect). On choisit la plus grande hauteur qui tient.
  const aspects = blocks.map((b) => (b.width * b.insertionScale) / (b.height * b.insertionScale));
  const totalAspect = aspects.reduce((sum, a) => sum + a, 0);
  const h = Math.min(availH, availW / totalAspect);
  const totalW = h * totalAspect + GAP * (blocks.length - 1);
  let x = MARGIN + (PAGE_W - MARGIN * 2 - totalW) / 2;
  const y = MARGIN + topOffset + (availH - h) / 2;
  blocks.forEach((block, index) => {
    const w = h * (aspects[index] ?? 1);
    pdf.addImage(block.dataUrl, "PNG", x, y, w, h, undefined, "FAST");
    x += w + GAP;
  });
}

/** Titre officiel centré, noir intense et souligné, en haut de la page 4. */
function drawTitle(pdf: jsPDF, title: string): number {
  pdf.setTextColor(0);
  pdf.setFontSize(14);
  pdf.setFont("helvetica", "bold");
  const y = MARGIN + 6;
  pdf.text(title, PAGE_W / 2, y, { align: "center" });
  const w = pdf.getTextWidth(title);
  pdf.setLineWidth(0.4);
  pdf.line((PAGE_W - w) / 2, y + 1.4, (PAGE_W + w) / 2, y + 1.4);
  pdf.setFont("helvetica", "normal");
  return 12; // mm réservés par le titre
}

/** Capture puis télécharge la section comparative en A4 paysage. */
export async function generateComparisonReport(
  pages: LandscapePage[],
  filename: string,
  startPage = 4,
  totalPages = 6,
): Promise<void> {
  const captured = await captureReportPages(pages.map((page) => page.blocks));
  if (captured.length === 0) return;
  const pdf = new jsPDF({ orientation: "landscape", format: "a4", unit: "mm" });
  const stamp = exportStamp();
  captured.forEach((blocks, index) => {
    if (index > 0) pdf.addPage("a4", "landscape");
    const page = pages[index];
    const topOffset = page?.title ? drawTitle(pdf, page.title) : 0;
    if (page?.layout === "row" && blocks.length > 1) {
      drawRow(pdf, blocks, topOffset);
    } else {
      drawPage(pdf, blocks, pageRatio(blocks, topOffset), topOffset);
    }
    drawFooter(pdf, startPage + index, totalPages, stamp);
  });
  pdf.save(filename);
}
