import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useLang } from "@/data/translations";
import { parseDiagnosticCsv } from "@/lib/import-csv";
import {
  buildCurrentPiano,
  loadCurrentPiano,
  loadCurrentPianoFromCloud,
  CURRENT_PIANO_BUFFER_UUID,
  fromPgArray,
  parseMeasureDateTime,
  type CurrentPiano,
} from "@/lib/current-piano";
import {
  externalSupabase,
  type ExternalPianoProfileRow,
} from "@/integrations/external-supabase/client";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
} from "recharts";

const DO_POSITIONS = [4, 16, 28, 40, 52, 64, 76, 88];
// Toutes les notes pesées portent une pastille : le tracé couvre les 88 touches.
const SAMPLE_NOTES = Array.from({ length: 88 }, (_, index) => index + 1);
const BLACK_MODULOS = new Set([2, 5, 7, 10, 0]);
const isBlackKey = (noteIndex: number) => BLACK_MODULOS.has(noteIndex % 12);
const PROFILE_FIELDS = "id,serial_number,brand,model,type_piano,mesure_date,manufacture_year,climate_zone,maintenance_type,ville,pays,remarques,wa_values,wd_values,friction_values,balance_values,usage_level,created_at";

export type KeyFilter = "all" | "split";
type SourceMode = "none" | "cloud";
type UsageLevel = "all" | "low" | "intensive";

export type RefProfile = {
  wa: number[];
  wd: number[];
  friction: number[];
  balance: number[];
};

type ProfileRecord = RefProfile & {
  serialNumber: string;
  brand: string;
  model: string;
  typePiano: string;
  year: number | null;
  climate: string | null;
  maintenance: string | null;
  usageLevel: string | null;
  measureDate: string | null;
  measureTime: string | null;
};

// Ligne de spécifications constructeur (table externe piano_specs_usine).
type FactorySpecRow = {
  brand: string;
  model: string;
  type_piano: string;
  wa_bass: number;
  wa_treble: number;
  friction_cible: number;
};


export type ChartPoint = {
  key: number;
  isBlack: boolean;
  waCur: number | undefined;
  waCurW: number | undefined;
  waCurB: number | undefined;
  sameWa: number | undefined;
  sameWaW: number | undefined;
  sameWaB: number | undefined;
  stdWa: number | undefined;
  wdCur: number | undefined;
  wdCurW: number | undefined;
  wdCurB: number | undefined;
  sameWd: number | undefined;
  sameWdW: number | undefined;
  sameWdB: number | undefined;
  stdWd: number | undefined;
  balCur: number | undefined;
  balCurW: number | undefined;
  balCurB: number | undefined;
  sameBal: number | undefined;
  sameBalW: number | undefined;
  sameBalB: number | undefined;
  factoryBal: number | undefined;
  fricCur: number | undefined;
  fricCurW: number | undefined;
  fricCurB: number | undefined;
  sameFric: number | undefined;
  sameFricW: number | undefined;
  sameFricB: number | undefined;
  factoryFric: number | undefined;
  waMid: number | undefined;
  wdMid: number | undefined;
  balMid: number | undefined;
  fricMid: number | undefined;
};


type SeriesKey = keyof Omit<ChartPoint, "key" | "isBlack">;
const n1 = (value: number) => Number(value.toFixed(1));

function valueAt(values: number[] | undefined, noteIndex: number, sampleIndex: number) {
  const source = values ?? [];
  const raw = source.length >= 88
    ? source[noteIndex - 1]
    : source[Math.min(Math.max(sampleIndex - 1, 0), source.length - 1)];
  return typeof raw === "number" && Number.isFinite(raw) ? n1(raw) : undefined;
}

export function buildChartData(
  mine: RefProfile | null,
  cloud: RefProfile | null,
  standard: RefProfile | null,
): ChartPoint[] {
  const points: ChartPoint[] = SAMPLE_NOTES.map((noteIndex, sampleIndex) => {
    const black = isBlackKey(noteIndex);
    const waCur = valueAt(mine?.wa, noteIndex, sampleIndex);
    const wdCur = valueAt(mine?.wd, noteIndex, sampleIndex);
    const balCur = valueAt(mine?.balance, noteIndex, sampleIndex);
    const fricCur = valueAt(mine?.friction, noteIndex, sampleIndex);
    const sameWa = valueAt(cloud?.wa, noteIndex, sampleIndex);
    const sameWd = valueAt(cloud?.wd, noteIndex, sampleIndex);
    const sameBal = valueAt(cloud?.balance, noteIndex, sampleIndex);
    const sameFric = valueAt(cloud?.friction, noteIndex, sampleIndex);
    return {
      key: noteIndex,
      isBlack: black,
      waCur,
      waCurW: black ? undefined : waCur,
      waCurB: black ? waCur : undefined,
      sameWa,
      sameWaW: black ? undefined : sameWa,
      sameWaB: black ? sameWa : undefined,
      stdWa: valueAt(standard?.wa, noteIndex, sampleIndex),
      wdCur,
      wdCurW: black ? undefined : wdCur,
      wdCurB: black ? wdCur : undefined,
      sameWd,
      sameWdW: black ? undefined : sameWd,
      sameWdB: black ? sameWd : undefined,
      stdWd: valueAt(standard?.wd, noteIndex, sampleIndex),
      balCur,
      balCurW: black ? undefined : balCur,
      balCurB: black ? balCur : undefined,
      sameBal,
      sameBalW: black ? undefined : sameBal,
      sameBalB: black ? sameBal : undefined,
      factoryBal: valueAt(standard?.balance, noteIndex, sampleIndex),
      fricCur,
      fricCurW: black ? undefined : fricCur,
      fricCurB: black ? fricCur : undefined,
      sameFric,
      sameFricW: black ? undefined : sameFric,
      sameFricB: black ? sameFric : undefined,
      factoryFric: valueAt(standard?.friction, noteIndex, sampleIndex),
      waMid: undefined,
      wdMid: undefined,
      balMid: undefined,
      fricMid: undefined,
    };

  });
  // Ligne fantôme servant uniquement à ancrer l'étiquette "Mon piano" à mi-hauteur
  // entre la courbe des blanches et celle des noires en vue éclatée.
  const midOf = (whiteKey: SeriesKey, blackKey: SeriesKey) => {
    const firstOf = (key: SeriesKey) => points.find((point) => typeof point[key] === "number")?.[key] as number | undefined;
    const white = firstOf(whiteKey);
    const black = firstOf(blackKey);
    if (typeof white !== "number" || typeof black !== "number") return undefined;
    return n1((white + black) / 2);
  };
  const waMid = midOf("waCurW", "waCurB");
  const wdMid = midOf("wdCurW", "wdCurB");
  const balMid = midOf("balCurW", "balCurB");
  const fricMid = midOf("fricCurW", "fricCurB");
  return points.map((point) => ({ ...point, waMid, wdMid, balMid, fricMid }));
}

function seriesAverage(data: ChartPoint[], key: SeriesKey): string {
  const values = data
    .map((point) => point[key])
    .filter((value): value is number => typeof value === "number" && Number.isFinite(value));
  if (values.length === 0) return "—";
  return (values.reduce<number>((sum, value) => sum + value, 0) / values.length).toFixed(1);
}


function averageProfiles(profiles: ProfileRecord[]): RefProfile | null {
  if (profiles.length === 0) return null;
  const average = (key: keyof RefProfile) => {
    const length = Math.max(...profiles.map((profile) => profile[key].length));
    return Array.from({ length }, (_, index) => {
      const values = profiles
        .map((profile) => profile[key][index])
        .filter((value): value is number => typeof value === "number" && Number.isFinite(value));
      return values.length > 0
        ? n1(values.reduce<number>((sum, value) => sum + value, 0) / values.length)
        : Number.NaN;
    });
  };
  return { wa: average("wa"), wd: average("wd"), balance: average("balance"), friction: average("friction") };
}

function profileValues(value: number[] | string): number[] {
  // Accepte les tableaux natifs, les littéraux PostgreSQL {1,2,3} et le JSON [1,2,3].
  return fromPgArray(value);
}

function profileFromCurrentPiano(piano: CurrentPiano): ProfileRecord {
  return {
    wa: piano.wa_values,
    wd: piano.wd_values,
    friction: piano.friction_values,
    balance: piano.balance_values,
    serialNumber: piano.serial_number,
    brand: piano.brand,
    model: piano.model,
    typePiano: piano.type_piano ?? "",

    year: piano.manufacture_year,
    climate: piano.climate_zone,
    maintenance: piano.maintenance_type,
    usageLevel: piano.usage_level ?? null,
    measureDate: piano.mesure_date,
    measureTime: localMeasureTime(piano.created_at) ?? parseMeasureDateTime(piano.mesure_date).time,
  };
}

/** Convertit un timestamp cloud (timestamptz, UTC) en heure locale "hh:mm" de l'écran. */
function localMeasureTime(createdAt: string | null | undefined): string | null {
  if (!createdAt) return null;
  const d = new Date(createdAt);
  if (Number.isNaN(d.getTime())) return null;
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

function profileFromRow(row: ExternalPianoProfileRow): ProfileRecord {
  return {
    wa: profileValues(row.wa_values),
    wd: profileValues(row.wd_values),
    friction: profileValues(row.friction_values),
    balance: profileValues(row.balance_values),
    serialNumber: row.serial_number,
    brand: row.brand ?? "",
    model: row.model ?? "",
    typePiano: row.type_piano ?? "",

    year: row.manufacture_year ?? null,
    climate: row.climate_zone ?? null,
    maintenance: row.maintenance_type ?? null,
    usageLevel: row.usage_level ?? null,
    measureDate: row.mesure_date ?? null,
    measureTime: localMeasureTime(row.created_at) ?? parseMeasureDateTime(row.mesure_date).time,
  };
}

function normalizeValue(value: string | null | undefined) {
  return (value ?? "").trim().toLocaleLowerCase();
}

function databaseClimate(value: string | null) {
  const normalized = normalizeValue(value);
  if (normalized.includes("humid")) return "Humid";
  if (normalized.includes("dry") || normalized.includes("sec")) return "Dry";
  return value?.trim() || null;
}

function databaseUsage(value: UsageLevel) {
  return value === "low" ? "Low" : "Intensive";
}

// Abaque théorique d'usine calculé en local (aucun appel réseau).
function makeFactoryStandard(): RefProfile {
  const ramp = (start: number, end: number) =>
    Array.from({ length: 88 }, (_, index) => n1(start + ((end - start) * index) / 87));
  const wa = ramp(68, 58);
  const wd = ramp(56, 48);
  return {
    wa,
    wd,
    balance: wa.map((value, index) => {
      const returnWeight = wd[index];
      return returnWeight === undefined ? Number.NaN : n1((value + returnWeight) / 2);
    }),
    friction: wa.map((value, index) => {
      const returnWeight = wd[index];
      return returnWeight === undefined ? Number.NaN : n1((value - returnWeight) / 2);
    }),
  };
}
const FACTORY_STANDARD: RefProfile = makeFactoryStandard();

// Convertit une ligne de spécifications usine en 88 valeurs théoriques :
// pente linéaire continue de wa_bass (touche 1) à wa_treble (touche 88),
// friction cible constante, Wd = Wa - 2*friction, Balance = Wa - friction.
function profileFromSpec(spec: FactorySpecRow): RefProfile {
  const wa = Array.from({ length: 88 }, (_, index) =>
    n1(spec.wa_bass + ((spec.wa_treble - spec.wa_bass) * index) / 87),
  );
  const friction = wa.map(() => n1(spec.friction_cible));
  const wd = wa.map((value) => n1(value - 2 * spec.friction_cible));
  const balance = wa.map((value) => n1(value - spec.friction_cible));
  return { wa, wd, friction, balance };
}


// Pastilles épurées : une tous les 6 demi-tons à partir de la touche 4 (Do et Fa#).
// En mode zoom chirurgical la granularité passe à une touche sur deux.
const DOT_NOTES = new Set(Array.from({ length: 15 }, (_, i) => 4 + i * 6));
const makeSampleDot = (step: number) => {
  const Dot = (props: { cx?: number; cy?: number; payload?: { key?: number } }) => {
    const { cx, cy, payload } = props;
    if (typeof cx !== "number" || typeof cy !== "number") return null;
    const note = payload?.key;
    if (typeof note !== "number") return null;
    const visible = step === 2 ? note % 2 === 0 : DOT_NOTES.has(note);
    if (!visible) return null;
    return <circle cx={cx} cy={cy} r={2} fill="#000000" />;
  };
  return Dot;
};
const SampleDot = makeSampleDot(6);
const ZoomDot = makeSampleDot(2);


type EndLabelOptions = {
  shortName: string;
  avg: string;
  color: string;
  labelColor?: string;
  firstIndex: number;
  lastIndex: number;
  dyLeft: number;
  dyRight: number;
  showAverage?: boolean;
};

// Marge haute de sécurité : les étiquettes de courbes ne doivent jamais
// chevaucher les repères DO (4, 16, 28...) affichés en haut du graphique.
const LABEL_MIN_Y = 38;
const LABEL_MAX_Y = 248;
const clampLabelY = (y: number, dy: number) => Math.min(Math.max(y + dy, LABEL_MIN_Y), LABEL_MAX_Y) - y;

function makeEndLabel(opts: EndLabelOptions) {
  const EndLabel = (props: { x?: number; y?: number; index?: number; value?: number }) => {
    const { x, y, index = -1, value } = props;
    const hasPoint = typeof x === "number" && Number.isFinite(x) && typeof y === "number" && Number.isFinite(y);
    const hasValue = typeof value === "number" && Number.isFinite(value);
    const color = opts.labelColor ?? opts.color;
    if (!hasPoint || !hasValue) return <g />;
    if (index === opts.firstIndex) {
      return <text x={x - 8} y={y} dy={clampLabelY(y, opts.dyLeft)} textAnchor="end" fontSize={11} fontWeight={600} fill={color}>{opts.shortName}</text>;
    }
    if (index === opts.lastIndex && opts.showAverage !== false && opts.avg !== "—") {
      return <text x={x + 10} y={y} dy={clampLabelY(y, opts.dyRight)} textAnchor="start" fontSize={11} fontWeight={600} fill={color}>{`Moy: ${opts.avg}g`}</text>;
    }
    return <g />;
  };
  return EndLabel;
}


function CustomTickTop(props: { x?: number; y?: number; dy?: number; payload?: { value: number } }) {
  const { x = 0, y = 0, dy = 0, payload } = props;
  const value = payload?.value ?? 0;
  return (
    <g transform={`translate(${x},${y})`}>
      {value === 4 && <text x={-24} y={dy} dy={6} textAnchor="middle" fontSize={10} fill="#6b7280">(DO)</text>}
      <text x={0} y={dy} dy={6} textAnchor="middle" fontSize={10} fill="#6b7280">{value}</text>
    </g>
  );
}

type TooltipEntry = { name?: string; value?: number; color?: string; dataKey?: string };
function tooltipColorFor(name: string) {
  const lower = name.toLowerCase();
  // Identité bleue exclusive de l'import CSV.
  if (lower.startsWith("import csv")) return lower.includes("blanches") ? "#93c5fd" : "#2563EB";
  const isReference = lower.startsWith("cloud") || lower.startsWith("référence");
  if (isReference) return lower.includes("blanches") ? "#fdba74" : "#f97316";
  if (lower.includes("noires")) return "#000000";
  if (lower.includes("blanches")) return "#6b7280";
  if (lower.includes("piano actuel") || lower.trim() === "") return "#000000";
  return "#10b981";
}


function CustomTooltipContent(props: { active?: boolean; payload?: TooltipEntry[]; label?: number; pickKey?: string | null }) {
  const { active, payload, label, pickKey } = props;
  if (!active || !payload || payload.length === 0) return null;
  let valid = [...payload]
    .filter((entry) => typeof entry.value === "number" && Number.isFinite(entry.value))
    .sort((a, b) => Number(b.value) - Number(a.value));
  // Détection spatiale verticale : une seule courbe affichée quand le pointeur
  // désigne clairement la moitié haute ou basse du cadre.
  if (pickKey) {
    const picked = valid.filter((entry) => entry.dataKey === pickKey);
    if (picked.length > 0) valid = picked;
  }
  if (valid.length === 0) return null;
  return (
    <div className="pointer-events-none rounded-md border border-gray-200 bg-white px-3 py-2 text-xs shadow-md">
      <div className="mb-1 font-bold text-gray-800">Touche {label}</div>
      {valid.map((entry) => {
        const color = tooltipColorFor(entry.name ?? "");
        return <div key={entry.name} className="flex items-center justify-between gap-4"><span className="flex items-center gap-2"><span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} /><span style={{ color }}>{entry.name}</span></span><span className="font-semibold tabular-nums text-gray-800">{entry.value?.toFixed(1)} g.</span></div>;
      })}
    </div>
  );
}


type LineDef = { dataKey: SeriesKey; name: string; shortName: string; color: string; real?: boolean; hidden?: boolean };
const FAMILIES: Array<{ id: string; title: string; domain: [number, number]; lines: LineDef[] }> = [
  { id: "wa", title: "Poids d'enfoncement (Wa)", domain: [55, 85], lines: [{ dataKey: "sameWa", name: "Cloud", shortName: "Cloud", color: "#f97316" }, { dataKey: "stdWa", name: "Cible", shortName: "Cible", color: "#10b981" }] },
  { id: "wd", title: "Poids de retour (Wd)", domain: [50, 70], lines: [{ dataKey: "sameWd", name: "Cloud", shortName: "Cloud", color: "#f97316" }, { dataKey: "stdWd", name: "Cible", shortName: "Cible", color: "#10b981" }] },
  { id: "bal", title: "Balance statique", domain: [55, 75], lines: [{ dataKey: "sameBal", name: "Cloud", shortName: "Cloud", color: "#f97316" }, { dataKey: "factoryBal", name: "Cible", shortName: "Cible", color: "#10b981" }] },
  { id: "fric", title: "Friction mécanique", domain: ["dataMin - 1.5", "dataMax + 1.5"] as unknown as [number, number], lines: [{ dataKey: "sameFric", name: "Cloud", shortName: "Cloud", color: "#f97316" }, { dataKey: "factoryFric", name: "Cible", shortName: "Cible", color: "#10b981" }] },
];
const DY_STEPS = [-24, 0, 24, 48, 72];
function offsetsFor(lines: LineDef[], point: ChartPoint | undefined) {
  const map = new Map<SeriesKey, number>();
  [...lines].sort((a, b) => {
    const aValue = point?.[a.dataKey];
    const bValue = point?.[b.dataKey];
    return (typeof bValue === "number" ? bValue : -Infinity) - (typeof aValue === "number" ? aValue : -Infinity);
  }).forEach((line, index) => map.set(line.dataKey, DY_STEPS[index] ?? 20));
  return map;
}

function currentLinesFor(familyId: string, keyFilter: KeyFilter, baseName = "Piano actuel"): LineDef[] {
  const metrics: Record<string, [SeriesKey, SeriesKey, SeriesKey, SeriesKey]> = { wa: ["waCur", "waCurW", "waCurB", "waMid"], wd: ["wdCur", "wdCurW", "wdCurB", "wdMid"], bal: ["balCur", "balCurW", "balCurB", "balMid"], fric: ["fricCur", "fricCurW", "fricCurB", "fricMid"] };
  const metric = metrics[familyId];
  if (!metric) return [];
  const white = baseName ? `${baseName} blanches` : "blanches";
  const black = baseName ? `${baseName} noires` : "noires";
  if (keyFilter === "split") return [
    { dataKey: metric[1], name: white, shortName: white, color: "#6b7280", real: true },
    { dataKey: metric[2], name: black, shortName: black, color: "#000000", real: true },
  ];
  return [{ dataKey: metric[0], name: baseName, shortName: baseName, color: "#000000", real: true }];
}

// La vue clavier pilote aussi la courbe de référence (Cloud ou CSV) : en vue éclatée
// elle est scindée en blanches / noires exactement comme la courbe Live noire.
function comparisonLinesFor(familyId: string, keyFilter: KeyFilter, name: string, short: string, isCsv = false): LineDef[] {
  const metrics: Record<string, [SeriesKey, SeriesKey, SeriesKey]> = { wa: ["sameWa", "sameWaW", "sameWaB"], wd: ["sameWd", "sameWdW", "sameWdB"], bal: ["sameBal", "sameBalW", "sameBalB"], fric: ["sameFric", "sameFricW", "sameFricB"] };
  const metric = metrics[familyId];
  if (!metric) return [];
  // Bleu intense pour l'import CSV, orange pour la moyenne Cloud.
  const strong = isCsv ? "#2563EB" : "#f97316";
  const light = isCsv ? "#93c5fd" : "#fdba74";
  if (keyFilter === "split") return [
    { dataKey: metric[1], name: `${name} blanches`, shortName: `${short} blanches`, color: light },
    { dataKey: metric[2], name: `${name} noires`, shortName: `${short} noires`, color: strong },
  ];
  return [{ dataKey: metric[0], name, shortName: short, color: strong }];
}


function firstDefinedIndex(data: ChartPoint[], key: SeriesKey) {
  return data.findIndex((point) => typeof point[key] === "number" && Number.isFinite(point[key] as number));
}
function lastDefinedIndex(data: ChartPoint[], key: SeriesKey) {
  for (let index = data.length - 1; index >= 0; index -= 1) {
    const value = data[index]?.[key];
    if (typeof value === "number" && Number.isFinite(value)) return index;
  }
  return -1;
}


const ZOOM_WINDOW = 44;

function MagnifyIcon() {
  return (
    <svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
      <circle cx="9" cy="9" r="5.5" />
      <path d="m13.5 13.5 3.5 3.5M7 9h4M9 7v4" />
    </svg>
  );
}
function CloseIcon() {
  return (
    <svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <path d="m5 5 10 10M15 5 5 15" />
    </svg>
  );
}
// Guide visuel : souris avec molette animée (indique le défilement horizontal).
function WheelHintIcon() {
  return (
    <span className="flex items-center gap-2 rounded-full border border-gray-200 bg-white px-2 py-1 text-[0.65rem] font-medium !text-black shadow-sm">
      <svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
        <rect x="5.5" y="2.5" width="9" height="15" rx="4.5" />
        <path className="animate-pulse" d="M10 5.5v3.5" stroke="#2563EB" strokeWidth="2.4" />
      </svg>
      <span>Molette : faire glisser le clavier</span>
    </span>
  );
}

export function ComparisonChart({ chartData, keyFilter, comparisonLabel, comparisonShort, currentBaseName = "Piano actuel", autoDomain = false, sideMargin = 140, csvActive = false }: { chartData: ChartPoint[]; keyFilter: KeyFilter; comparisonLabel: string; comparisonShort: string; currentBaseName?: string; autoDomain?: boolean; sideMargin?: number; csvActive?: boolean }) {
  const [hoveredNoteIndex, setHoveredNoteIndex] = useState<number | null>(null);
  const [hoveredLine, setHoveredLine] = useState<string | null>(null);

  const [zoomId, setZoomId] = useState<string | null>(null);
  const [zoomStart, setZoomStart] = useState(1);
  const containerRef = useRef<HTMLDivElement>(null);
  const zoomRef = useRef<HTMLDivElement>(null);

  // Capture de la molette en mode zoom : glissement continu de la fenêtre de 44 touches.
  useEffect(() => {
    const node = zoomRef.current;
    if (!node || !zoomId) return;
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      const delta = event.deltaY !== 0 ? event.deltaY : event.deltaX;
      setZoomStart((value) => Math.min(Math.max(value + delta * 0.05, 1), 88 - ZOOM_WINDOW + 1));
    };
    node.addEventListener("wheel", onWheel, { passive: false });
    return () => node.removeEventListener("wheel", onWheel);
  }, [zoomId]);

  useEffect(() => {
    if (!zoomId) return;
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") setZoomId(null); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [zoomId]);

  function SubChart({ family, zoomed = false }: { family: (typeof FAMILIES)[number]; zoomed?: boolean }) {
    // Renommage dynamique de la courbe de référence : "Import CSV" (bleu) ou "Cloud" (orange),
    // scindée en blanches / noires quand la vue éclatée est active.
    const referenceLines = comparisonLinesFor(family.id, keyFilter, comparisonLabel, comparisonShort, csvActive);
    const otherLines = family.lines.filter((line) => line.name !== "Cloud");
    const lines = [...currentLinesFor(family.id, keyFilter, currentBaseName), ...referenceLines, ...otherLines];
    // Chaque courbe est ancrée sur SON propre premier / dernier point défini
    // (indispensable en vue éclatée où blanches et noires ne partagent pas les mêmes index).
    const endpointOffsets = (side: "left" | "right") => new Map(
      lines.map((line) => {
        const index = side === "left" ? firstDefinedIndex(chartData, line.dataKey) : lastDefinedIndex(chartData, line.dataKey);
        return [line.dataKey, offsetsFor(lines, chartData[index]).get(line.dataKey) ?? 0] as const;
      }),
    );
    const dyLeft = endpointOffsets("left");
    const dyRight = endpointOffsets("right");
    const start = zoomed ? zoomStart : 1;
    const domainX: [number, number] = zoomed ? [start, start + ZOOM_WINDOW - 1] : [1, 88];
    const DotComp = zoomed ? ZoomDot : SampleDot;
    return (
      <Frame dataFrame={family.id} title={family.title} className={zoomed ? "h-[calc(100vh-140px)] !pt-2" : "h-[300px] !pt-2"}>
        <div className="absolute right-3 top-2 z-10 flex flex-col items-end gap-2">
          {zoomed && <button type="button" aria-label="Quitter le zoom" onClick={() => setZoomId(null)} className="rounded-full border border-gray-300 bg-white p-1 !text-black hover:bg-gray-100"><CloseIcon /></button>}
          {zoomed && <WheelHintIcon />}
          {!zoomed && <button type="button" aria-label={`Zoom sur ${family.title}`} onClick={() => { setZoomStart(1); setZoomId(family.id); }} className="rounded-full border border-gray-300 bg-white p-1 !text-black hover:bg-gray-100"><MagnifyIcon /></button>}
        </div>
        <div className="h-full w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={chartData}
              onMouseMove={(state: { activeLabel?: unknown; chartX?: number; chartY?: number; activePayload?: TooltipEntry[] }, event?: React.MouseEvent<HTMLElement>) => {
                const note = state?.activeLabel;
                if (typeof note === "number") setHoveredNoteIndex(note);
                // Détection spatiale verticale stable : moitié haute -> courbe la plus haute,
                // moitié basse -> courbe la plus basse. Aucun clignotement possible.
                const target = event?.currentTarget as HTMLElement | undefined;
                const rect = target?.getBoundingClientRect();
                const valid = (state?.activePayload ?? []).filter((entry) => typeof entry.value === "number" && Number.isFinite(entry.value));
                if (!rect || valid.length === 0) { setHoveredLine(null); return; }
                const relY = (event!.clientY - rect.top) / Math.max(rect.height, 1);
                const sorted = [...valid].sort((a, b) => Number(b.value) - Number(a.value));
                const picked = relY < 0.5 ? sorted[0] : sorted[sorted.length - 1];
                setHoveredLine(picked?.dataKey ?? null);
              }}
              onMouseLeave={() => { setHoveredNoteIndex(null); setHoveredLine(null); }}
              margin={{ top: 22, right: sideMargin, bottom: 15, left: sideMargin }}
            >
              <XAxis xAxisId="main" dataKey="key" type="number" domain={domainX} allowDataOverflow hide allowDuplicatedCategory={false} />
              <XAxis xAxisId="topAxis" dataKey="key" type="number" domain={domainX} allowDataOverflow orientation="top" height={15} axisLine={false} tickLine={false} ticks={DO_POSITIONS} tick={<CustomTickTop dy={-6} />} allowDuplicatedCategory={false} />
              <YAxis width={0} tick={false} axisLine={false} tickLine={false} domain={autoDomain ? ["auto", "auto"] : family.domain} />
              {DO_POSITIONS.map((position) => <ReferenceLine key={position} xAxisId="main" x={position} stroke="#e5e7eb" strokeWidth={1} />)}
              {hoveredNoteIndex !== null && <ReferenceLine xAxisId="main" x={hoveredNoteIndex} stroke="#94a3b8" strokeWidth={1} />}
              {/* Tooltip natif : suit le pointeur en continu, collé à sa droite,
                  fond blanc / texte noir / bordure nette (CustomTooltipContent). */}
              <Tooltip content={<CustomTooltipContent pickKey={hoveredLine} />} allowEscapeViewBox={{ x: true, y: true }} wrapperStyle={{ pointerEvents: "none" }} isAnimationActive={false} offset={24} />
              {lines.map((line) => {
                // La courbe reste parfaitement stable au survol : seule la pastille
                // active (la note sous le curseur) s'agrandit avec un liseré blanc.
                const picked = hoveredLine === line.dataKey;
                return (
                  <Line
                    key={line.dataKey}
                    xAxisId="main"
                    type="monotone"
                    dataKey={line.dataKey}
                    name={line.name}
                    stroke={line.hidden ? "transparent" : line.color}
                    strokeWidth={2}
                    activeDot={picked && !line.hidden ? { r: 6, fill: line.color, stroke: "#ffffff", strokeWidth: 2.5 } : false}

                    dot={line.real ? <DotComp /> : false}
                    connectNulls={true}
                    isAnimationActive={false}
                    label={makeEndLabel({ shortName: line.shortName, avg: seriesAverage(chartData, line.dataKey), color: line.color, firstIndex: firstDefinedIndex(chartData, line.dataKey), lastIndex: lastDefinedIndex(chartData, line.dataKey), dyLeft: line.hidden ? 0 : dyLeft.get(line.dataKey) ?? 0, dyRight: line.hidden ? 0 : dyRight.get(line.dataKey) ?? 0, showAverage: !line.hidden })}
                  />
                );
              })}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Frame>
    );
  }

  const zoomFamily = FAMILIES.find((family) => family.id === zoomId);
  if (zoomFamily) {
    return (
      <div ref={zoomRef} className="fixed inset-0 z-[70] overflow-hidden bg-white p-6">
        <SubChart family={zoomFamily} zoomed />
      </div>
    );
  }

  // Largeur normale : 80 % de la page, centrée.
  return <div ref={containerRef} className="mx-auto w-4/5 px-2 pb-[80vh] pt-2"><div className="flex w-full flex-col gap-4">{FAMILIES.map((family) => <SubChart key={family.id} family={family} />)}</div></div>;

}

export const Route = createFileRoute("/comparer")({
  head: () => ({
    meta: [
      { title: "Comparer — Touchweight statique piano" },
      { name: "description", content: "Confrontation des moyennes de touchweight statique entre le piano actuel et les profils externes correspondant aux critères choisis." },
      { property: "og:title", content: "Comparer — Touchweight piano" },
      { property: "og:description", content: "Comparez les mesures de touchweight statique avec les profils externes correspondants." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Comparer,
});

const FRAME_CLASS = "relative rounded-md border-2 border-foreground bg-card p-4 pt-5";
const FRAME_TITLE_CLASS = "absolute -top-3.5 left-4 bg-card px-2 text-lg font-bold text-black";
export function Frame({ title, className = "", titleClassName, dataFrame, children }: { title: ReactNode; className?: string; titleClassName?: string; dataFrame?: string | undefined; children: ReactNode }) {
  return <section data-frame={dataFrame} className={`${FRAME_CLASS} ${className}`}><h2 className={titleClassName ?? FRAME_TITLE_CLASS}>{title}</h2>{children}</section>;
}

const COLUMNS = [
  { key: "wa", label: "Poids descendant (Wa)" },
  { key: "wd", label: "Poids ascendant (Wd)" },
  { key: "friction", label: "Friction mécanique" },
  { key: "balance", label: "Balance statique" },
] as const;
type MetricKey = (typeof COLUMNS)[number]["key"];


// Charte couleur stricte : rangée 1 noire, rangée 2 orange, rangée 3 verte.
type Tone = "cur" | "ref" | "std";
const TONE_CLASS: Record<Tone, string> = {
  cur: "!text-black",
  ref: "!text-orange-600",
  std: "!text-green-600",
};

// Bloc de moyenne façon page Saisie : moyenne globale en grand + détail Blanches/Noires.
function AverageBlock({ label, global, white, black, tone }: { label: string; global: string; white: string; black: string; tone: Tone }) {
  const toneClass = TONE_CLASS[tone];
  const val = (v: string) => v === "—" ? <span className={toneClass}>—</span> : <>{v}<span className="!text-xs !font-medium"> gr.</span></>;
  const sub = (v: string) => v === "—" ? "—" : <>{v}<span className={toneClass}> gr.</span></>;
  return (
    <div className="rounded bg-muted px-2 py-1.5 text-center">
      <div className="!text-[1.1rem] font-bold tracking-wide !text-black">{label}</div>
      <div className={`mt-1 !text-2xl !font-bold tabular-nums ${toneClass}`}>{val(global)}</div>
      <div className={`mt-0.5 flex justify-center gap-2 text-[0.65rem] tabular-nums ${toneClass}`}>
        <span>{sub(white)}</span>
        <span className={toneClass}>/</span>
        <span>{sub(black)}</span>
      </div>
      <div className={`flex justify-center gap-2 text-[0.55rem] tabular-nums ${toneClass}`}>
        <span className="!text-xs font-medium">Blanches</span>
        <span className="invisible">/</span>
        <span className="!text-xs font-medium">Noires</span>
      </div>
    </div>
  );
}

// Clés de séries par métrique : globale + blanches/noires pour chaque source.
const AVG_KEYS: Record<MetricKey, { cur: [SeriesKey, SeriesKey, SeriesKey]; ref: [SeriesKey, SeriesKey, SeriesKey] }> = {
  wa: { cur: ["waCur", "waCurW", "waCurB"], ref: ["sameWa", "sameWaW", "sameWaB"] },
  wd: { cur: ["wdCur", "wdCurW", "wdCurB"], ref: ["sameWd", "sameWdW", "sameWdB"] },
  friction: { cur: ["fricCur", "fricCurW", "fricCurB"], ref: ["sameFric", "sameFricW", "sameFricB"] },
  balance: { cur: ["balCur", "balCurW", "balCurB"], ref: ["sameBal", "sameBalW", "sameBalB"] },
};

export function AverageRow({ chartData, source, hasData }: { chartData: ChartPoint[]; source: "cur" | "ref"; hasData: boolean }) {
  return (
    <div className="grid grid-cols-4 gap-3">
      {COLUMNS.map(({ key, label }) => {
        const [globalKey, whiteKey, blackKey] = AVG_KEYS[key][source];
        return (
          <AverageBlock
            key={key}
            label={label}
            tone={source}
            global={hasData ? seriesAverage(chartData, globalKey) : "—"}
            white={hasData ? seriesAverage(chartData, whiteKey) : "—"}
            black={hasData ? seriesAverage(chartData, blackKey) : "—"}
          />
        );
      })}
    </div>
  );
}

// Rangée Standard : valeur globale théorique centrée, sans détail Blanches/Noires.
const STD_KEYS: { key: MetricKey; globalKey: SeriesKey }[] = [
  { key: "wa", globalKey: "stdWa" },
  { key: "wd", globalKey: "stdWd" },
  { key: "friction", globalKey: "factoryFric" },
  { key: "balance", globalKey: "factoryBal" },
];
function StandardRow({ chartData }: { chartData: ChartPoint[] }) {
  const lang = useLang();
  const lowLabel = lang === "en" ? "A0" : "La0";
  const highLabel = lang === "en" ? "C8" : "Do8";
  const extremeValue = (globalKey: SeriesKey, side: "first" | "last") => {
    const points = side === "first" ? chartData : [...chartData].reverse();
    const found = points.find((point) => typeof point[globalKey] === "number" && Number.isFinite(point[globalKey] as number));
    const value = found?.[globalKey];
    return typeof value === "number" ? value.toFixed(1) : "—";
  };
  return (
    <div className="grid grid-cols-4 gap-3">
      {STD_KEYS.map(({ key, globalKey }) => {
        const { label } = COLUMNS.find((col) => col.key === key)!;
        const value = seriesAverage(chartData, globalKey);
        return (
          <div key={key} className="rounded bg-muted px-2 py-1.5 text-center">
            <div className="!text-[1.1rem] font-bold tracking-wide !text-black">{label}</div>
            <div className="mt-1 !text-2xl !font-bold tabular-nums !text-green-600">
              {value === "—" ? <span className="!text-green-600">—</span> : <>{value}<span className="!text-xs !font-medium"> gr.</span></>}
            </div>
            {/* Rangée 3 : valeurs extrêmes de la droite théorique (touche 1 / touche 88). */}
            <div className="flex justify-center gap-2 tabular-nums !text-green-600">
              <span className="!text-xs font-medium">{extremeValue(globalKey, "first")} gr.</span>
              <span className="!text-xs font-medium">/</span>
              <span className="!text-xs font-medium">{extremeValue(globalKey, "last")} gr.</span>
            </div>
            <div className="flex justify-center gap-2 tabular-nums !text-green-600">
              <span className="!text-xs font-medium">{lowLabel}</span>
              <span className="invisible">/</span>
              <span className="!text-xs font-medium">{highLabel}</span>
            </div>
          </div>

        );
      })}
    </div>
  );
}

const PILL_BASE = "h-7 min-w-0 flex-1 rounded-full border px-1.5 text-[0.68rem] leading-tight transition-colors whitespace-nowrap";
const pillClass = (active: boolean) => `${PILL_BASE} ${active ? "border-gray-300 bg-gray-100 font-semibold text-slate-700" : "border-gray-200 bg-white text-gray-400 hover:border-gray-300 hover:text-gray-500"}`;

export function CycleIcon() {
  return (
    <svg aria-hidden="true" className="h-3.5 w-3.5 shrink-0" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5.1 6.5A6.6 6.6 0 0 1 15.8 5l1.1 1.3" />
      <path d="m14.7 3.8 2.2 2.5-3.2.2" />
      <path d="M14.9 13.5A6.6 6.6 0 0 1 4.2 15l-1.1-1.3" />
      <path d="m5.3 16.2-2.2-2.5 3.2-.2" />
    </svg>
  );
}

type SidebarPanelProps = {
  cloudEnabled: boolean;
  standardEnabled: boolean;
  csvActive: boolean;
  cloudSampleCount: number;
  cloudLoading: boolean;
  onToggleCloud: () => void;
  onToggleStandard: () => void;
  onImport: (file: File) => void;
  filtersDisabled: boolean;
  sameClimate: boolean;
  sameYear: boolean;
  importantChanges: boolean;
  youngOnly: boolean;
  usageLevel: UsageLevel;
  setSameClimate: (value: boolean) => void;
  setSameYear: (value: boolean) => void;
  setImportantChanges: (value: boolean) => void;
  setYoungOnly: (value: boolean) => void;
  cycleUsage: () => void;
  keyFilter: KeyFilter;
  cycleKeyFilter: () => void;
};

function SidebarPanel(props: SidebarPanelProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const usageLabel = props.usageLevel === "all" ? "Tous" : props.usageLevel === "low" ? "Faible" : "Intensif";
  const switchRow = (label: string, checked: boolean, onChange: (value: boolean) => void) => (
    <label className="flex min-w-0 items-center justify-between gap-3 text-xs font-medium text-black">
      <span className="min-w-0">{label}</span>
      <Switch checked={checked} disabled={props.filtersDisabled} onCheckedChange={onChange} className="data-[state=checked]:bg-slate-500 data-[state=unchecked]:bg-gray-200" />
    </label>
  );
  return (
    <Frame title="Réglages" className="flex flex-1 flex-col">
      <div className="flex h-full flex-col gap-4 pt-2">
          <div>
            <div className="mb-1.5 whitespace-nowrap !text-xs !font-bold !text-black">Comparer piano avec :</div>
            <div className="flex items-center gap-1.5">
              <Button type="button" variant="outline" aria-pressed={props.cloudEnabled} onClick={props.onToggleCloud} className={`${pillClass(props.cloudEnabled)} !text-orange-600`}>CLOUD</Button>
              <Button type="button" variant="outline" aria-pressed={props.standardEnabled} onClick={props.onToggleStandard} className={`${pillClass(props.standardEnabled)} !text-green-600`}>CIBLE</Button>
              <Button type="button" variant="outline" aria-pressed={props.csvActive} onClick={() => inputRef.current?.click()} className={`${pillClass(props.csvActive)} !text-blue-600`}>IMPORT CSV</Button>
              <input ref={inputRef} type="file" accept=".csv,text/csv" className="hidden" onChange={(event) => { const file = event.target.files?.[0]; if (file) props.onImport(file); event.target.value = ""; }} />
            </div>
          </div>
          <div className="space-y-2 border-t border-gray-200 pt-3">
            <div className="font-bold !text-black">Filtres</div>
            <Button type="button" variant="outline" disabled={props.filtersDisabled} onClick={props.cycleUsage} aria-label={`Niveau d'usage instrument : ${usageLabel}`} className={`${PILL_BASE} flex w-full items-center justify-start gap-2 border-gray-200 bg-white !text-black !opacity-100 disabled:!opacity-100 font-medium hover:border-gray-300 [&_svg]:!text-black [&_svg]:!opacity-100`}><CycleIcon /><span className="!text-black font-medium">Niveau d'usage instrument : <span className="!text-black font-semibold">{usageLabel}</span></span></Button>
            <Button type="button" variant="outline" disabled={props.filtersDisabled} aria-pressed={props.importantChanges} onClick={() => props.setImportantChanges(!props.importantChanges)} className={`${PILL_BASE} flex w-full items-center justify-start gap-2 border-gray-200 bg-white text-left !text-black !opacity-100 disabled:!opacity-100 [&_svg]:!text-black [&_svg]:!opacity-100`}><CycleIcon /><span className="!text-black font-medium">Modifications importantes : <span className="!text-black font-semibold">{props.importantChanges ? "Inclus" : "Exclus"}</span></span></Button>
          </div>
          <div className="space-y-2.5 pt-1">
            {switchRow("Même zone climatique", props.sameClimate, props.setSameClimate)}
            {switchRow("Même année de fabrication", props.sameYear, props.setSameYear)}
            {switchRow("Pianos de moins de 5 ans", props.youngOnly, props.setYoungOnly)}
          </div>
          <div className="mt-auto mb-3 border-t border-gray-200 pt-3">
            <Button
              type="button"
              variant="outline"
              onClick={props.cycleKeyFilter}
              className={`${PILL_BASE} flex w-full items-center justify-start gap-2 border-2 border-black bg-white !text-black hover:bg-gray-100`}
            >
              <CycleIcon />
              <span className="!text-black font-medium">
                Touches blanches/noires :{" "}
                <span className="font-semibold !text-black">{props.keyFilter === "all" ? "groupées" : "séparées"}</span>
              </span>
            </Button>
          </div>
        </div>
      </Frame>
    );
}

function formatMeasureDate(value: string | null | undefined) {
  const raw = (value ?? "").trim();
  const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) return `${match[3]}-${match[2]}-${match[1]}`;
  return summaryValue(raw);
}

function summaryValue(value: string | number | null | undefined) {
  return value === null || value === undefined || value === "" ? "-" : String(value);
}

function Comparer() {
  const [sourceMode, setSourceMode] = useState<SourceMode>("cloud");
  const [standardEnabled, setStandardEnabled] = useState(true);
  const [keyFilter, setKeyFilter] = useState<KeyFilter>("all");
  const [sameClimate, setSameClimate] = useState(true);
  const [sameYear, setSameYear] = useState(false);
  const [importantChanges, setImportantChanges] = useState(false);
  const [youngOnly, setYoungOnly] = useState(false);
  const [usageLevel, setUsageLevel] = useState<UsageLevel>("all");
  const [mine, setMine] = useState<ProfileRecord | null>(null);
  const [standard, setStandard] = useState<RefProfile>(FACTORY_STANDARD);
  const [standardLabel, setStandardLabel] = useState("CIBLE (Internet)");

  const [cloudProfile, setCloudProfile] = useState<RefProfile | null>(null);
  const [cloudSampleCount, setCloudSampleCount] = useState(0);
  const [cloudLoading, setCloudLoading] = useState(false);
  // État indépendant : le CSV importé alimente UNIQUEMENT la courbe orange.
  // current_piano (courbe Live noire) et le buffer PIANO_ACTUEL ne sont jamais touchés.
  const [comparedPiano, setComparedPiano] = useState<ProfileRecord | null>(null);
  const [status, setStatus] = useState<"loading" | "ok" | "error">("loading");
  const averagesRef = useRef<HTMLDivElement>(null);
  const [averagesHeight, setAveragesHeight] = useState(0);

  useEffect(() => {
    const node = averagesRef.current;
    if (!node) return;
    const update = () => setAveragesHeight(node.offsetHeight);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(node);
    return () => observer.disconnect();
  }, [status]);

  // Scroll lock : le défilement s'arrête quand la bordure supérieure du cadre
  // « Friction mécanique » touche la bordure inférieure du cadre sticky « Moyennes ».
  useEffect(() => {
    if (status !== "ok") return;
    const clamp = () => {
      const frame = document.querySelector('[data-frame="fric"]');
      if (!frame) return;
      const frameTop = frame.getBoundingClientRect().top + window.scrollY;
      // -5 : laisse un fin filet d'air de 5 px entre le cadre « Moyennes »
      // et le cadre « Friction mécanique ».
      const limit = Math.max(0, Math.round(frameTop - (127 + averagesHeight) - 5));
      if (window.scrollY > limit) window.scrollTo(0, limit);
    };
    clamp();
    window.addEventListener("scroll", clamp, { passive: true });
    window.addEventListener("resize", clamp);
    return () => {
      window.removeEventListener("scroll", clamp);
      window.removeEventListener("resize", clamp);
    };
  }, [status, averagesHeight]);



  useEffect(() => {
    // Priorité absolue : la ligne pivot 'PIANO_ACTUEL' de piano_profiles (tampon cloud).
    // Le LocalStorage n'est qu'un secours hors ligne.
    let cancelled = false;
    const sync = async () => {
      const cloudPiano = await loadCurrentPianoFromCloud();
      if (cancelled) return;
      const piano = cloudPiano ?? loadCurrentPiano();
      setMine(piano ? profileFromCurrentPiano(piano) : null);
      setStatus("ok");
    };
    void sync();
    const onEvent = () => void sync();
    window.addEventListener("focus", onEvent);
    window.addEventListener("storage", onEvent);
    document.addEventListener("visibilitychange", onEvent);
    return () => {
      cancelled = true;
      window.removeEventListener("focus", onEvent);
      window.removeEventListener("storage", onEvent);
      document.removeEventListener("visibilitychange", onEvent);
    };
  }, []);

  // Rangée 3 : spécifications d'usine (table externe piano_specs_usine).
  // Recherche marque + type de piano, sinon repli STANDARD / UNIVERSEL.
  useEffect(() => {
    let cancelled = false;
    async function loadFactorySpec() {
      // Les types saisis varient ("Droit", "Piano Droit", "À queue"…) :
      // on les ramène aux deux libellés canoniques de la table.
      const rawType = normalizeValue(mine?.typePiano);
      const canonicalType = rawType.includes("queue") || rawType.includes("grand")
        ? "piano à queue"
        : rawType.includes("droit") || rawType.includes("upright")
          ? "piano droit"
          : "";
      const brand = (mine?.brand ?? "").trim();
      const result = await externalSupabase
        .from("piano_specs_usine")
        .select("brand,model,type_piano,wa_bass,wa_treble,friction_cible");
      if (cancelled) return;
      const allRows = (result.data ?? []) as FactorySpecRow[];
      const typed = canonicalType
        ? allRows.filter((row) => normalizeValue(row.type_piano) === canonicalType)
        : allRows;
      const rows = typed.length > 0 ? typed : allRows;

      if (rows.length === 0) {
        setStandard(FACTORY_STANDARD);
        setStandardLabel("CIBLE (Internet)");
        return;
      }
      const match = brand
        ? rows.find((row) => (row.brand ?? "").trim().toLocaleLowerCase() === brand.toLocaleLowerCase())
        : undefined;
      const fallback = rows.find(
        (row) => row.brand === "STANDARD" && row.model === "UNIVERSEL",
      );
      const spec = match ?? fallback ?? rows[0];
      if (!spec) return;
      setStandard(profileFromSpec(spec));
      setStandardLabel(
        spec.brand === "STANDARD"
          ? "CIBLE (Internet)"
          : `CIBLE : GÉNÉRIQUE ${spec.brand.toLocaleUpperCase()}`,
      );
    }
    void loadFactorySpec();
    return () => { cancelled = true; };
  }, [mine]);


  useEffect(() => {
    let cancelled = false;
    async function loadCloudAverage() {
      if (!mine || sourceMode !== "cloud") {
        setCloudProfile(null);
        setCloudSampleCount(0);
        setCloudLoading(false);
        return;
      }
      setCloudLoading(true);
      let query = externalSupabase
        .from("piano_profiles")
        .select(PROFILE_FIELDS)
        .eq("model", mine.model)
        .neq("serial_number", mine.serialNumber)
        // Exclusion de la ligne tampon (état écran) de la moyenne globale.
        .neq("id", CURRENT_PIANO_BUFFER_UUID);
      const climate = databaseClimate(mine.climate);
      if (sameClimate && climate) query = query.eq("climate_zone", climate);
      if (sameYear && mine.year !== null) query = query.eq("manufacture_year", mine.year);
      if (importantChanges) query = query.eq("maintenance_type", "Major modifications");
      else query = query.not("maintenance_type", "eq", "Major modifications");
      if (youngOnly) query = query.gte("manufacture_year", new Date().getFullYear() - 5);
      if (usageLevel !== "all") query = query.eq("usage_level", databaseUsage(usageLevel));

      const result = await query;
      if (cancelled) return;
      setCloudLoading(false);
      if (result.error || !result.data) {
        setCloudProfile(null);
        setCloudSampleCount(0);
        return;
      }
      const matching = (result.data as ExternalPianoProfileRow[]).map(profileFromRow);
      setCloudSampleCount(matching.length);
      setCloudProfile(averageProfiles(matching));
    }
    void loadCloudAverage();
    return () => { cancelled = true; };
  }, [mine, sourceMode, sameClimate, sameYear, importantChanges, youngOnly, usageLevel]);

  // Arbitrage de la courbe orange : CSV importé en priorité, sinon moyenne Cloud.
  const comparisonProfile = comparedPiano ?? (sourceMode === "cloud" ? cloudProfile : null);
  const comparedTime = comparedPiano?.measureTime ? ` - ${comparedPiano.measureTime}` : "";
  const comparisonLabel = comparedPiano
    ? `IMPORT CSV : ${[comparedPiano.brand, comparedPiano.model].filter(Boolean).join(" ") || "—"} - ${summaryValue(comparedPiano.year)} - SN ${summaryValue(comparedPiano.serialNumber)} - Mesure ${formatMeasureDate(comparedPiano.measureDate)}${comparedTime}${countKeys(comparedPiano.wa)}`
    : "Cloud";
  const chartData = useMemo(() => buildChartData(mine, comparisonProfile, standardEnabled ? standard : null), [mine, comparisonProfile, standard, standardEnabled]);

  async function handleImport(file: File) {
    try {
      const parsed = parseDiagnosticCsv(await file.text());
      const year = Number(parsed.fields["manufacture_year"]);
      const piano = buildCurrentPiano({
        brand: parsed.fields["brand"] ?? "",
        model: parsed.fields["model"] ?? "",
        serial_number: parsed.fields["serial_number"] ?? "",
        type_piano: parsed.fields["type_piano"] ?? "",
        manufacture_year: Number.isFinite(year) ? year : null,
        climate_zone: parsed.fields["climate_zone"] ?? "",
        maintenance_type: parsed.fields["maintenance_type"] ?? "",
        usage_level: parsed.fields["usage_level"] ?? "",
        ville: parsed.fields["ville"] ?? "",
        pays: parsed.fields["pays"] ?? "",
        remarques: parsed.fields["remarques"] ?? "",
        wa: parsed.rows.map((row) => row.wa),
        wd: parsed.rows.map((row) => row.wd),
        mesureDateRaw: parsed.fields["mesure_date"] || undefined,
      });
      // Aucun accès à current_piano ni au buffer PIANO_ACTUEL :
      // le CSV devient seulement la référence orange de comparaison.
      setComparedPiano(profileFromCurrentPiano(piano));
      setStatus("ok");
    } catch {
      setComparedPiano(null);
    }
  }

  function resetComparison() {
    setComparedPiano(null);
    setSourceMode("cloud");
  }


  function cycleUsage() {
    setUsageLevel((value) => value === "all" ? "low" : value === "low" ? "intensive" : "all");
  }

  function cycleKeyFilter() {
    setKeyFilter((value) => value === "all" ? "split" : "all");
  }

  const mineTime = mine?.measureTime ? ` - ${mine.measureTime}` : "";
  const keyCounts = countKeys(mine?.wa);
  const summary = `${summaryValue(mine?.brand)}\u00A0\u00A0${summaryValue(mine?.model)} - ${summaryValue(mine?.year)} - SN ${summaryValue(mine?.serialNumber)} - Mesure ${formatMeasureDate(mine?.measureDate)}${mineTime}${keyCounts}`;
  const cloudActive = !comparedPiano && sourceMode === "cloud";
  const cloudIsEmpty = cloudActive && cloudSampleCount === 0;
  const cloudCounterText = cloudLoading
    ? "Calcul de la moyenne cloud…"
    : cloudSampleCount === 0
      ? ""
      : cloudSampleCount === 1
        ? "- Moyennes d'un 1 piano de modèle identique enregistré par les utilisateurs"
        : `Moyennes sur ${cloudSampleCount} pianos de modèle identique enregistrés par les utilisateurs`;


  return (
    <main className="mx-auto w-full max-w-[1400px] px-6 py-8">
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-x-0 top-[77px] z-40 h-[50px] bg-white"
      />
      {status === "loading" ? <p className="py-16 text-center text-muted-foreground">Chargement des profils externes…</p> : (
        <>
          <div className="grid w-full grid-cols-[minmax(0,1fr)_minmax(250px,300px)] items-stretch gap-6">
            <div className="min-w-0">
              
              <div ref={averagesRef} className="sticky top-[127px] z-40 mb-[50px] w-full bg-background pb-2">
                <Frame titleClassName="absolute -top-3.5 left-4 whitespace-nowrap bg-card px-2 text-lg font-bold text-foreground" title={<span>Moyennes</span>} className="h-fit">
                  <div className="mb-3"><div className="mb-1.5 px-1 text-[0.7rem] font-semibold uppercase tracking-wide !text-black">Piano actuel : <span className="normal-case">{summary}</span></div><AverageRow chartData={chartData} source="cur" hasData={mine !== null} /></div>
                  {(comparedPiano !== null || sourceMode === "cloud") && (
                    <div className={standardEnabled ? "mb-3" : ""}>
                      <div className={`mb-1.5 px-1 text-[0.7rem] font-semibold uppercase tracking-wide ${comparedPiano ? "!text-blue-600" : "!text-orange-600"}`}>{comparisonLabel}{cloudActive && <span className="ml-2 normal-case text-orange-600">{cloudCounterText}</span>}</div>
                      <AverageRow chartData={chartData} source="ref" hasData={comparisonProfile !== null} />
                      {cloudIsEmpty && <p className="mt-3 text-center text-sm font-semibold text-slate-600">Échantillon trop faible pour générer une moyenne</p>}
                    </div>
                  )}
                  {standardEnabled && (
                    <div>
                      <div className="mb-1.5 px-1 text-[0.7rem] font-semibold uppercase tracking-wide !text-green-600">{standardLabel}</div>
                      <StandardRow chartData={chartData} />
                    </div>
                  )}
                </Frame>
              </div>

              <ComparisonChart chartData={chartData} keyFilter={keyFilter} comparisonLabel={comparedPiano ? "Import CSV" : "Cloud"} comparisonShort={comparedPiano ? "Import CSV" : "Cloud"} csvActive={comparedPiano !== null} />
            </div>
            <aside className="min-w-0"><div className="sticky top-[127px] z-40 flex h-fit flex-col" style={{ minHeight: averagesHeight > 0 ? averagesHeight - 8 : undefined }}><SidebarPanel cloudEnabled={sourceMode === "cloud" && !comparedPiano} standardEnabled={standardEnabled} csvActive={comparedPiano !== null} cloudSampleCount={cloudSampleCount} cloudLoading={cloudLoading} onToggleCloud={() => { if (comparedPiano) { resetComparison(); } else { setSourceMode((value) => value === "cloud" ? "none" : "cloud"); } }} onToggleStandard={() => setStandardEnabled((value) => !value)} onImport={(file) => void handleImport(file)} filtersDisabled={sourceMode !== "cloud" || comparedPiano !== null} sameClimate={sameClimate} sameYear={sameYear} importantChanges={importantChanges} youngOnly={youngOnly} usageLevel={usageLevel} setSameClimate={setSameClimate} setSameYear={setSameYear} setImportantChanges={setImportantChanges} setYoungOnly={setYoungOnly} cycleUsage={cycleUsage} keyFilter={keyFilter} cycleKeyFilter={cycleKeyFilter} /></div></aside>
          </div>
        </>
      )}
    </main>
  );
}
