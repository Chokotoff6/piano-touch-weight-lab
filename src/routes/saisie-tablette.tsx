// Pesée Tablette (laboratoire) — agencement paysage pour tablette.
// Page isolée : n'altère pas la page Pesée bureau. Lit et écrit le même
// brouillon local (ptw_draft_rows) via zoom-edit, donc les deux vues restent
// synchronisées. Le dessin réutilise les mêmes classes CSS que le clavier
// bureau, rendu à taille native puis agrandi par homothétie stricte (scale).
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
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
  from, to, rows, editable, mini = false, active, onChange, onCommit, onFocusField,
}: {
  from: number; to: number; rows: Row[]; editable: boolean; mini?: boolean;
  active?: { index: number; field: "wd" | "wa" } | null;
  onChange?: (index: number, field: "wd" | "wa", value: string) => void;
  onCommit?: () => void;
  onFocusField?: (index: number, field: "wd" | "wa") => void;
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
            <div className={`key-number ${C_KEYS.has(k) ? "is-c-key" : ""}`}>{showNumber ? k : "\u00A0"}</div>
            <div className="key-body">
              {!mini && (["wd", "wa"] as const).map((field) => {
                const isActive = active?.index === index && active.field === field;
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

/** Pavé numérique tactile dédié (aperçu ergonomique). */
function Keypad({ onKey, en }: { onKey: (k: string) => void; en: boolean }) {
  const keys = ["7", "8", "9", "4", "5", "6", "1", "2", "3", ",", "0", "⌫"];
  const btn = "flex h-16 items-center justify-center rounded-lg border border-input bg-background text-2xl font-semibold text-foreground shadow-sm active:bg-accent select-none";
  return (
    <div className="grid w-[264px] shrink-0 grid-cols-3 gap-2" onPointerDown={(e) => e.preventDefault()}>
      {keys.map((k) => (
        <button key={k} type="button" className={btn} onClick={() => onKey(k)} aria-label={k === "⌫" ? (en ? "Delete" : "Effacer") : k}>
          {k}
        </button>
      ))}
      <button type="button" className={`${btn} text-base`} onClick={() => onKey("C")}>{en ? "Clear" : "Vider"}</button>
      <button type="button" className={`${btn} col-span-2 bg-foreground text-lg !text-background`} onClick={() => onKey("OK")}>
        {en ? "Enter ↵" : "Valider ↵"}
      </button>
    </div>
  );
}

function TabletWeighingPage() {
  const en = useLang() === "en";
  const navigate = useNavigate();
  const topbar = useTopbarState();
  const [rows, setRows] = useState<Row[]>(() => Array.from({ length: 88 }, () => ({ wd: "", wa: "" })));
  const [octave, setOctave] = useState(0);
  const dirty = useRef(false);
  const rowsRef = useRef(rows);
  rowsRef.current = rows;

  useEffect(() => {
    setRows(readRows());
    const reload = () => { if (!dirty.current) setRows(readRows()); };
    window.addEventListener(DRAFT_EDITED_EVENT, reload);
    window.addEventListener("storage", reload);
    return () => {
      window.removeEventListener(DRAFT_EDITED_EVENT, reload);
      window.removeEventListener("storage", reload);
    };
  }, []);

  const onChange = (index: number, field: "wd" | "wa", value: string) => {
    dirty.current = true;
    setRows((prev) => prev.map((r, i) => (i === index ? { ...r, [field]: value } : r)));
  };
  const onCommit = () => {
    if (!dirty.current) return;
    writeRows(rowsRef.current);
    dirty.current = false;
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

  const summary = useMemo(() => {
    const avg = (vals: number[]) => (vals.length ? (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1).replace(".", en ? "." : ",") : "—");
    const wd: number[] = []; const wa: number[] = []; const f: number[] = []; const pe: number[] = [];
    let filled = 0;
    rows.forEach((r) => {
      const d = num(r.wd); const a = num(r.wa);
      if (d !== null) wd.push(d);
      if (a !== null) wa.push(a);
      if (d !== null && a !== null) { f.push((d - a) / 2); pe.push((d + a) / 2); filled++; }
    });
    return { wd: avg(wd), wa: avg(wa), f: avg(f), pe: avg(pe), filled };
  }, [rows, en]);

  const [from, to] = OCTAVES[octave]!;
  const full = useMemo(() => geometry(1, 88, NATIVE_WHITE), []);
  const nativeH = NATIVE_HEIGHT_REM * 16;

  // Mini-map : homothétie sur toute la largeur.
  const [miniRef, miniW] = useWidth();
  const miniScale = miniW > 0 ? miniW / full.width : 0.4;
  const seg = geometry(from, to, NATIVE_WHITE);
  const segOffset = full.cols[from - 1]!.start - full.left;

  // Octave : un seul facteur pour toutes les octaves (basé sur la plus large).
  const [octRef, octW] = useWidth();
  const widest = useMemo(() => Math.max(...OCTAVES.map(([a, b]) => geometry(a, b, NATIVE_WHITE).width)), []);
  const octScale = octW > 0 ? Math.min(octW / (widest + LABELS_W), 3) : 1;

  // Swipe horizontal sur l'octave.
  const touchX = useRef<number | null>(null);

  const label = (k: "wd" | "wa") => (k === "wd" ? (en ? "Downweight" : "Poids descendant") : (en ? "Upweight" : "Poids remontant"));

  useLayoutEffect(() => { /* recalcul au changement d'octave */ }, [octave]);

  return (
    <main className="mx-auto w-full max-w-[1280px] px-4 py-3">
      <div className="relative rounded-md border-2 border-foreground bg-card p-4 pt-5">
        <div className="absolute -top-3.5 left-4 flex max-w-[calc(100%-2rem)] items-baseline gap-2 bg-card px-2 text-lg font-bold text-black">
          <span>{en ? "Weighing — Tablet (Lab)" : "Pesée — Tablette (Lab)"}</span>
          <span className="text-slate-400">-</span>
          <span className="truncate text-base font-semibold">
            PD {summary.wd} · PR {summary.wa} · F {summary.f} · PE {summary.pe} · {summary.filled}/88
          </span>
        </div>

        {/* Mini-map 88 touches (passive) + viseur d'octave */}
        <div ref={miniRef} className="relative mt-2 w-full overflow-hidden" style={{ height: nativeH * miniScale }} aria-hidden="true">
          <div className="pointer-events-none absolute left-0 top-0 origin-top-left" style={{ transform: `scale(${miniScale})`, width: full.width }}>
            <div style={{ marginLeft: -full.left }}>
              <KeyGrid from={1} to={88} rows={rows} editable={false} />
            </div>
          </div>
          <div
            className="pointer-events-none absolute top-0 rounded-sm border-2 border-foreground/60 bg-foreground/20 transition-all duration-300"
            style={{ left: segOffset * miniScale, width: seg.width * miniScale, height: nativeH * miniScale }}
          />
        </div>

        {/* Octave zoomée */}
        <div className="mt-4 flex items-center gap-2">
          <button
            type="button"
            aria-label={en ? "Previous octave" : "Octave précédente"}
            disabled={octave === 0}
            onClick={() => setOctave((o) => Math.max(0, o - 1))}
            className="flex h-16 w-12 shrink-0 items-center justify-center rounded-md border border-input bg-background disabled:opacity-30"
          >
            <ChevronLeft className="h-8 w-8" />
          </button>
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
                  <div className="label-key">{noteLabel(from, en)}–{noteLabel(to, en)}</div>
                  <div className="label-wd">{label("wd")}</div>
                  <div className="label-wa">{label("wa")}</div>
                  <div className="label-wd-white">{label("wd")}</div>
                  <div className="label-wa-white">{label("wa")}</div>
                </div>
                <div style={{ marginLeft: -seg.left }}>
                  <KeyGrid key={octave} from={from} to={to} rows={rows} editable onChange={onChange} onCommit={onCommit} />
                </div>
              </div>
            </div>
          </div>
          <button
            type="button"
            aria-label={en ? "Next octave" : "Octave suivante"}
            disabled={octave === OCTAVES.length - 1}
            onClick={() => setOctave((o) => Math.min(OCTAVES.length - 1, o + 1))}
            className="flex h-16 w-12 shrink-0 items-center justify-center rounded-md border border-input bg-background disabled:opacity-30"
          >
            <ChevronRight className="h-8 w-8" />
          </button>
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
