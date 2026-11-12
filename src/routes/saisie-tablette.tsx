// Pesée Tablette (laboratoire) — agencement paysage pour tablette.
// Page isolée : n'altère pas la page Pesée bureau. Lit et écrit le même
// brouillon local (ptw_draft_rows) via zoom-edit, donc les deux vues restent
// synchronisées. Le dessin réutilise les mêmes classes CSS que le clavier
// bureau, rendu à taille native puis agrandi par homothétie stricte (scale).
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import type React from "react";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { useLang } from "@/data/translations";
import { DRAFT_EDITED_EVENT } from "@/lib/zoom-edit";
import { SECURITY_BACKUP_KEY, parseKwDocument, rememberKwDocument, kwSerial, differentSerial } from "@/lib/kw-file";
import { showTopbarAlert, setGateReady, setTopbarState } from "@/lib/topbar-store";
import { getPreferences } from "@/lib/preferences";
import { weighingReadiness, weighingLockMessage, OCTAVE_ADVANCE_MS } from "@/lib/weighing-readiness";
import { rememberWeighingCell, readWeighingCell, unlockWeighingAudio, playWeighingSound, playReadyChime } from "@/lib/weighing-feedback";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { CycleLabel } from "@/components/CycleLabel";
import { Redo2, Undo2 } from "lucide-react";
import { AutoDismissAlert } from "@/components/AutoDismissAlert";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

// Règles et messages copiés à l'identique de la Pesée bureau (saisie.tsx).
const WEIGHT_RANGES = { wd: [30, 90], wa: [10, 40] } as const;
const rangeMessage = (field: "wd" | "wa", en: boolean) =>
  field === "wd"
    ? en
      ? "⚠️ Out of shop range: Down weight (DW) must be between 30g and 90g."
      : "⚠️ Valeur hors plage d'atelier : Le Poids Descendant (PD) doit être compris entre 30g et 90g."
    : en
      ? "⚠️ Out of shop range: Up weight (UW) must be between 10g and 40g."
      : "⚠️ Valeur hors plage d'atelier : Le Poids Remontant (PR) doit être compris entre 10g et 40g.";
const PEDAL_MESSAGE_FR =
  "⚠️ Attention : Valeur élevée détectée. Assurez-vous que la pédale de sustain (forte) est bien enfoncée à fond durant la mesure pour libérer les étouffoirs.";
const PEDAL_MESSAGE_EN =
  "⚠️ Warning: high value detected. Make sure the sustain pedal is fully pressed during the measurement to release the dampers.";
const COHERENCE_MESSAGE =
  "⚠️ Erreur mécanique : Le Poids Descendant (PD) doit être strictement supérieur au Poids Remontant (PR) pour calculer la Friction.";
const parseW = (s: string) => {
  const t = s.trim().replace(",", ".");
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
};

export const Route = createFileRoute("/saisie-tablette")({
  head: () => ({
    meta: [
      { title: "Pesée Tablette — KeyWeight" },
      { name: "description", content: "Saisie des pesées des 88 touches en mode tablette paysage, octave par octave." },
      { property: "og:title", content: "Pesée Tablette — KeyWeight" },
      { property: "og:description", content: "Saisie des pesées des 88 touches en mode tablette paysage, octave par octave." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: TabletWeighingPage,
});

type Row = { wd: string; wa: string };
const DRAFT_ROWS_KEY = "ptw_draft_rows";
const BLACK_KEYS = new Set([
  2, 5, 7, 10, 12, 14, 17, 19, 22, 24, 26, 29, 31, 34, 36, 38, 41, 43, 46, 48, 50, 53, 55, 58, 60,
  62, 65, 67, 70, 72, 74, 77, 79, 82, 84, 86,
]);
const NATURAL_KEY_BREAKS = new Set([3, 10, 15, 22, 27, 34, 39, 46, 51, 58, 63, 70, 75, 82, 87]);
const C_KEYS = new Set([4, 16, 28, 40, 52, 64, 76, 88]);
/** Mode Rapide (identique au bureau) : index zéro-based des Do et Do#. */
const RAPID_INDEX_SET = new Set<number>([3, 4, 15, 16, 27, 28, 39, 40, 51, 52, 63, 64, 75, 76, 87]);
const BLACK_RATIO = 0.66;
/** Largeur native d'une touche blanche (référence bureau ~1280 px). */
const NATIVE_WHITE = 41;
const NATIVE_HEIGHT_REM = 12.6;


/** Octaves : La0–Si1 (1–15), puis Do→Si, la dernière inclut Do8 (76–88). */
const OCTAVES: Array<[number, number]> = [
  [1, 15], [16, 27], [28, 39], [40, 51], [52, 63], [64, 75], [76, 88],
];

const NOTE_FR = ["Do", "Do#", "Ré", "Ré#", "Mi", "Fa", "Fa#", "Sol", "Sol#", "La", "La#", "Si"];
const NOTE_EN = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const noteLabel = (k: number, en: boolean) => {
  const pc = (k + 8) % 12;
  const oct = Math.floor((k + 8) / 12);
  return `${(en ? NOTE_EN : NOTE_FR)[pc]}${oct}`;
};

function readRows(): Row[] {
  try {
    const raw = JSON.parse(window.localStorage.getItem(DRAFT_ROWS_KEY) ?? "null") as Row[] | null;
    if (Array.isArray(raw) && raw.length === 88) return raw.map((r) => ({ wd: String(r?.wd ?? ""), wa: String(r?.wa ?? "") }));
  } catch { /* brouillon illisible */ }
  return Array.from({ length: 88 }, () => ({ wd: "", wa: "" }));
}

function writeRows(rows: Row[]) {
  try {
    const prev = JSON.parse(window.localStorage.getItem(DRAFT_ROWS_KEY) ?? "null") as Array<Record<string, unknown>> | null;
    const merged = rows.map((r, i) => ({ ...(Array.isArray(prev) ? prev[i] ?? {} : {}), wd: r.wd, wa: r.wa }));
    window.localStorage.setItem(DRAFT_ROWS_KEY, JSON.stringify(merged));
    let info: unknown = {};
    try {
      const backup = JSON.parse(window.localStorage.getItem(SECURITY_BACKUP_KEY) ?? "null") as { info?: unknown } | null;
      info = JSON.parse(window.localStorage.getItem("ptw_draft_info") ?? "null") ?? backup?.info ?? {};
    } catch { /* garde */ }
    window.localStorage.setItem(SECURITY_BACKUP_KEY, JSON.stringify({ info, rows: merged, savedToFile: false, at: Date.now() }));
    window.dispatchEvent(new CustomEvent(DRAFT_EDITED_EVENT));
  } catch { /* stockage indisponible */ }
}

const num = (s: string) => {
  const v = Number(String(s).replace(",", "."));
  return s.trim() !== "" && Number.isFinite(v) ? v : null;
};

/** Même géométrie que useSnappedGrid (bureau), à largeur blanche fixe. */
function geometry(from: number, to: number, v: number) {
  const keys = Array.from({ length: to - from + 1 }, (_, i) => from + i);
  const b = 2 * Math.round((v * BLACK_RATIO) / 2);
  let whiteIdx = 0;
  const meta = keys.map((k) => {
    if (BLACK_KEYS.has(k)) {
      const boundary = whiteIdx * v;
      const start = boundary - b / 2;
      return { black: true, boundary, start, end: start + b };
    }
    const i = whiteIdx++;
    return { black: false, boundary: 0, start: i * v, end: (i + 1) * v };
  });
  const cols = meta.map((m, i) => {
    if (m.black) return { start: m.start, end: m.end };
    const prev = meta[i - 1];
    const next = meta[i + 1];
    return { start: prev?.black ? prev.end : m.start, end: next?.black ? next.start : m.end };
  });
  const vars = meta.map((m, i) => {
    const c = cols[i];
    if (!c) return {} as CSSProperties;
    if (m.black) return { "--line-x": `${m.boundary - c.start}px` } as CSSProperties;
    const ws = m.start - c.start;
    return {
      "--shift": `${(m.start + m.end) / 2 - (c.start + c.end) / 2}px`,
      "--wstart": `${ws}px`,
      "--sep": ws < 0 ? "0px" : "var(--hairline, 1px)",
    } as CSSProperties;
  });
  const left = cols[0]?.start ?? 0;
  const width = (cols[cols.length - 1]?.end ?? left) - left;
  return { keys, b, cols, vars, template: cols.map((c) => `${c.end - c.start}px`).join(" "), left, width };
}

/** Mesure la largeur disponible d'un conteneur. */
function useWidth() {
  const [w, setW] = useState(0);
  const ref = useCallback((node: HTMLDivElement | null) => {
    if (!node) return;
    const ro = new ResizeObserver(() => setW(node.getBoundingClientRect().width));
    ro.observe(node);
    setW(node.getBoundingClientRect().width);
  }, []);
  return [ref, w] as const;
}

function KeyGrid({
  from, to, rows, editable, mini = false, active, onChange, onCommit, onFocusField, onBlurField, onNavigate, isVisible, weightFilter = "all", numberFontPx, registerInput,
}: {
  from: number; to: number; rows: Row[]; editable: boolean; mini?: boolean;
  active?: { index: number; field: "wd" | "wa" } | null;
  onChange?: (index: number, field: "wd" | "wa", value: string) => void;
  onCommit?: () => void;
  onFocusField?: (index: number, field: "wd" | "wa") => void;
  onBlurField?: (index: number, field: "wd" | "wa") => void;
  onNavigate?: (e: React.KeyboardEvent<HTMLInputElement>, index: number, field: "wd" | "wa") => void;
  isVisible?: (index: number) => boolean;
  weightFilter?: "all" | "wd" | "wa";
  numberFontPx?: number;
  registerInput?: (index: number, field: "wd" | "wa", el: HTMLInputElement | null) => void;
}) {
  const g = useMemo(() => geometry(from, to, NATIVE_WHITE), [from, to]);
  const style = {
    gridTemplateColumns: g.template,
    width: `${g.width}px`,
    "--black-col": `${g.b}px`,
    "--white-col": `${NATIVE_WHITE}px`,
    "--hairline": "1px",
  } as CSSProperties;
  return (
    <div className="piano-grid" style={style}>
      {g.keys.map((k, i) => {
        const index = k - 1;
        const black = BLACK_KEYS.has(k);
        const leftBlack = !black && BLACK_KEYS.has(k - 1);
        const rightBlack = !black && BLACK_KEYS.has(k + 1);
        const shift = leftBlack === rightBlack ? "" : leftBlack ? "shift-left" : "shift-right";
        const showNumber = !mini;
        return (
          <div
            key={k}
            style={g.vars[i]}
            className={`piano-measure-column ${black ? "is-black" : "is-white"} ${shift} ${NATURAL_KEY_BREAKS.has(k) ? "natural-key-break" : ""} ${k === to ? "is-last-key" : ""}`}
          >
            <div
              className={`key-number ${C_KEYS.has(k) ? "is-c-key" : ""} ${numberFontPx ? "!font-sans" : ""}`}
              style={numberFontPx ? { fontSize: numberFontPx, fontWeight: 700, WebkitTextStroke: 0, whiteSpace: "nowrap" } : undefined}
            >
              {showNumber ? k : "\u00A0"}
            </div>
            <div className="key-body">
              {(["wd", "wa"] as const).map((field) => {
                const isActive = active?.index === index && active.field === field;
                const shown = (!isVisible || isVisible(index)) && (weightFilter === "all" || weightFilter === field);
                if (!shown) return <div key={field} className={`weight-fields weight-fields-${field}`} />;
                if (mini) {
                  // Mini-map : rectangles de saisie vides, repères visuels des
                  // filtres Touches et PD/PR (jamais de chiffres à cette échelle).
                  return (
                    <div key={field} className={`weight-fields weight-fields-${field}`}>
                      <span className="weight-input tablet-mini-progress" data-filled={Boolean(rows[index]?.[field]?.trim())} />
                    </div>
                  );
                }
                return (
                  <div key={field} className={`weight-fields weight-fields-${field}`}>
                    {editable ? (
                      <input
                        ref={(el) => registerInput?.(index, field, el)}
                        type="text"
                        inputMode="none"
                        autoComplete="off"
                        maxLength={2}
                        aria-label={`${field === "wd" ? "PD" : "PR"} ${k}`}
                        value={rows[index]?.[field] ?? ""}
                        onFocus={(e) => { onFocusField?.(index, field); e.currentTarget.select(); }}
                        onClick={(e) => { onFocusField?.(index, field); e.currentTarget.select(); }}
                        onChange={(e) => onChange?.(index, field, e.target.value.replace(/[^0-9]/g, "").slice(0, 2))}
                        onBlur={() => { onBlurField?.(index, field); onCommit?.(); }}
                        onKeyDown={(e) => onNavigate?.(e, index, field)}
                        className={`weight-input !font-sans font-semibold !text-black focus:!border-2 focus:!border-black focus:!ring-0 focus:!outline-none ${isActive ? "!border-2 !border-black" : ""} ${black ? "" : "![background-color:#cbd5e1]"}`}
                        style={black ? { backgroundColor: "#cbd5e1" } : undefined}
                      />
                    ) : (
                      <span
                        className={`weight-input !font-sans font-semibold !text-black ${black ? "" : "![background-color:#cbd5e1]"}`}
                        style={{ backgroundColor: "#cbd5e1", textAlign: "center" }}
                      >
                        {rows[index]?.[field] ?? ""}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/** Pavé numérique tactile 3 × 4 : chiffres, puis Annuler / 0 / Rétablir
    (icônes identiques à la page bureau). Dimensions adaptatives bornées. */
function Keypad({ onKey, en, canUndo, canRedo, height }: { onKey: (k: string) => void; en: boolean; canUndo: boolean; canRedo: boolean; height: number }) {
  const keys = ["7", "8", "9", "4", "5", "6", "1", "2", "3"];
  const btn = "tablet-keypad-button h-full min-h-0 self-stretch py-0 flex items-center justify-center rounded-md font-bold !text-black select-none disabled:!opacity-100 hover:!bg-white";
  return (
    <div className="tablet-keypad tablet-keypad-frame grid shrink-0 grid-cols-3 grid-rows-4" style={{ height }} onPointerDown={(e) => e.preventDefault()}>
      {keys.map((k) => (
        <Button variant="outline" key={k} type="button" className={btn} onClick={() => onKey(k)}>
          {k}
        </Button>
      ))}
      <Button variant="outline" type="button" className={btn} disabled={!canUndo} onClick={() => onKey("UNDO")} aria-label={en ? "Undo" : "Annuler"} title={en ? "Undo" : "Annuler"}><Undo2 strokeWidth={2.75} className={`h-[1.1em] w-[1.1em] ${canUndo ? "" : "text-muted-foreground"}`} /></Button>
      <Button variant="outline" type="button" className={btn} onClick={() => onKey("0")}>0</Button>
      <Button variant="outline" type="button" className={btn} disabled={!canRedo} onClick={() => onKey("REDO")} aria-label={en ? "Redo" : "Rétablir"} title={en ? "Redo" : "Rétablir"}><Redo2 strokeWidth={2.75} className={`h-[1.1em] w-[1.1em] ${canRedo ? "" : "text-muted-foreground"}`} /></Button>
    </div>
  );
}

/** Texte explicatif du bouton Pesée : Libre / Do-Do# (identique bureau). */
function WeighingModeHelp({ en }: { en: boolean }) {
  return (
    <>
      <p>{en ? "Free: weigh at least 2 notes per octave to access the Dashboard." : "Libre : peser au moins 2 notes par octave pour accéder au Bilan."}</p>
      <p className="mt-2">{en ? "C-C#: weigh every C and C# to access the Dashboard." : "Do-Do# : peser chaque Do et Do# pour accéder au Bilan."}</p>
    </>
  );
}

function readInfo(): Record<string, string> {
  try {
    const raw = JSON.parse(window.localStorage.getItem("ptw_draft_info") ?? "null") as Record<string, unknown> | null;
    if (raw && typeof raw === "object") return Object.fromEntries(Object.entries(raw).map(([k, v]) => [k, String(v ?? "")]));
  } catch { /* illisible */ }
  return {};
}

export function TabletWeighingPage({ onFullView, onPianoInfo }: { onFullView?: () => void; onPianoInfo?: () => void } = {}) {
  const en = useLang() === "en";
  const navigate = useNavigate();

  const [rows, setRows] = useState<Row[]>(() => Array.from({ length: 88 }, () => ({ wd: "", wa: "" })));
  const [info, setInfo] = useState<Record<string, string>>({});
  const [octave, setOctave] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [pressedArrow, setPressedArrow] = useState<"prev" | "next" | null>(null);
  const [active, setActive] = useState<{ index: number; field: "wd" | "wa" } | null>(null);
  const dirty = useRef(false);
  const importInput = useRef<HTMLInputElement | null>(null);
  /** Équivalent tactile de input.select() : la prochaine frappe remplace la valeur. */
  const replaceNext = useRef(true);
  type Cell = { index: number; field: "wd" | "wa" };
  type Feedback = Cell & { text: string; tick: number; kind: "range" | "mechanical" | "incomplete" | "pedal" | "form" };
  const [alert, setAlertState] = useState<Feedback | null>(null);
  const alertRef = useRef<Feedback | null>(null);
  const setAlert = (value: Feedback | null) => { alertRef.current = value; setAlertState(value); };
  const [alertAnchor, setAlertAnchor] = useState<{ x: number; y: number } | null>(null);
  const [focusRequest, setFocusRequest] = useState<(Cell & { token: number }) | null>(null);
  const focusing = useRef(false);
  const pendingCaret = useRef<(Cell & { position: number }) | null>(null);
  const hidePedal = useRef(false);
  const rowsRef = useRef(rows);
  rowsRef.current = rows;

  /** Références DOM des cases : vrai focus + sélection à l'avance automatique,
      y compris lorsque la case suivante se trouve dans une autre octave. */
  const inputs = useRef(new Map<string, HTMLInputElement>());
  const registerInput = useCallback((index: number, field: "wd" | "wa", el: HTMLInputElement | null) => {
    const key = `${index}-${field}`;
    if (el) inputs.current.set(key, el);
    else inputs.current.delete(key);
  }, []);
  const focusCell = useCallback((cell: Cell) => {
    setFocusRequest({ ...cell, token: Date.now() });
  }, []);
  useLayoutEffect(() => {
    if (!focusRequest) return;
    const el = inputs.current.get(`${focusRequest.index}-${focusRequest.field}`);
    if (!el) return;
    focusing.current = true;
    el.focus({ preventScroll: true });
    el.select();
    focusing.current = false;
  }, [focusRequest, octave]);

  useLayoutEffect(() => {
    const caret = pendingCaret.current;
    pendingCaret.current = null;
    if (!caret || replaceNext.current) return;
    const el = inputs.current.get(`${caret.index}-${caret.field}`);
    if (el && document.activeElement === el) el.setSelectionRange(caret.position, caret.position);
  }, [rows]);

  useLayoutEffect(() => {
    if (!alert) { setAlertAnchor(null); return; }
    const place = () => {
      const el = inputs.current.get(`${alert.index}-${alert.field}`);
      if (!el) { setAlertAnchor(null); return; }
      const r = el.getBoundingClientRect();
      const width = Math.min(352, window.innerWidth - 16);
      const right = r.right + 10;
      const x = right + width <= window.innerWidth - 8 ? right : Math.max(8, r.left - width - 10);
      setAlertAnchor({ x, y: Math.max(8, r.top - 4) });
    };
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => { window.removeEventListener("resize", place); window.removeEventListener("scroll", place, true); };
  }, [alert, octave]);
  useEffect(() => {
    if (alert?.kind !== "pedal") return;
    const timer = window.setTimeout(() => setAlert(null), 5000);
    return () => window.clearTimeout(timer);
  }, [alert]);

  useEffect(() => {
    setRows(readRows());
    setInfo(readInfo());
    const cell = readWeighingCell();
    if (cell) {
      soundingOctave.current = Math.max(0, OCTAVES.findIndex(([a, b]) => cell.index + 1 >= a && cell.index + 1 <= b));
      setActive(cell);
      setOctave(Math.max(0, OCTAVES.findIndex(([a, b]) => cell.index + 1 >= a && cell.index + 1 <= b)));
      focusCell(cell);
    }
    setLoaded(true);
    const reload = () => { if (!dirty.current) setRows(readRows()); setInfo(readInfo()); };
    window.addEventListener(DRAFT_EDITED_EVENT, reload);
    window.addEventListener("storage", reload);
    return () => {
      window.removeEventListener(DRAFT_EDITED_EVENT, reload);
      window.removeEventListener("storage", reload);
    };
  }, []);

  // Historique Annuler / Rétablir : un instantané par case modifiée.
  const undoStack = useRef<Row[][]>([]);
  const redoStack = useRef<Row[][]>([]);
  const [, setHistTick] = useState(0);
  const onChange = (index: number, field: "wd" | "wa", value: string) => {
    if (!dirty.current) {
      undoStack.current.push(rowsRef.current.map((r) => ({ ...r })));
      if (undoStack.current.length > 200) undoStack.current.shift();
      redoStack.current = [];
      setHistTick((t) => t + 1);
    }
    dirty.current = true;
    const next = rowsRef.current.map((r, i) => (i === index ? { ...r, [field]: value } : r));
    rowsRef.current = next;
    setRows(next);
  };
  const onCommit = () => {
    if (!dirty.current) return;
    writeRows(rowsRef.current);
    dirty.current = false;
  };
  // Même commande Fichier et même parseur .kw que le bureau ; pas de détour
  // par une autre page, ni reconstruction du carnet/historique importé.
  useEffect(() => {
    const openImport = () => {
      const currentInfo = readInfo();
      const hasWork = rowsRef.current.some((r) => r.wd || r.wa) || Boolean(currentInfo["marque"] || currentInfo["modele"]);
      if (hasWork && !window.confirm(en ? "Importing a piano will replace the current data. Continue?" : "Importer un piano remplacera les données en cours. Continuer ?")) return;
      importInput.current?.click();
    };
    window.addEventListener("piano-import-csv", openImport);
    return () => window.removeEventListener("piano-import-csv", openImport);
  }, [en]);
  const importFile = async (file: File | undefined) => {
    if (!file) return;
    try {
      const doc = parseKwDocument(await file.text());
      if (!doc) { showTopbarAlert("import", en ? "⚠️ Invalid .kw file." : "⚠️ Fichier .kw invalide."); return; }
      const currentSerial = kwSerial(readInfo());
      const incomingSerial = kwSerial(doc.info);
      if (differentSerial(currentSerial, incomingSerial) && !window.confirm(en
        ? `The file's serial number (${incomingSerial}) differs from the current piano (${currentSerial}). Replace the current data?`
        : `Le n° de série du fichier (${incomingSerial}) diffère du piano en cours (${currentSerial}). Remplacer les données en cours ?`)) return;
      cancelOctaveDelay();
      const loaded = doc.rows.map((r) => ({ ...r }));
      window.localStorage.setItem("ptw_draft_info", JSON.stringify(doc.info));
      window.localStorage.setItem(DRAFT_ROWS_KEY, JSON.stringify(loaded));
      window.localStorage.setItem(SECURITY_BACKUP_KEY, JSON.stringify({ info: doc.info, rows: loaded, savedToFile: true, at: Date.now() }));
      rememberKwDocument(doc);
      dirty.current = false;
      rowsRef.current = loaded;
      setRows(loaded);
      setInfo({ ...doc.info });
      undoStack.current = [];
      redoStack.current = [];
      setHistTick((t) => t + 1);
      setActive(null);
      setFocusRequest(null);
      setAlert(null);
      setConfirmReset(false);
      setOctave(0);
      window.dispatchEvent(new CustomEvent(DRAFT_EDITED_EVENT));
    } catch {
      showTopbarAlert("import", en ? "⚠️ Unable to load the file. Current data could not be replaced." : "⚠️ Chargement impossible. Les données en cours n’ont pas pu être remplacées.");
    }
  };
  const openDesktop = (weighing: boolean) => {
    cancelOctaveDelay();
    onCommit();
    try { window.sessionStorage.setItem("ptw_weighing_mode", weighing ? "1" : "0"); } catch { /* stockage indisponible */ }
    rememberWeighingCell(active);
    if (weighing && onFullView) { onFullView(); return; }
    if (!weighing && onPianoInfo) { onPianoInfo(); return; }
    void navigate({ to: "/saisie" });
  };
  const applySnapshot = (snap: Row[]) => {
    rowsRef.current = snap;
    setRows(snap);
    writeRows(snap);
    dirty.current = false;
    setHistTick((t) => t + 1);
  };
  const undo = () => {
    onCommit();
    const snap = undoStack.current.pop();
    if (!snap) return;
    redoStack.current.push(rowsRef.current.map((r) => ({ ...r })));
    applySnapshot(snap);
  };
  const redo = () => {
    const snap = redoStack.current.pop();
    if (!snap) return;
    undoStack.current.push(rowsRef.current.map((r) => ({ ...r })));
    applySnapshot(snap);
  };

  // Commandes identiques au bureau : Mode, Touches, PD/PR, Effacer.
  const [rapidMode, setRapidMode] = useState(false);
  useEffect(() => {
    try { setRapidMode(window.localStorage.getItem("ptw_rapid_mode") === "1"); } catch { /* indisponible */ }
  }, []);
  const toggleRapid = () => {
    setRapidMode((v) => {
      try { window.localStorage.setItem("ptw_rapid_mode", v ? "0" : "1"); } catch { /* indisponible */ }
      queueMicrotask(() => window.dispatchEvent(new CustomEvent(DRAFT_EDITED_EVENT)));
      return !v;
    });
  };
  const [viewFilter, setViewFilter] = useState<"all" | "white" | "black">("all");
  const [weightFilter, setWeightFilter] = useState<"all" | "wd" | "wa">("all");
  const [confirmReset, setConfirmReset] = useState(false);
  // ON à chaque ouverture, indépendamment du type d'écran et des anciens choix.
  const [showKeypad, setShowKeypad] = useState(true);
  const toggleKeypad = () => setShowKeypad((v) => !v);
  const isVisible = (index: number) => {
    if (rapidMode && !RAPID_INDEX_SET.has(index)) return false;
    if (viewFilter === "white") return !BLACK_KEYS.has(index + 1);
    if (viewFilter === "black") return BLACK_KEYS.has(index + 1);
    return true;
  };
  const hasData = rows.some((r) => r.wd.trim() || r.wa.trim());
  const doReset = () => {
    undoStack.current.push(rowsRef.current.map((r) => ({ ...r })));
    redoStack.current = [];
    applySnapshot(Array.from({ length: 88 }, () => ({ wd: "", wa: "" })));
    setConfirmReset(false);
    // Reset : curseur sur la 1ʳᵉ note prête (La 0 en Libre, Do 1 en Do/Do#), champ PD.
    goTo({ index: rapidMode ? 3 : 0, field: "wd" });
  };

  useEffect(() => {
    const shortcut = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey) || e.altKey) return;
      if (e.key.toLowerCase() !== "z" && e.key.toLowerCase() !== "y") return;
      e.preventDefault(); e.stopPropagation(); cancelOctaveDelay(); setAlert(null);
      if (e.shiftKey || e.key.toLowerCase() === "y") redo(); else undo();
    };
    window.addEventListener("keydown", shortcut, true);
    return () => window.removeEventListener("keydown", shortcut, true);
  }, [rows]);
  const soundingOctave = useRef(octave);
  useEffect(() => {
    if (!loaded) return;
    if (soundingOctave.current !== octave) playWeighingSound("octave");
    soundingOctave.current = octave;
  }, [octave, loaded]);

  // Flèches clavier ← / → (hors saisie) pour changer d'octave.
  useEffect(() => {
    const fn = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === "INPUT") return;
      if (e.key === "ArrowLeft") setOctave((o) => Math.max(0, o - 1));
      if (e.key === "ArrowRight") setOctave((o) => Math.min(OCTAVES.length - 1, o + 1));
    };
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, []);

  // Titre identique à la Pesée bureau.
  const summaryLine = useMemo(() => {
    const now = new Date();
    const p = (n: number) => String(n).padStart(2, "0");
    const year = info["fabrication"]?.trim() || "—";
    const serial = `${info["sn_prefix"] ?? ""}${info["sn_num"] ?? ""}${info["sn_suffix"] ?? ""}`;
    let white = 0; let black = 0;
    rows.forEach((r, i) => {
      if (r.wd.trim() === "" && r.wa.trim() === "") return;
      if (BLACK_KEYS.has(i + 1)) black++; else white++;
    });
    const v = (s: string | undefined) => (s ?? "").trim() || "—";
    return `${v(info["marque"])}\u00A0\u00A0${v(info["modele"])} - ${year} - SN ${serial || "—"} - ${en ? "Measurement" : "Mesure"} ${p(now.getDate())}-${p(now.getMonth() + 1)}-${now.getFullYear()} - ${p(now.getHours())}:${p(now.getMinutes())} - ${white} ${en ? "Whites" : "Blanches"} / ${black} ${en ? "Blacks" : "Noires"}`;
  }, [info, rows, en]);

  const [from, to] = OCTAVES[octave] ?? [1, 15];
  const full = useMemo(() => geometry(1, 88, NATIVE_WHITE), []);
  const nativeH = NATIVE_HEIGHT_REM * 16;

  // Mini-map : homothétie sur toute la largeur.
  const [miniRef, miniW] = useWidth();
  const miniScale = miniW > 0 ? miniW / full.width : 0.4;
  const seg = geometry(from, to, NATIVE_WHITE);
  const segOffset = (full.cols[from - 1]?.start ?? 0) - full.left;

  // Glisser du viseur : suit le pointeur, l'octave bascule au relâchement.
  const [dragLeft, setDragLeft] = useState<number | null>(null);
  const dragging = useRef(false);
  const octCenters = useMemo(() => OCTAVES.map(([a, b]) => {
    const s = (full.cols[a - 1]?.start ?? 0) - full.left;
    const e = (full.cols[b - 1]?.end ?? 0) - full.left;
    return (s + e) / 2;
  }), [full]);
  const localX = (e: React.PointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    return (e.clientX - r.left) / miniScale;
  };
  const nearestOctave = (x: number) => {
    let best = 0;
    octCenters.forEach((c, i) => { if (Math.abs(c - x) < Math.abs((octCenters[best] ?? 0) - x)) best = i; });
    return best;
  };
  const onMiniDown = (e: React.PointerEvent<HTMLDivElement>) => {
    dragging.current = true;
    e.currentTarget.setPointerCapture(e.pointerId);
    unlockWeighingAudio();
    cancelOctaveDelay();
    setOctave(nearestOctave(localX(e)));
    setDragLeft(localX(e) - seg.width / 2);
  };
  const onMiniMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging.current) return;
    const x = Math.max(0, Math.min(full.width - seg.width, localX(e) - seg.width / 2));
    setDragLeft(x);
    setOctave(nearestOctave(localX(e)));
  };
  const onMiniUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging.current) return;
    dragging.current = false;
    setOctave(nearestOctave(localX(e)));
    setDragLeft(null);
  };
  const viewLeft = dragLeft ?? segOffset;

  // Octave : un seul facteur pour toutes les octaves (basé sur la plus large).
  const [octRef, octW] = useWidth();
  const widest = useMemo(() => Math.max(...OCTAVES.map(([a, b]) => geometry(a, b, NATIVE_WHITE).width)), []);
  const [labelsRef, labelsW] = useWidth();
  const octScale = octW > 0 ? Math.min(Math.max(0.2, (octW - labelsW - 112) / widest), 3) : 1;

  // Swipe horizontal sur l'octave.
  const touchX = useRef<number | null>(null);

  const label = (k: "wd" | "wa") => (k === "wd" ? (en ? "Downweight" : "Poids descendant") : (en ? "Upweight" : "Poids remontant"));

  const canEnterWeights = ["marque", "modele", "sn_num", "type_piano", "fabrication", "usage_level"].every((k) => info[k]?.trim());
  const cleanWeight = (v: string) => v.replace(/[^0-9]/g, "").slice(0, 2);
  const outOfRange = (field: Cell["field"], v: number) => v < WEIGHT_RANGES[field][0] || v > WEIGHT_RANGES[field][1];
  const nextCell = (index: number, field: Cell["field"], direction: 1 | -1 = 1): Cell | null => {
    const cells: Cell[] = [];
    for (let i = 0; i < 88; i++) {
      if (!isVisible(i)) continue;
      for (const f of ["wd", "wa"] as const) if (weightFilter === "all" || weightFilter === f) cells.push({ index: i, field: f });
    }
    const pos = cells.findIndex((c) => c.index === index && c.field === field);
    return cells[pos + direction] ?? null;
  };
  const goTo = (cell: Cell | null) => {
    if (!cell) return;
    replaceNext.current = true;
    rememberWeighingCell(cell);
    setActive(cell);
    const o = OCTAVES.findIndex(([a, b]) => cell.index + 1 >= a && cell.index + 1 <= b);
    if (o >= 0) setOctave(o);
    focusCell(cell);
  };
  const showFeedback = (cell: Cell, text: string, kind: Feedback["kind"], select = true) => {
    setAlert({ ...cell, text, kind, tick: Date.now() });
    if (select) { replaceNext.current = true; focusCell(cell); }
  };
  const pairProblem = (index: number, leaving = false): { field: Cell["field"]; text: string; kind: Feedback["kind"] } | null => {
    const row = rowsRef.current[index];
    if (!row) return null;
    const wd = parseW(row.wd); const wa = parseW(row.wa);
    if (wd !== null && wa !== null && wd <= wa) return { field: "wa", text: en ? "⚠️ Mechanical error: Down weight (DW) must be strictly greater than Up weight (UW) to calculate Friction." : COHERENCE_MESSAGE, kind: "mechanical" };
    for (const field of ["wd", "wa"] as const) {
      const value = parseW(row[field]);
      if (value !== null && outOfRange(field, value) && (leaving || cleanWeight(row[field]).length === 2)) return { field, text: rangeMessage(field, en), kind: "range" };
    }
    if (leaving && (row.wd || row.wa) && (cleanWeight(row.wd).length !== 2 || cleanWeight(row.wa).length !== 2)) return {
      field: cleanWeight(row.wd).length !== 2 ? "wd" : "wa",
      text: en ? "⚠️ Incomplete entry: Down weight and Up weight must both be entered for this key." : "⚠️ Saisie incomplète : Le Poids Descendant et le Poids Remontant doivent être tous les deux renseignés pour cette touche.",
      kind: "incomplete",
    };
    return null;
  };
  const readiness = useMemo(() => weighingReadiness(rows, rapidMode), [rows, rapidMode]);
  const resultsReady = readiness.ready && canEnterWeights;
  const lockReason = !canEnterWeights
    ? en ? "Complete the piano information first." : "Complétez d’abord les informations du piano."
    : weighingLockMessage(readiness.issue, rapidMode, en);
  useEffect(() => {
    setGateReady(resultsReady);
    setTopbarState({ measuresReady: resultsReady, weighingMode: true, serialFilled: Boolean(info["sn_num"]?.trim()) });
  }, [resultsReady, info]);
  const readyChimeRef = useRef<boolean | null>(null);
  useEffect(() => {
    if (!loaded) return;
    if (readyChimeRef.current === false && resultsReady) playReadyChime();
    readyChimeRef.current = resultsReady;
  }, [resultsReady, loaded]);
  const formGuard = (cell: Cell) => {
    if (canEnterWeights) return true;
    showFeedback(cell, en ? "⚠️ First complete Brand, Piano type, Model, Serial number, Manufacturing date and Usage intensity." : "⚠️ Complétez d'abord Marque, Type de piano, Modèle, N° de série, Date fabrication et Intensité d'usage.", "form", false);
    return false;
  };
  const navigateCell = (origin: Cell, target: Cell | null, automatic = false) => {
    if (!target) return;
    const value = parseW(rowsRef.current[origin.index]?.[origin.field] ?? "");
    if (alertRef.current?.kind === "pedal" && alertRef.current.index === origin.index && alertRef.current.field === origin.field) { focusCell(origin); return; }
    if (value !== null && outOfRange(origin.field, value)) { showFeedback(origin, rangeMessage(origin.field, en), "range"); return; }
    const problem = pairProblem(origin.index, target.index !== origin.index);
    if (target.index !== origin.index && problem) { showFeedback({ index: origin.index, field: problem.field }, problem.text, problem.kind); goTo({ index: origin.index, field: problem.field }); return; }
    onCommit();
    goTo(target);
    if (automatic && origin.index !== target.index) playWeighingSound("key");
  };
  const octaveDelay = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cancelOctaveDelay = () => { if (octaveDelay.current) { clearTimeout(octaveDelay.current); octaveDelay.current = null; } };
  useEffect(() => cancelOctaveDelay, []);
  const validateAndAdvance = (index: number, field: Cell["field"], v: string) => {
    const cell = { index, field };
    setAlert(null);
    if (v.length < 2) return;
    const problem = pairProblem(index);
    if (problem?.kind === "mechanical") { showFeedback(cell, problem.text, problem.kind); return; }
    const value = parseW(v);
    if (value !== null && outOfRange(field, value)) { showFeedback(cell, rangeMessage(field, en), "range"); return; }
    let suppressed = hidePedal.current;
    try { suppressed ||= window.sessionStorage.getItem("ptw_hide_pedal_alert") === "1"; } catch { /* indisponible */ }
    if (field === "wd" && value !== null && value >= 70 && value <= 90 && !suppressed) {
      showFeedback(cell, en ? PEDAL_MESSAGE_EN : PEDAL_MESSAGE_FR, "pedal");
      onCommit(); return;
    }
    if (!getPreferences().autoAdvance || problem) return;
    const target = nextCell(index, field);
    const octOf = (i: number) => OCTAVES.findIndex(([a, b]) => i + 1 >= a && i + 1 <= b);
    if (target && octOf(target.index) !== octOf(index)) {
      // Dernière case : 0,5 s de relecture avant le saut automatique.
      onCommit();
      if (octaveDelay.current) clearTimeout(octaveDelay.current);
      octaveDelay.current = setTimeout(() => {
        octaveDelay.current = null;
        // Simule l'enfoncement de la flèche correspondant au saut automatique.
        const dir = octOf(target.index) > octOf(index) ? "next" : "prev";
        setPressedArrow(dir); setTimeout(() => setPressedArrow((p) => (p === dir ? null : p)), 200);
        navigateCell(cell, target, true);
      }, OCTAVE_ADVANCE_MS);
      return;
    }
    navigateCell(cell, target, true);
  };
  // Un seul chemin pour saisie physique et pavé : nettoyage, contrôles, avance.
  const onTyped = (index: number, field: Cell["field"], value: string) => {
    unlockWeighingAudio();
    cancelOctaveDelay();
    if (!formGuard({ index, field })) return;
    const cleaned = cleanWeight(value);
    replaceNext.current = false;
    pendingCaret.current = { index, field, position: cleaned.length };
    onChange(index, field, cleaned);
    validateAndAdvance(index, field, cleaned);
  };
  const onKey = (k: string) => {
    cancelOctaveDelay();
    if (k === "UNDO") { setAlert(null); undo(); return; }
    if (k === "REDO") { setAlert(null); redo(); return; }
    if (!active || !/^\d$/.test(k)) return;
    const el = inputs.current.get(`${active.index}-${active.field}`);
    const cur = rowsRef.current[active.index]?.[active.field] ?? "";
    const start = replaceNext.current ? 0 : el?.selectionStart ?? cur.length;
    const end = replaceNext.current ? cur.length : el?.selectionEnd ?? cur.length;
    const v = cleanWeight(cur.slice(0, start) + k + cur.slice(end));
    onTyped(active.index, active.field, v);
  };
  const onFocusField = (index: number, field: Cell["field"]) => {
    const cell = { index, field };
    cancelOctaveDelay();
    unlockWeighingAudio();
    rememberWeighingCell(cell);
    if (!focusing.current && active && active.index !== index) {
      const pedal = alertRef.current;
      if (pedal?.kind === "pedal" && pedal.index === active.index) { goTo(active); return; }
      const problem = pairProblem(active.index, true);
      if (problem) { const target = { index: active.index, field: problem.field }; showFeedback(target, problem.text, problem.kind); goTo(target); return; }
    }
    replaceNext.current = true;
    setActive(cell);
    if (!formGuard(cell)) return;
    if (!focusing.current) setAlert(null);
  };
  const onBlurField = (index: number, field: Cell["field"]) => {
    if (focusing.current || !canEnterWeights) return;
    const value = parseW(rowsRef.current[index]?.[field] ?? "");
    if (value !== null && outOfRange(field, value)) { showFeedback({ index, field }, rangeMessage(field, en), "range"); return; }
    // Vérifier la sortie après le changement réel de focus, sans temporisation.
    queueMicrotask(() => {
      const samePair = (["wd", "wa"] as const).some((f) => inputs.current.get(`${index}-${f}`) === document.activeElement);
      const problem = pairProblem(index, !samePair);
      if (problem && !samePair) { const cell = { index, field: problem.field }; showFeedback(cell, problem.text, problem.kind); goTo(cell); }
    });
  };
  const onNavigate = (e: React.KeyboardEvent<HTMLInputElement>, index: number, field: Cell["field"]) => {
    if (e.key === "Escape") { e.preventDefault(); clearSelection(); return; }
    if (!formGuard({ index, field })) { e.preventDefault(); return; }
    if (/^\d$/.test(e.key) && replaceNext.current && !e.ctrlKey && !e.metaKey && !e.altKey) { e.preventDefault(); onTyped(index, field, e.key); return; }
    if (!["Tab", "Enter", "ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.key)) return;
    e.preventDefault();
    if (e.repeat) return;
    const origin = { index, field };
    if (e.altKey && e.key === "Tab") {
      const keys = [...(viewFilter === "black" && !rapidMode ? new Set([...C_KEYS].map((k) => k + 1).filter((k) => k <= 88)) : C_KEYS)];
      const next = keys.find((k) => k > index + 1 && isVisible(k - 1));
      if (next !== undefined) navigateCell(origin, { index: next - 1, field: weightFilter === "wa" ? "wa" : "wd" });
      return;
    }
    if (pairProblem(index) && ["Tab", "Enter", "ArrowUp", "ArrowDown"].includes(e.key) && weightFilter === "all") {
      navigateCell(origin, { index, field: field === "wd" ? "wa" : "wd" }); return;
    }
    const direction = e.key === "ArrowLeft" || e.key === "ArrowUp" || (e.key === "Tab" && e.shiftKey) ? -1 : 1;
    navigateCell(origin, nextCell(index, field, direction));
  };
  const closePedal = () => {
    const origin = alertRef.current;
    setAlert(null);
    if (origin) { onCommit(); goTo(nextCell(origin.index, origin.field)); }
  };
  const clearSelection = () => {
    cancelOctaveDelay();
    focusing.current = true;
    if (document.activeElement instanceof HTMLInputElement && document.activeElement.classList.contains("weight-input")) document.activeElement.blur();
    focusing.current = false;
    setActive(null); setFocusRequest(null); pendingCaret.current = null;
    rememberWeighingCell(null); setAlert(null); onCommit();
  };
  useEffect(() => {
    const escape = (e: KeyboardEvent) => { if (e.key === "Escape") { e.preventDefault(); clearSelection(); } };
    const outside = (e: PointerEvent) => {
      const target = e.target instanceof Element ? e.target : null;
      if (target?.closest(".weight-input, .tablet-keypad, .weighing-view-toggle, [role=alert], [role=dialog], [role=alertdialog]")) return;
      clearSelection();
    };
    document.addEventListener("keydown", escape, true);
    document.addEventListener("pointerdown", outside, true);
    return () => { document.removeEventListener("keydown", escape, true); document.removeEventListener("pointerdown", outside, true); };
  });
  const cmdBtn = "tablet-command font-bold text-foreground shrink-0";
  const arrowBtn = "h-auto w-7 min-w-7 shrink-0 cursor-pointer px-1 text-2xl leading-none !text-black transition-transform duration-100 hover:opacity-70 active:scale-75 disabled:cursor-default disabled:opacity-20";

  return (
    <main className="tablet-weighing mx-auto w-full max-w-[1400px] px-6 pb-3 pt-[112px]">
      <input ref={importInput} type="file" accept=".kw,application/json" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; e.target.value = ""; void importFile(file); }} />
      <div className="relative rounded-md border-2 border-foreground bg-card p-4 pt-5">
        <div className="absolute -top-3.5 left-4 flex max-w-[calc(100%-2rem)] items-baseline gap-2 whitespace-nowrap bg-card px-2 text-lg font-bold text-black">
          <span className="shrink-0">{en ? "Static touch weight measurements" : "Mesures poids statiques"}</span>
          <span className="shrink-0 text-muted-foreground">-</span>
          <span className="summary-text block min-w-0 flex-1 truncate" title={summaryLine}>{summaryLine}</span>
        </div>

        {/* Numéros des Do au-dessus de la mini-map (taille réelle, police de l'appli) */}
        <div className="relative mt-1 h-3 w-full font-sans text-xs font-medium leading-none text-foreground select-none" aria-hidden="true">
          {[...C_KEYS].map((k) => {
            const c = full.cols[k - 1];
            if (!c) return null;
            const center = ((c.start + c.end) / 2 - full.left) * miniScale;
            return <span key={k} className="absolute bottom-0 -translate-x-1/2" style={{ left: center }}>{k}</span>;
          })}
        </div>
        {/* Mini-map 88 touches + viseur glissable */}
        <div
          ref={miniRef}
          className="tablet-mini-map relative mt-0 w-full cursor-pointer touch-none overflow-hidden select-none"
          style={{ height: 11.55 * 16 * miniScale + 2 }}
          onPointerDown={onMiniDown}
          onPointerMove={onMiniMove}
          onPointerUp={onMiniUp}
          onPointerCancel={() => { dragging.current = false; setDragLeft(null); }}
        >
          <div className="pointer-events-none absolute left-0 top-0 origin-top-left" style={{ transform: `scale(${miniScale})`, width: full.width }}>
            <div style={{ marginLeft: -full.left }}>
              <KeyGrid from={1} to={88} rows={rows} editable={false} mini isVisible={isVisible} weightFilter={weightFilter} />
            </div>
          </div>
          <div
            className={`pointer-events-none absolute rounded-sm border-2 border-foreground/60 bg-foreground/10 ${dragLeft === null ? "transition-all duration-300" : ""}`}
            style={{ top: 0, left: viewLeft * miniScale, width: seg.width * miniScale, height: 11.55 * 16 * miniScale }}
          />
        </div>

        {/* Octave zoomée + pavé numérique : [étiquettes] ◀ [octave] ▶ centrés à gauche du pavé */}
        <div className="mt-4 flex items-center gap-0 pr-10">
          <div
            ref={octRef}
            className="flex min-w-0 flex-1 items-center justify-center gap-2 overflow-hidden px-8"
            style={{ height: nativeH * octScale * 0.9 + 2 }}
            onTouchStart={(e) => { touchX.current = e.touches[0]?.clientX ?? null; }}
            onTouchEnd={(e) => {
              const start = touchX.current; touchX.current = null;
              const end = e.changedTouches[0]?.clientX;
              if (start === null || end === undefined || Math.abs(end - start) < 50) return;
              setOctave((o) => (end < start ? Math.min(OCTAVES.length - 1, o + 1) : Math.max(0, o - 1)));
            }}
          >
            <div ref={labelsRef} className="octave-labels relative shrink-0" style={{ height: nativeH * octScale * 0.9 + 2 }}>
              <div className="octave-label-content grid w-max text-right font-bold text-muted-foreground">
                <span className="invisible">{label("wd")}</span>
                <div className="absolute right-0 top-16"><span className="rounded-md border border-foreground/60 bg-muted px-1.5 py-1 text-xs font-bold text-foreground">Octave {octave + 1}</span></div>
                <div className="absolute right-0 -translate-y-1/2" style={{ top: 5.81 * 16 * octScale * 0.9 }}>{label("wd")}</div>
                <div className="absolute right-0 -translate-y-1/2" style={{ top: 6.96 * 16 * octScale * 0.9 }}>{label("wa")}</div>
                <div className="absolute right-0 -translate-y-1/2" style={{ top: 9.99 * 16 * octScale * 0.9 }}>{label("wd")}</div>
                <div className="absolute right-0 -translate-y-1/2" style={{ top: 11.04 * 16 * octScale * 0.9 }}>{label("wa")}</div>
              </div>
            </div>
            <Button variant="ghost" type="button" aria-label={en ? "Previous octave" : "Octave précédente"} disabled={octave === 0} onClick={() => { unlockWeighingAudio(); cancelOctaveDelay(); setOctave((o) => Math.max(0, o - 1)); }} className={`${arrowBtn} ${pressedArrow === "prev" ? "scale-75 opacity-60" : ""}`}>◀</Button>
            <div className="relative shrink-0 overflow-hidden" style={{ width: seg.width * octScale * 0.9, height: nativeH * octScale * 0.9 + 2 }}>
              <div className="tablet-keyboard absolute left-0 top-0 origin-top-left" style={{ transform: `scale(${octScale * 0.9})` }}>
                <div className="technical-sheet" style={{ width: seg.width, gridTemplateColumns: `${seg.width}px` }}>
                <div style={{ marginLeft: -seg.left }}>
                  <KeyGrid key={octave} from={from} to={to} rows={rows} editable active={active} onChange={onTyped} onCommit={onCommit} onFocusField={onFocusField} onBlurField={onBlurField} onNavigate={onNavigate} isVisible={isVisible} weightFilter={weightFilter} registerInput={registerInput} numberFontPx={12 / (octScale * 0.9)} />
                </div>
                </div>
              </div>
            </div>
            <Button variant="ghost" type="button" aria-label={en ? "Next octave" : "Octave suivante"} disabled={octave === OCTAVES.length - 1} onClick={() => { unlockWeighingAudio(); cancelOctaveDelay(); setOctave((o) => Math.min(OCTAVES.length - 1, o + 1)); }} className={`${arrowBtn} ${pressedArrow === "next" ? "scale-75 opacity-60" : ""}`}>▶</Button>
          </div>
          {showKeypad && <Keypad height={Math.max(180, 0.8 * (nativeH * octScale * 0.9 + 2))} onKey={onKey} en={en} canUndo={undoStack.current.length > 0} canRedo={redoStack.current.length > 0} />}
        </div>
        {alert && alertAnchor && (
          <div className="fixed z-[99999] w-[min(22rem,calc(100vw-1rem))]" style={{ left: alertAnchor.x, top: alertAnchor.y }}>
            {alert.kind === "pedal" ? (
              <div role="alert" className="rounded-md border border-border bg-popover p-3 text-xs font-semibold leading-4 text-popover-foreground shadow-md">
                {alert.text}
                <label className="mt-2 flex items-center gap-2 font-normal">
                  <input type="checkbox" onChange={(e) => { hidePedal.current = e.target.checked; try { if (e.target.checked) window.sessionStorage.setItem("ptw_hide_pedal_alert", "1"); } catch { /* indisponible */ } if (e.target.checked) closePedal(); }} />
                  {en ? "Do not show this message again" : "Ne plus afficher ce message"}
                </label>
                <div className="mt-2 flex justify-end"><Button variant="outline" size="sm" onClick={closePedal}>OK</Button></div>
              </div>
            ) : (
              <AutoDismissAlert show resetKey={alert.tick} className="block rounded-md border border-border bg-popover px-3 py-2 text-xs font-semibold leading-4 text-popover-foreground shadow-md">{alert.text}</AutoDismissAlert>
            )}
          </div>
        )}

        {confirmReset && (
          <div className="fixed inset-0 z-[100000] flex items-center justify-center bg-foreground/15 p-4" onClick={() => setConfirmReset(false)}>
            <div role="alertdialog" aria-modal="true" aria-label={en ? "Reset weighings" : "Effacer les pesées"} className="flex max-w-full flex-wrap items-center justify-center gap-3 rounded-md border border-border bg-background p-4 text-sm text-foreground shadow-lg" onClick={(e) => e.stopPropagation()}>
              <span>{en ? "Do you want to erase all weighing data?" : "Voulez-vous effacer toutes les données de pesées ?"}</span>
              <Button variant="outline" onClick={doReset}>{en ? "Yes" : "Oui"}</Button>
              <Button variant="outline" onClick={() => setConfirmReset(false)}>{en ? "No" : "Non"}</Button>
            </div>
          </div>
        )}

      </div>

        {/* Actions : sous le cadre, comme en Vue Complète */}
        <div className="tablet-commands mt-3 flex items-center justify-between overflow-x-auto pb-2">
          <Button variant="outline"
            type="button"
            onClick={() => openDesktop(false)}
            className="tablet-command shrink-0 rounded-md border border-input bg-background font-semibold text-foreground hover:bg-accent"
          >
            {en ? "← Edit Piano Info" : "← Modifier Infos piano"}
          </Button>
          <div className="tablet-commands flex shrink-0 flex-nowrap items-center justify-center">
            <Button type="button" variant="outline" onClick={() => openDesktop(true)} className={`${cmdBtn} weighing-view-toggle`}>
              <CycleLabel title={en ? "View" : "Vue"} value={en ? "Full" : "Complète"} />
            </Button>
            <TooltipProvider delayDuration={50}>
              <Tooltip>
                <TooltipTrigger asChild>
            <Button type="button" variant="outline" onClick={toggleRapid} className={cmdBtn}>
              <CycleLabel title={en ? "Weighing" : "Pesée"} value={rapidMode ? (en ? "C-C#" : "Do-Do#") : (en ? "Free" : "Libre")} />
            </Button>
                </TooltipTrigger>
                <TooltipContent side="top" className="w-[min(29rem,calc(100vw-2rem))] border border-border bg-card p-3 text-left text-foreground shadow-lg">
                  <WeighingModeHelp en={en} />
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <Button type="button" variant="outline" onClick={() => setViewFilter((c) => (c === "all" ? "white" : c === "white" ? "black" : "all"))} className={cmdBtn}>
              <CycleLabel title={en ? "Keys" : "Touches"} value={viewFilter === "all" ? (en ? "All" : "Toutes") : viewFilter === "white" ? (en ? "Whites" : "Blanches") : (en ? "Blacks" : "Noires")} />
            </Button>
            <Button type="button" variant="outline" onClick={() => setWeightFilter((c) => (c === "all" ? "wd" : c === "wd" ? "wa" : "all"))} className={cmdBtn}>
              <CycleLabel title={en ? "DW/UW" : "PD/PR"} value={weightFilter === "all" ? (en ? "All" : "Tous") : weightFilter === "wd" ? (en ? "Down" : "Descendants") : (en ? "Up" : "Remontants")} />
            </Button>
            <Button type="button" variant="outline" onClick={toggleKeypad} className={cmdBtn}>
              <CycleLabel title={en ? "Keypad" : "Pavé"} value={showKeypad ? (en ? "Shown" : "Affiché") : (en ? "Hidden" : "Masqué")} />
            </Button>
            <div className="relative flex items-center">
              <TooltipProvider delayDuration={50}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button type="button" variant="outline" disabled={!hasData} onClick={() => setConfirmReset(true)} className={cmdBtn}>Reset</Button>
                  </TooltipTrigger>
                  {hasData && <TooltipContent side="top">{en ? "Erases all current weighings" : "Efface toutes les pesées en cours"}</TooltipContent>}
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
          <TooltipProvider delayDuration={50}><Tooltip><TooltipTrigger asChild>
            <Button variant="outline" type="button" aria-disabled={!resultsReady}
              className={`tablet-command shrink-0 border-2 font-bold ${resultsReady ? "weighing-results-ready" : "border-input bg-background text-muted-foreground opacity-60"}`}
              onClick={() => {
                if (!resultsReady) { toast.error(lockReason); return; }
                onCommit(); void navigate({ to: "/resultats" });
              }}>
              {en ? "Dashboard >" : "Bilan >"}
            </Button>
          </TooltipTrigger>{!resultsReady && <TooltipContent side="top" className="max-w-72">{lockReason}</TooltipContent>}</Tooltip></TooltipProvider>
        </div>
    </main>
  );
}
