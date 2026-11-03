// Pesée Tablette (laboratoire) — agencement paysage pour tablette.
// Page isolée : n'altère pas la page Pesée bureau. Lit et écrit le même
// brouillon local (ptw_draft_rows) via zoom-edit, donc les deux vues restent
// synchronisées. Le dessin réutilise les mêmes classes CSS que le clavier
// bureau, rendu à taille native puis agrandi par homothétie stricte (scale).
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import type React from "react";
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { useLang } from "@/data/translations";
import { DRAFT_EDITED_EVENT } from "@/lib/zoom-edit";
import { SECURITY_BACKUP_KEY } from "@/lib/kw-file";
import { useTopbarState } from "@/lib/topbar-store";

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
const BLACK_RATIO = 0.605;
/** Largeur native d'une touche blanche (référence bureau ~1280 px). */
const NATIVE_WHITE = 41;
const NATIVE_HEIGHT_REM = 12.6;
const LABELS_W = 128;

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
    const c = cols[i]!;
    if (m.black) return { "--line-x": `${m.boundary - c.start}px` } as CSSProperties;
    const ws = m.start - c.start;
    return {
      "--shift": `${(m.start + m.end) / 2 - (c.start + c.end) / 2}px`,
      "--wstart": `${ws}px`,
      "--sep": ws < 0 ? "0px" : "var(--hairline, 1px)",
    } as CSSProperties;
  });
  const left = cols[0]!.start;
  const width = cols[cols.length - 1]!.end - left;
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
  from, to, rows, editable, mini = false, active, onChange, onCommit, onFocusField, isVisible, weightFilter = "all", numberFontPx,
}: {
  from: number; to: number; rows: Row[]; editable: boolean; mini?: boolean;
  active?: { index: number; field: "wd" | "wa" } | null;
  onChange?: (index: number, field: "wd" | "wa", value: string) => void;
  onCommit?: () => void;
  onFocusField?: (index: number, field: "wd" | "wa") => void;
  isVisible?: (index: number) => boolean;
  weightFilter?: "all" | "wd" | "wa";
  numberFontPx?: number;
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
        const showNumber = !mini || C_KEYS.has(k);
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
              {!mini && (["wd", "wa"] as const).map((field) => {
                const isActive = active?.index === index && active.field === field;
                const shown = (!isVisible || isVisible(index)) && (weightFilter === "all" || weightFilter === field);
                if (!shown) return <div key={field} className={`weight-fields weight-fields-${field}`} />;
                return (
                  <div key={field} className={`weight-fields weight-fields-${field}`}>
                    {editable ? (
                      <input
                        type="text"
                        inputMode="none"
                        autoComplete="off"
                        aria-label={`${field === "wd" ? "PD" : "PR"} ${k}`}
                        value={rows[index]![field]}
                        onFocus={() => onFocusField?.(index, field)}
                        onChange={(e) => onChange?.(index, field, e.target.value.replace(/[^0-9.,]/g, ""))}
                        onBlur={() => onCommit?.()}
                        onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); }}
                        className={`weight-input !font-sans font-semibold !text-black focus:!border-2 focus:!border-black focus:!ring-0 focus:!outline-none ${isActive ? "!border-2 !border-black" : ""} ${black ? "" : "![background-color:#cbd5e1]"}`}
                        style={black ? { backgroundColor: "#cbd5e1" } : undefined}
                      />
                    ) : (
                      <span
                        className={`weight-input !font-sans font-semibold !text-black ${black ? "" : "![background-color:#cbd5e1]"}`}
                        style={{ backgroundColor: "#cbd5e1", textAlign: "center" }}
                      >
                        {rows[index]![field]}
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

/** Pavé numérique tactile dédié. Rangée basse : Vider / Annuler / Rétablir. */
function Keypad({ onKey, en, canUndo, canRedo }: { onKey: (k: string) => void; en: boolean; canUndo: boolean; canRedo: boolean }) {
  const keys = ["7", "8", "9", "4", "5", "6", "1", "2", "3", ",", "0", "⌫"];
  const btn = "flex h-16 items-center justify-center rounded-lg border border-input bg-background text-2xl font-semibold text-foreground shadow-sm active:bg-accent select-none disabled:opacity-30";
  return (
    <div className="grid w-[264px] shrink-0 grid-cols-3 gap-2" onPointerDown={(e) => e.preventDefault()}>
      {keys.map((k) => (
        <button key={k} type="button" className={btn} onClick={() => onKey(k)} aria-label={k === "⌫" ? (en ? "Delete" : "Effacer") : k}>
          {k}
        </button>
      ))}
      <button type="button" className={`${btn} text-base`} onClick={() => onKey("C")}>{en ? "Clear" : "Vider"}</button>
      <button type="button" className={btn} disabled={!canUndo} onClick={() => onKey("UNDO")} aria-label={en ? "Undo" : "Annuler"} title={en ? "Undo" : "Annuler"}>↶</button>
      <button type="button" className={btn} disabled={!canRedo} onClick={() => onKey("REDO")} aria-label={en ? "Redo" : "Rétablir"} title={en ? "Redo" : "Rétablir"}>↷</button>
    </div>
  );
}

function readInfo(): Record<string, string> {
  try {
    const raw = JSON.parse(window.localStorage.getItem("ptw_draft_info") ?? "null") as Record<string, unknown> | null;
    if (raw && typeof raw === "object") return Object.fromEntries(Object.entries(raw).map(([k, v]) => [k, String(v ?? "")]));
  } catch { /* illisible */ }
  return {};
}

function TabletWeighingPage() {
  const en = useLang() === "en";
  const navigate = useNavigate();
  const topbar = useTopbarState();
  const [rows, setRows] = useState<Row[]>(() => Array.from({ length: 88 }, () => ({ wd: "", wa: "" })));
  const [info, setInfo] = useState<Record<string, string>>({});
  const [octave, setOctave] = useState(0);
  const [active, setActive] = useState<{ index: number; field: "wd" | "wa" } | null>(null);
  const dirty = useRef(false);
  const rowsRef = useRef(rows);
  rowsRef.current = rows;

  useEffect(() => {
    setRows(readRows());
    setInfo(readInfo());
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
      return !v;
    });
  };
  const [viewFilter, setViewFilter] = useState<"all" | "white" | "black">("all");
  const [weightFilter, setWeightFilter] = useState<"all" | "wd" | "wa">("all");
  const [confirmReset, setConfirmReset] = useState(false);
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
    setActive(null);
    setConfirmReset(false);
  };

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

  const [from, to] = OCTAVES[octave]!;
  const full = useMemo(() => geometry(1, 88, NATIVE_WHITE), []);
  const nativeH = NATIVE_HEIGHT_REM * 16;

  // Mini-map : homothétie sur toute la largeur.
  const [miniRef, miniW] = useWidth();
  const miniScale = miniW > 0 ? miniW / full.width : 0.4;
  const seg = geometry(from, to, NATIVE_WHITE);
  const segOffset = full.cols[from - 1]!.start - full.left;

  // Glisser du viseur : suit le pointeur, l'octave bascule au relâchement.
  const [dragLeft, setDragLeft] = useState<number | null>(null);
  const dragging = useRef(false);
  const octCenters = useMemo(() => OCTAVES.map(([a, b]) => {
    const s = full.cols[a - 1]!.start - full.left;
    const e = full.cols[b - 1]!.end - full.left;
    return (s + e) / 2;
  }), [full]);
  const localX = (e: React.PointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    return (e.clientX - r.left) / miniScale;
  };
  const nearestOctave = (x: number) => {
    let best = 0;
    octCenters.forEach((c, i) => { if (Math.abs(c - x) < Math.abs(octCenters[best]! - x)) best = i; });
    return best;
  };
  const onMiniDown = (e: React.PointerEvent<HTMLDivElement>) => {
    dragging.current = true;
    e.currentTarget.setPointerCapture(e.pointerId);
    setDragLeft(localX(e) - seg.width / 2);
  };
  const onMiniMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging.current) return;
    const x = Math.max(0, Math.min(full.width - seg.width, localX(e) - seg.width / 2));
    setDragLeft(x);
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
  const octScale = octW > 0 ? Math.min(octW / (widest + LABELS_W), 3) : 1;

  // Swipe horizontal sur l'octave.
  const touchX = useRef<number | null>(null);

  const label = (k: "wd" | "wa") => (k === "wd" ? (en ? "Downweight" : "Poids descendant") : (en ? "Upweight" : "Poids remontant"));

  // Pavé numérique : agit sur la case active.
  const onKey = (k: string) => {
    if (!active) return;
    const cur = rowsRef.current[active.index]![active.field];
    if (k === "OK") {
      onCommit();
      const next = active.field === "wd" ? { index: active.index, field: "wa" as const } : active.index + 1 <= to - 1 ? { index: active.index + 1, field: "wd" as const } : null;
      setActive(next);
      return;
    }
    let v = cur;
    if (k === "⌫") v = cur.slice(0, -1);
    else if (k === "C") v = "";
    else if (k === ",") v = cur.includes(",") || cur.includes(".") ? cur : `${cur || "0"},`;
    else v = cur + k;
    onChange(active.index, active.field, v);
  };

  const arrowBtn = "shrink-0 cursor-pointer px-1 text-2xl leading-none !text-black hover:opacity-70 disabled:cursor-default disabled:opacity-20";

  return (
    <main className="mx-auto w-full max-w-[1280px] px-4 py-3">
      <div className="relative rounded-md border-2 border-foreground bg-card p-4 pt-5">
        <div className="absolute -top-3.5 left-4 flex max-w-[calc(100%-2rem)] items-baseline gap-2 whitespace-nowrap bg-card px-2 text-lg font-bold text-black">
          <span className="shrink-0">{en ? "Static touch weight measurements" : "Mesures poids statiques"}</span>
          <span className="shrink-0 text-muted-foreground">-</span>
          <span className="summary-text block min-w-0 flex-1 truncate" title={summaryLine}>{summaryLine}</span>
        </div>

        {/* Mini-map 88 touches + viseur glissable */}
        <div
          ref={miniRef}
          className="relative mt-2 w-full cursor-pointer touch-none overflow-hidden select-none"
          style={{ height: nativeH * miniScale }}
          onPointerDown={onMiniDown}
          onPointerMove={onMiniMove}
          onPointerUp={onMiniUp}
          onPointerCancel={() => { dragging.current = false; setDragLeft(null); }}
        >
          <div className="pointer-events-none absolute left-0 top-0 origin-top-left" style={{ transform: `scale(${miniScale})`, width: full.width }}>
            <div style={{ marginLeft: -full.left }}>
              <KeyGrid from={1} to={88} rows={rows} editable={false} mini />
            </div>
          </div>
          <div
            className={`pointer-events-none absolute top-0 rounded-sm border-2 border-foreground/60 bg-foreground/20 ${dragLeft === null ? "transition-all duration-300" : ""}`}
            style={{ left: viewLeft * miniScale, width: seg.width * miniScale, height: nativeH * miniScale }}
          />
        </div>

        {/* Octave zoomée + pavé numérique */}
        <div className="mt-4 flex items-center gap-3">
          <button type="button" aria-label={en ? "Previous octave" : "Octave précédente"} disabled={octave === 0} onClick={() => setOctave((o) => Math.max(0, o - 1))} className={arrowBtn}>◀</button>
          <div
            ref={octRef}
            className="relative min-w-0 flex-1 overflow-hidden"
            style={{ height: nativeH * octScale }}
            onTouchStart={(e) => { touchX.current = e.touches[0]?.clientX ?? null; }}
            onTouchEnd={(e) => {
              const start = touchX.current; touchX.current = null;
              const end = e.changedTouches[0]?.clientX;
              if (start === null || end === undefined || Math.abs(end - start) < 50) return;
              setOctave((o) => (end < start ? Math.min(OCTAVES.length - 1, o + 1) : Math.max(0, o - 1)));
            }}
          >
            <div className="absolute left-1/2 top-0 origin-top" style={{ transform: `translateX(-50%) scale(${octScale})` }}>
              <div className="technical-sheet" style={{ width: LABELS_W + seg.width, gridTemplateColumns: `${LABELS_W}px ${seg.width}px` }}>
                <div className="technical-labels" style={{ width: LABELS_W }}>
                  <div className="label-key">
                    <span className="inline-block rounded-md border border-foreground/20 bg-muted px-1.5 py-0.5">{noteLabel(from, en)}–{noteLabel(to, en)}</span>
                  </div>
                  <div className="label-wd">{label("wd")}</div>
                  <div className="label-wa">{label("wa")}</div>
                  <div className="label-wd-white">{label("wd")}</div>
                  <div className="label-wa-white">{label("wa")}</div>
                </div>
                <div style={{ marginLeft: -seg.left }}>
                  <KeyGrid key={octave} from={from} to={to} rows={rows} editable active={active} onChange={onChange} onCommit={onCommit} onFocusField={(index, field) => setActive({ index, field })} />
                </div>
              </div>
            </div>
          </div>
          <button type="button" aria-label={en ? "Next octave" : "Octave suivante"} disabled={octave === OCTAVES.length - 1} onClick={() => setOctave((o) => Math.min(OCTAVES.length - 1, o + 1))} className={arrowBtn}>▶</button>
          <Keypad onKey={onKey} en={en} />
        </div>

        {/* Actions */}
        <div className="mt-4 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => void navigate({ to: "/saisie" })}
            className="rounded-md border border-input bg-background px-4 py-2 text-sm font-semibold text-black hover:bg-accent"
          >
            {en ? "Edit piano info" : "Modifier info piano"}
          </button>
          <span className="text-sm text-muted-foreground">
            {en ? "Octave" : "Octave"} {octave + 1}/{OCTAVES.length} · {en ? "keys" : "touches"} {from}–{to}
          </span>
          {topbar.gateReady ? (
            <Link to="/resultats" className="rounded-md border border-green-700 bg-green-600 px-4 py-2 text-sm font-semibold !text-white">
              {en ? "Dashboard" : "Bilan"}
            </Link>
          ) : (
            <span aria-disabled="true" className="cursor-not-allowed rounded-md border border-input bg-muted px-4 py-2 text-sm font-semibold text-muted-foreground">
              {en ? "Dashboard" : "Bilan"}
            </span>
          )}
        </div>
      </div>
    </main>
  );
}
