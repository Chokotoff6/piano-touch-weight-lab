import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState, type ReactNode, type Dispatch, type SetStateAction, type RefObject } from "react";
import { Button } from "@/components/ui/button";
import { useLang } from "@/data/translations";
import { RefreshCw, Square, SquareX } from "lucide-react";
import { BrandTargetInfoIcon, TargetLegalInfoIcon } from "@/components/BrandTargetInfo";
import { paddedDomain } from "@/components/PdfReportBlocks";
import { PianoSheetMirror } from "@/components/PianoSheetMirror";
import { generateComparisonReport, type LandscapePage } from "@/lib/pdf-report";
import { setTopbarState } from "@/lib/topbar-store";
import { parseDiagnosticCsv, readCsvFileContent } from "@/lib/import-csv";
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
  Customized,
} from "recharts";


const DO_POSITIONS = [4, 16, 28, 40, 52, 64, 76, 88];
// Toutes les notes pesées portent une pastille : le tracé couvre les 88 touches.
const SAMPLE_NOTES = Array.from({ length: 88 }, (_, index) => index + 1);
const BLACK_MODULOS = new Set([2, 5, 7, 10, 0]);
const isBlackKey = (noteIndex: number) => BLACK_MODULOS.has(noteIndex % 12);
const PROFILE_FIELDS = "id,serial_number,brand,model,type_piano,mesure_date,manufacture_year,climate_zone,maintenance_type,ville,pays,remarques,wa_values,wd_values,friction_values,balance_values,usage_level,created_at";

export type KeyFilter = "all" | "split" | "white" | "black";
type SourceMode = "none" | "cloud";
type UsageLevel = "low" | "medium" | "intensive";
// Filtre modifications importantes : incluses, exclues, ou uniquement celles-ci.
type ChangesFilter = "included" | "excluded" | "only";

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
  return value === "low" ? "Low" : value === "medium" ? "Medium" : "Intensive";
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
  maxY?: number;
};

// Marge haute de sécurité : les étiquettes de courbes ne doivent jamais
// chevaucher les repères DO (4, 16, 28...) affichés en haut du graphique.
const LABEL_MIN_Y = 38;
const LABEL_MAX_Y = 248;
const clampLabelY = (y: number, dy: number, maxY: number = LABEL_MAX_Y) => Math.min(Math.max(y + dy, LABEL_MIN_Y), maxY) - y;

function makeEndLabel(opts: EndLabelOptions) {
  const EndLabel = (props: { x?: number; y?: number; index?: number; value?: number }) => {
    const { x, y, index = -1, value } = props;
    const hasPoint = typeof x === "number" && Number.isFinite(x) && typeof y === "number" && Number.isFinite(y);
    const hasValue = typeof value === "number" && Number.isFinite(value);
    const color = opts.labelColor ?? opts.color;
    if (!hasPoint || !hasValue) return <g />;
    if (index === opts.firstIndex) {
      return <text x={x - 8} y={y} dy={clampLabelY(y, opts.dyLeft, opts.maxY)} textAnchor="end" fontSize={11} fontWeight={600} fill={color}>{opts.shortName}</text>;
    }
    if (index === opts.lastIndex && opts.showAverage !== false && opts.avg !== "—") {
      return <text x={x + 10} y={y} dy={clampLabelY(y, opts.dyRight, opts.maxY)} textAnchor="start" fontSize={11} fontWeight={600} fill={color}>{`Moy: ${opts.avg}g`}</text>;
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

// Fenêtre flottante native (trigger "axis") : une seule bulle listant toutes les
// courbes actives de la touche survolée. L'ordre suit la valeur de chaque courbe
// à la touche 1 (premier pixel), du plus haut au plus bas.
function isCurrentKey(dataKey?: string) {
  return String(dataKey ?? "").includes("Cur");
}

// Nom de la note pour une touche 1..88 (touche 1 = La0 / A0).
const NOTE_NAMES_FR = ["Do", "Do#", "Ré", "Ré#", "Mi", "Fa", "Fa#", "Sol", "Sol#", "La", "La#", "Si"];
const NOTE_NAMES_EN = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
function noteName(keyIndex: number, en: boolean) {
  if (!Number.isFinite(keyIndex)) return "";
  const names = en ? NOTE_NAMES_EN : NOTE_NAMES_FR;
  return names[(((keyIndex + 8) % 12) + 12) % 12] ?? "";
}

function CustomTooltipContent(props: { active?: boolean; payload?: TooltipEntry[]; label?: number; chartData?: ChartPoint[] }) {
  const { active, payload, label, chartData } = props;
  const lang = useLang();
  const en = lang === "en";
  if (!active) return null;
  const first = chartData?.[0];
  const rankOf = (dataKey?: string) => {
    const value = first && dataKey ? first[dataKey as SeriesKey] : undefined;
    return typeof value === "number" && Number.isFinite(value) ? value : -Infinity;
  };
  const valid = [...(payload ?? [])]
    .filter((entry) => typeof entry.value === "number" && Number.isFinite(entry.value))
    .filter((entry) => !String(entry.dataKey ?? "").endsWith("Mid"))
    // "Piano actuel" (blanches puis noires) toujours en tête, le reste trié par la valeur à la touche 1.
    .sort((a, b) => {
      const aCur = isCurrentKey(a.dataKey) ? 1 : 0;
      const bCur = isCurrentKey(b.dataKey) ? 1 : 0;
      if (aCur !== bCur) return bCur - aCur;
      return rankOf(b.dataKey) - rankOf(a.dataKey);
    });
  if (valid.length === 0) return null;
  return (
    <div className="pointer-events-none !z-50 rounded-md border border-black bg-white px-3 py-2 text-xs">
      <div className="mb-1 font-bold !text-black">{en ? "Key" : "Touche"} {label} - {noteName(Number(label), en)}</div>
      {valid.map((entry) => {
        const color = entry.color ?? tooltipColorFor(entry.name ?? "");
        // Sur /resultats les courbes n'ont pas de nom : Recharts retombe sur la clé
        // technique ("waCur"). On affiche alors "Blanche" / "Noire" selon la note.
        const rawName = entry.name?.trim() ?? "";
        const isRawKey = rawName === "" || rawName === String(entry.dataKey ?? "");
        const name = isRawKey ? (isBlackKey(Number(label)) ? "Noire" : "Blanche") : rawName;
        return (
          <div key={entry.dataKey} className="flex items-center justify-between gap-4 whitespace-nowrap" style={{ color }}>
            <span>{name}</span>
            <span className="font-semibold tabular-nums">{Math.round(Number(entry.value ?? 0))} gr.</span>
          </div>
        );
      })}
    </div>
  );
}





type LineDef = { dataKey: SeriesKey; name: string; shortName: string; color: string; real?: boolean; hidden?: boolean };
const FAMILIES: Array<{ id: string; title: string; domain: [number, number]; lines: LineDef[] }> = [
  { id: "wa", title: "Poids descendant", domain: [55, 85], lines: [{ dataKey: "sameWa", name: "Cloud", shortName: "Cloud", color: "#f97316" }, { dataKey: "stdWa", name: "Cible", shortName: "Cible", color: "#10b981" }] },
  { id: "wd", title: "Poids remontant", domain: [50, 70], lines: [{ dataKey: "sameWd", name: "Cloud", shortName: "Cloud", color: "#f97316" }, { dataKey: "stdWd", name: "Cible", shortName: "Cible", color: "#10b981" }] },
  { id: "bal", title: "Poids d'équilibre", domain: [55, 75], lines: [{ dataKey: "sameBal", name: "Cloud", shortName: "Cloud", color: "#f97316" }, { dataKey: "factoryBal", name: "Cible", shortName: "Cible", color: "#10b981" }] },
  { id: "fric", title: "Friction", domain: ["dataMin - 1.5", "dataMax + 1.5"] as unknown as [number, number], lines: [{ dataKey: "sameFric", name: "Cloud", shortName: "Cloud", color: "#f97316" }, { dataKey: "factoryFric", name: "Cible", shortName: "Cible", color: "#10b981" }] },
];

// Terminologie bilingue stricte des quatre cadres graphiques.
const FAMILY_TITLES: Record<string, { fr: string; en: string }> = {
  wa: { fr: "Poids descendant", en: "Downweight" },
  wd: { fr: "Poids remontant", en: "Upweight" },
  bal: { fr: "Poids d'équilibre", en: "Balance Weight" },
  fric: { fr: "Friction", en: "Friction" },
};
export function familyTitle(id: string, lang: string, fallback: string) {
  const entry = FAMILY_TITLES[id];
  if (!entry) return fallback;
  return lang === "en" ? entry.en : entry.fr;
}
const DY_STEPS = [-15, 0, 15, 30, 45];
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
  const whiteLine: LineDef = { dataKey: metric[1], name: white, shortName: white, color: "#6b7280", real: true };
  const blackLine: LineDef = { dataKey: metric[2], name: black, shortName: black, color: "#000000", real: true };
  if (keyFilter === "split") return [whiteLine, blackLine];
  if (keyFilter === "white") return [whiteLine];
  if (keyFilter === "black") return [blackLine];
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
  const whiteLine: LineDef = { dataKey: metric[1], name: `${name} blanches`, shortName: `${short} blanches`, color: light };
  const blackLine: LineDef = { dataKey: metric[2], name: `${name} noires`, shortName: `${short} noires`, color: strong };
  if (keyFilter === "split") return [whiteLine, blackLine];
  if (keyFilter === "white") return [whiteLine];
  if (keyFilter === "black") return [blackLine];
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

// Index du premier / dernier point défini À L'INTÉRIEUR de la fenêtre affichée.
// En mode zoom, sans cette borne toutes les étiquettes retombaient sur le même
// point (hors fenêtre) et se chevauchaient en haut du graphique.
function firstDefinedIndexIn(data: ChartPoint[], key: SeriesKey, min: number, max: number) {
  for (let index = 0; index < data.length; index += 1) {
    const point = data[index];
    if (!point || point.key < min || point.key > max) continue;
    const value = point[key];
    if (typeof value === "number" && Number.isFinite(value)) return index;
  }
  return -1;
}
function lastDefinedIndexIn(data: ChartPoint[], key: SeriesKey, min: number, max: number) {
  for (let index = data.length - 1; index >= 0; index -= 1) {
    const point = data[index];
    if (!point || point.key < min || point.key > max) continue;
    const value = point[key];
    if (typeof value === "number" && Number.isFinite(value)) return index;
  }
  return -1;
}

// Libellé bilingue cyclique de la bascule N/B (4 états).
export function bwLabelFor(keyFilter: KeyFilter, lang: string) {
  if (lang === "en") {
    return keyFilter === "all" ? "B/W: grouped" : keyFilter === "split" ? "B/W: separated" : keyFilter === "white" ? "B/W: whites only" : "B/W: blacks only";
  }
  return keyFilter === "all" ? "N/B : groupées" : keyFilter === "split" ? "N/B : séparées" : keyFilter === "white" ? "N/B : blanches seules" : "N/B : noires seules";
}
export function nextKeyFilter(keyFilter: KeyFilter): KeyFilter {
  return keyFilter === "all" ? "split" : keyFilter === "split" ? "white" : keyFilter === "white" ? "black" : "all";
}

function MagnifyIcon() {
  return (
    <svg aria-hidden="true" className="h-[1.3rem] w-[1.3rem]" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
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
      <span>Molette : déplace courbe ◄ ►</span>
    </span>
  );
}
// Guide visuel : rappel clavier, sans icône.
function ArrowHintIcon() {
  return (
    <span className="flex items-center gap-2 rounded-full border border-gray-200 bg-white px-2 py-1 text-[0.65rem] font-medium !text-black shadow-sm">
      <span>{"Clavier <> : note préc./suiv."}</span>
    </span>
  );
}

/** Données de géométrie injectées par Recharts dans un enfant `Customized`. */
type GuideChartProps = {
  offset?: { left?: number; top?: number; width?: number; height?: number };
  xAxisMap?: Record<string, { scale?: (value: number) => number }>;
  yAxisMap?: Record<string, { scale?: (value: number) => number }>;
};

/**
 * Lignes de repère horizontales à géométrie brute : elles démarrent 5 px à
 * droite de l'axe vertical gradué (translaté de `axisShift`) et s'arrêtent
 * 5 px avant le repère vertical de la touche 88. Aucun débordement possible.
 */
function HorizontalGuides({
  ticks,
  axisShift,
  offset,
  xAxisMap,
  yAxisMap,
}: GuideChartProps & { ticks: number[]; axisShift: number }) {
  const left = offset?.left ?? 0;
  const width = offset?.width ?? 0;
  const yScale = Object.values(yAxisMap ?? {}).find((axis) => typeof axis?.scale === "function")?.scale;
  const xScale = Object.values(xAxisMap ?? {}).find((axis) => typeof axis?.scale === "function")?.scale;
  if (!yScale) return null;
  const rightEdge = xScale ? xScale(88) : left + width;
  // À gauche : la ligne touche exactement l'axe vertical, sans le dépasser.
  const x1 = left - axisShift;
  const x2 = rightEdge - 5;
  if (!(x2 > x1)) return null;
  return (
    <g>
      {ticks.map((tick) => {
        const y = yScale(tick);
        if (!Number.isFinite(y)) return null;
        return <line key={`guide-${tick}`} x1={x1} x2={x2} y1={y} y2={y} stroke="#9ca3af" strokeWidth={1} />;
      })}
    </g>
  );
}

type SubChartCtx = {
  chartData: ChartPoint[];
  keyFilter: KeyFilter;

  comparisonLabel: string;
  comparisonShort: string;
  currentBaseName: string;
  autoDomain: boolean;
  sideMargin: number;
  csvActive: boolean;
  targetLabel: string;
  onCycleKeyFilter: (() => void) | undefined;
  filters: Record<string, KeyFilter>;
  cycleFor: (familyId: string) => void;
  lang: string;
  zoomStart: number;
  setZoomStart: Dispatch<SetStateAction<number>>;
  setZoomId: Dispatch<SetStateAction<string | null>>;
  hoveredFamily: string | null;
  setHoveredFamily: Dispatch<SetStateAction<string | null>>;
  keyboardMode: boolean;
  plotRef: RefObject<HTMLDivElement | null>;
  lastMouseY: RefObject<number | null>;
  keyboardModeRef: RefObject<boolean>;
  lastMouseNote: RefObject<number | null>;
};

// SubChart est déclaré au niveau module (et non imbriqué dans ComparisonChart) pour
// éviter que React ne le démonte/remonte à chaque changement d'état clavier : un
// remontage détruit le SVG Recharts au moment exact du dispatch synthétique, ce qui
// empêchait les flèches ◄ ► d'allumer la pastille.
function SubChart({ family, zoomed = false, ctx }: { family: (typeof FAMILIES)[number]; zoomed?: boolean; ctx: SubChartCtx }) {
  const { chartData, keyFilter: baseKeyFilter, comparisonLabel, comparisonShort, currentBaseName, autoDomain, sideMargin, csvActive, targetLabel, onCycleKeyFilter, filters, cycleFor, lang, zoomStart, setZoomStart, setZoomId, hoveredFamily, setHoveredFamily, keyboardMode, plotRef, lastMouseY, keyboardModeRef, lastMouseNote } = ctx;
  // Réglage N/B strictement indépendant pour chaque cadre graphique.
  const keyFilter = filters[family.id] ?? baseKeyFilter;
  const bwLabel = bwLabelFor(keyFilter, lang);
  // Renommage dynamique de la courbe de référence : "Import CSV" (bleu) ou "Cloud" (orange),
  // scindée en blanches / noires quand la vue éclatée est active.
  const referenceLines = comparisonLinesFor(family.id, keyFilter, comparisonLabel, comparisonShort, csvActive);
  // Le libellé de la courbe verte reprend l'identité complète de la cible sélectionnée.
  const otherLines = family.lines
    .filter((line) => line.name !== "Cloud")
    .map((line) => (line.name === "Cible" ? { ...line, name: targetLabel } : line));
  const lines = [...currentLinesFor(family.id, keyFilter, currentBaseName), ...referenceLines, ...otherLines];
  // Chaque courbe est ancrée sur SON propre premier / dernier point défini
  // (indispensable en vue éclatée où blanches et noires ne partagent pas les mêmes index).
  const start = zoomed ? zoomStart : 1;
  // Axe vertical isolé : sur les cadres gradués, le domaine horizontal démarre
  // avant la touche 1 pour que l'axe ne touche jamais le départ des courbes.
  const domainX: [number, number] = zoomed ? [start, start + ZOOM_WINDOW - 1] : [autoDomain ? -3 : 1, 88];
  const firstIn = (key: SeriesKey) => firstDefinedIndexIn(chartData, key, domainX[0], domainX[1]);
  const lastIn = (key: SeriesKey) => lastDefinedIndexIn(chartData, key, domainX[0], domainX[1]);
  const endpointOffsets = (side: "left" | "right") => new Map(
    lines.map((line) => {
      const index = side === "left" ? firstIn(line.dataKey) : lastIn(line.dataKey);
      return [line.dataKey, offsetsFor(lines, chartData[index]).get(line.dataKey) ?? 0] as const;
    }),
  );
  const dyLeft = endpointOffsets("left");
  const dyRight = endpointOffsets("right");
  const DotComp = zoomed ? ZoomDot : SampleDot;
  const title = familyTitle(family.id, lang, family.title);
  // Domaine vertical FIGÉ sur le mode groupé : l'échelle et ses graduations ne
  // sont jamais recalculées quand l'artisan bascule N/B (groupé, séparé,
  // blanches seules, noires seules).
  const groupedLines = [
    ...currentLinesFor(family.id, "all", currentBaseName),
    ...comparisonLinesFor(family.id, "all", comparisonLabel, comparisonShort, csvActive),
    ...otherLines,
  ];
  const yDomain = autoDomain
    ? paddedDomain(
        chartData.flatMap((point) =>
          groupedLines.filter((line) => !line.hidden).map((line) => point[line.dataKey] as number | null),
        ),
      )
    : undefined;
  // Graduations entières calculées à la main : elles servent à la fois à l'axe
  // et aux lignes de repère horizontales (jamais la première ni la dernière).
  // px : l'axe vertical est placé exactement à mi-chemin entre le bord gauche du
  // cadre et le début du tracé (marge gauche = sideMargin + 46, axe = 44 px).
  // Recalage final : l'axe est décalé de 10 px supplémentaires vers la droite.
  const Y_AXIS_SHIFT = Math.round((sideMargin + 46 + 44) / 2) - 10;
  // Mode « N/B groupées » hors zoom : le bloc entier est translaté de 30 px vers
  // la gauche. L'axe vertical, lui, doit rester STRICTEMENT immobile : on le
  // recale de +30 px, et le tracé est élargi de 30 px de chaque côté.
  const groupedShift = !zoomed && keyFilter === "all" ? 30 : 0;
  const axisShift = Y_AXIS_SHIFT - groupedShift;
  const yTicks = (() => {
    if (!yDomain) return undefined;
    const [lo, hi] = yDomain as [number, number];
    const min = Math.ceil(lo);
    const max = Math.floor(hi);
    if (!Number.isFinite(min) || !Number.isFinite(max) || max <= min) return undefined;
    const step = Math.max(1, Math.ceil((max - min) / 5));
    const ticks: number[] = [];
    for (let v = min; v <= max; v += step) ticks.push(v);
    return ticks;
  })();



  return (
    <Frame dataFrame={family.id} title={title} className={`${zoomed ? "h-[calc(100vh-140px)] !pt-2" : "h-[300px] !pt-2"} ${!zoomed && hoveredFamily === family.id ? "z-20" : "z-0"}`}>
      <div className={`absolute right-3 z-20 flex flex-col items-end gap-1.5 ${zoomed ? "top-14" : "top-2"}`}>
        {zoomed && (
          <button type="button" aria-label="Quitter le zoom" onClick={() => setZoomId(null)} className="rounded-full border border-gray-300 bg-white p-1 !text-black hover:bg-gray-100"><CloseIcon /></button>
        )}
        {!zoomed && (
          <button type="button" aria-label={`Zoom sur ${title}`} onClick={() => { setZoomStart(1); setZoomId(family.id); }} className="rounded-full border border-gray-300 bg-white p-2 !text-black hover:bg-gray-100"><MagnifyIcon /></button>
        )}
        {onCycleKeyFilter && (
          <button
            type="button"
            aria-label={bwLabel}
            onClick={() => cycleFor(family.id)}
            className="flex items-center gap-1 rounded-full border border-gray-300 bg-white px-2 py-0.5 text-[0.68rem] font-medium !text-black hover:bg-gray-100"
          >
            <PianoKeysIcon />
            <span className="!text-black">{bwLabel}</span>
          </button>
        )}
      </div>
      {zoomed && (
        <div className="pointer-events-none absolute inset-x-0 top-[58px] z-10 flex flex-col items-center gap-1">
          <WheelHintIcon />
          <ArrowHintIcon />
        </div>
      )}
      <div
        ref={zoomed ? plotRef : undefined}
        className="h-full w-full"
        // Mode non-zoom : tout le bloc graphique (axes, repères, courbes,
        // étiquettes) est translaté vers la gauche. En mode « N/B groupées »,
        // le décalage total est de 30 px. Les boutons ne bougent pas (frères).
        style={zoomed ? undefined : { transform: `translateX(${keyFilter === "all" ? -30 : -10}px)` }}


        onMouseEnter={() => setHoveredFamily(family.id)}
        onMouseMove={(event) => {
          if (!event.nativeEvent.isTrusted) return;
          // En mode clavier, la hauteur Y est figée : on ignore les micro-mouvements.
          if (keyboardModeRef.current) return;
          const rect = event.currentTarget.getBoundingClientRect();
          lastMouseY.current = Math.round(event.clientY - rect.top);
        }}
      >
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={chartData}
            onMouseMove={(state: { activeLabel?: string | number }) => {
              if (keyboardMode) return;
              const note = Number(state?.activeLabel);
              if (Number.isFinite(note)) lastMouseNote.current = note;
            }}
            onMouseLeave={() => { setHoveredFamily(null); }}
            // Anti-chevauchement : la marge droite garantit toujours la place
            // du libellé « Moy: xx.xg », la marge gauche celle des noms courts.
            margin={{ top: 22, right: Math.max(sideMargin, 80) + groupedShift, bottom: 15, left: Math.max(autoDomain ? sideMargin + 46 : sideMargin, 70) - groupedShift }}
          >
            <XAxis xAxisId="main" dataKey="key" type="number" domain={domainX} allowDataOverflow hide allowDuplicatedCategory={false} />
            <XAxis xAxisId="topAxis" dataKey="key" type="number" domain={domainX} allowDataOverflow orientation="top" height={15} axisLine={false} tickLine={false} ticks={DO_POSITIONS} tick={<CustomTickTop dy={-6} />} allowDuplicatedCategory={false} />
            {autoDomain ? (
              // Axe vertical gradué : STRICTEMENT immobile, y compris quand le
              // bloc est translaté de 30 px vers la gauche en « N/B groupées ».
              <YAxis
                width={44}
                tickMargin={8}
                domain={yDomain ?? ["auto", "auto"]}
                {...(yTicks ? { ticks: yTicks } : {})}
                allowDecimals={false}
                tick={{ fontSize: 10, fill: "#111827", dx: -axisShift }}
                axisLine={{ stroke: "#111827", transform: `translate(${-axisShift},0)` }}
                tickLine={{ stroke: "#111827", transform: `translate(${-axisShift},0)` }}
              />

            ) : (
              <YAxis width={0} tick={false} axisLine={false} tickLine={false} domain={family.domain} />
            )}

            {/* Lignes de repère horizontales : géométrie brute imposée —
                début à 5 px à droite de l'axe vertical, fin à 5 px à gauche du
                repère vertical de la touche 88. Hors première et dernière
                graduation. */}
            {autoDomain && yTicks && yTicks.length > 2 && (
              <Customized
                component={(props: unknown) => (
                  <HorizontalGuides
                    {...(props as GuideChartProps)}
                    ticks={yTicks.slice(1, -1)}
                    axisShift={Y_AXIS_SHIFT}
                  />
                )}
              />
            )}



            {DO_POSITIONS.map((position) => <ReferenceLine key={position} xAxisId="main" x={position} stroke="#9ca3af" strokeWidth={1.4} />)}

            {/* Fenêtre flottante native : une seule bulle par touche, toutes courbes confondues. */}
            <Tooltip
              trigger="hover"
              content={<CustomTooltipContent chartData={chartData} />}
              cursor={{ stroke: "#d1d5db", strokeWidth: 1 }}
              allowEscapeViewBox={{ x: true, y: true }}
              wrapperStyle={{ pointerEvents: "none", zIndex: 100 }}
              isAnimationActive={false}
              offset={24}
            />

            {lines.map((line) => {
              // Page Résultats + captures PDF : rendu strictement noir & blanc
              // (aucune couleur bleue / verte / orange / violette résiduelle).
              const color = autoDomain
                ? line.dataKey.toLowerCase().includes("white") || line.color === "#6b7280"
                  ? "#4b5563"
                  : "#111827"
                : line.color;
              return (
              <Line
                key={line.dataKey}
                xAxisId="main"
                type="monotone"
                dataKey={line.dataKey}
                name={line.name}
                stroke={line.hidden ? "transparent" : color}
                strokeWidth={2}
                activeDot={line.hidden ? false : { r: 5, fill: color, stroke: "#ffffff", strokeWidth: 2 }}
                dot={line.real ? <DotComp /> : false}
                connectNulls={true}
                isAnimationActive={false}
                label={makeEndLabel({ shortName: line.shortName, avg: seriesAverage(chartData, line.dataKey), color, firstIndex: firstIn(line.dataKey), lastIndex: lastIn(line.dataKey), dyLeft: line.hidden ? 0 : dyLeft.get(line.dataKey) ?? 0, dyRight: line.hidden ? 0 : dyRight.get(line.dataKey) ?? 0, showAverage: !line.hidden, maxY: zoomed ? 100000 : LABEL_MAX_Y })}
              />
              );
            })}

          </LineChart>
        </ResponsiveContainer>
      </div>
    </Frame>
  );
}

export function ComparisonChart({ chartData, keyFilter, comparisonLabel, comparisonShort, currentBaseName = "Piano actuel", autoDomain = false, sideMargin = 140, csvActive = false, targetLabel = "Cible", onCycleKeyFilter }: { chartData: ChartPoint[]; keyFilter: KeyFilter; comparisonLabel: string; comparisonShort: string; currentBaseName?: string; autoDomain?: boolean; sideMargin?: number; csvActive?: boolean; targetLabel?: string; onCycleKeyFilter?: () => void }) {
  const lang = useLang();
  // Chaque cadre graphique garde son propre réglage N/B (4 états cycliques).
  const [filters, setFilters] = useState<Record<string, KeyFilter>>({});
  const cycleFor = (familyId: string) =>
    setFilters((current) => ({ ...current, [familyId]: nextKeyFilter(current[familyId] ?? keyFilter) }));
  const [hoveredFamily, setHoveredFamily] = useState<string | null>(null);

  // Export PDF : les 4 cadres passent d'office en « N/B séparées » avant capture.
  useEffect(() => {
    const force = () =>
      setFilters({ wa: "split", wd: "split", bal: "split", fric: "split" });
    window.addEventListener("piano-pdf-force-split", force);
    return () => window.removeEventListener("piano-pdf-force-split", force);
  }, []);

  const [zoomId, setZoomId] = useState<string | null>(null);
  const [zoomStart, setZoomStart] = useState(1);
  const [kbNote, setKbNote] = useState<number | null>(null);
  const [keyboardMode, setKeyboardMode] = useState(false);
  const keyboardModeRef = useRef(false);
  const kbNoteRef = useRef<number | null>(null);
  const zoomStartRef = useRef(1);
  keyboardModeRef.current = keyboardMode;
  kbNoteRef.current = kbNote;
  zoomStartRef.current = zoomStart;
  

  // Dernière hauteur (Y) décidée par la souris : la FF pilotée au clavier y reste figée.
  const lastMouseY = useRef<number | null>(null);
  // Dernière note (index X) survolée par la souris : point de départ du pilotage clavier.
  const lastMouseNote = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const zoomRef = useRef<HTMLDivElement>(null);
  // Zone de tracé du cadre zoomé : sert à rejouer un survol réel à la note pilotée au clavier.
  const plotRef = useRef<HTMLDivElement>(null);

  // Contexte stable passé au SubChart (déclaré au niveau module) : évite le
  // démontage/remontage du graphique Recharts à chaque changement d'état clavier.
  const subCtx: SubChartCtx = {
    chartData, keyFilter, comparisonLabel, comparisonShort, currentBaseName, autoDomain, sideMargin, csvActive, targetLabel, onCycleKeyFilter, filters, cycleFor, lang,
    zoomStart, setZoomStart, setZoomId, hoveredFamily, setHoveredFamily, keyboardMode,
    plotRef, lastMouseY, keyboardModeRef, lastMouseNote,
  };

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

  // ---------------------------------------------------------------------------
  // Arbitrage clavier / souris en mode zoom (logique unique, remise à plat).
  // Règles : une flèche ◄ ► donne le contrôle absolu au clavier à partir de la
  // note active ; la FF reste à la hauteur Y fixée par la souris ; la souris ne
  // reprend la main qu'après un déplacement physique de plus de 30 px, et repart
  // alors de la dernière note du clavier.
  // ---------------------------------------------------------------------------
  // ---------------------------------------------------------------------------
  // Verrou clavier / souris en mode zoom (logique de lock brute).
  // Une flèche ◄ ► active le verrou (isKeyboardActive = true) et déplace la
  // pastille de ±1. Tant que le verrou est actif, la souris n'a aucun droit de
  // lecture ni d'écriture (return immédiat dans onMouseMove). Le verrou retombe
  // tout seul après 400 ms sans appui. La FF reste figée à la hauteur Y
  // (lastMouseY) mémorisée par la souris, via le survol synthétique rejoué.
  // ---------------------------------------------------------------------------
  const kbLockTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!zoomId) {
      setKbNote(null);
      setKeyboardMode(false);
      keyboardModeRef.current = false;
      if (kbLockTimer.current) { clearTimeout(kbLockTimer.current); kbLockTimer.current = null; }
      return;
    }

    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return;
      if (event.key === "Escape") { setZoomId(null); return; }
      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
      event.preventDefault();
      const step = event.key === "ArrowRight" ? 1 : -1;
      // Le clavier prend la main : verrou immédiat.
      keyboardModeRef.current = true;
      setKeyboardMode(true);
      const base = kbNoteRef.current ?? lastMouseNote.current ?? Math.round(zoomStartRef.current + ZOOM_WINDOW / 2);
      const next = Math.min(Math.max(base + step, 1), 88);
      kbNoteRef.current = next;
      lastMouseNote.current = next;
      setKbNote(next);
      setZoomStart((start) => {
        if (next < start) return Math.max(next, 1);
        if (next > start + ZOOM_WINDOW - 1) return Math.min(next - ZOOM_WINDOW + 1, 88 - ZOOM_WINDOW + 1);
        return start;
      });
      // Minuteur de 400 ms : la souris reste interdite pendant ce délai.
      if (kbLockTimer.current) clearTimeout(kbLockTimer.current);
      kbLockTimer.current = setTimeout(() => {
        keyboardModeRef.current = false;
        setKeyboardMode(false);
        kbLockTimer.current = null;
      }, 400);
    };

    window.addEventListener("keydown", onKey, true);
    return () => {
      window.removeEventListener("keydown", onKey, true);
      if (kbLockTimer.current) { clearTimeout(kbLockTimer.current); kbLockTimer.current = null; }
    };
  }, [zoomId]);

  // Pilotage clavier : on rejoue un survol synthétique sur la surface Recharts à la
  // note active, à la hauteur Y mémorisée de la souris. La bulle native suit à ce Y
  // (Recharts positionne la FF sur le clientY du survol) et la pastille s'allume.
  useEffect(() => {
    if (!zoomId || !keyboardMode || kbNote === null) return;
    const node = zoomRef.current ?? plotRef.current;
    if (!node) return;
    const surface = node.querySelector(".recharts-surface") as SVGElement | null;
    if (!surface) return;
    const rect = surface.getBoundingClientRect();
    const fraction = Math.min(Math.max((kbNote - zoomStart) / (ZOOM_WINDOW - 1), 0), 1);
    const x = rect.left + sideMargin + (rect.width - sideMargin * 2) * fraction;
    const mouseY = lastMouseY.current ?? rect.height / 2;
    const y = rect.top + Math.min(Math.max(mouseY, 10), rect.height - 10);
    surface.dispatchEvent(new MouseEvent("mousemove", { clientX: x, clientY: y, bubbles: true, cancelable: true, view: window }));
  }, [zoomId, keyboardMode, kbNote, zoomStart, sideMargin]);







  const zoomFamily = FAMILIES.find((family) => family.id === zoomId);
  if (zoomFamily) {
    // Mode zoom : le cadre isolé occupe 100 % de la largeur de l'écran.
    return (
      <div ref={zoomRef} className="fixed inset-0 z-[70] overflow-hidden bg-white p-6">
        <SubChart family={zoomFamily} zoomed ctx={subCtx} />
      </div>
    );
  }

  // Largeur normale : 80 % de la page, centrée.
  // Largeur normale : 80 % de la largeur de la page web (et non de la colonne),
  // les cadres sont extraits de la grille via une bande pleine largeur centrée.
  return (
    <div ref={containerRef} className="relative w-full pb-[80vh] pt-2">
      <div className="flex w-full flex-col gap-4">
        {/* Deux paires : chaque paire est capturée en UNE seule image PDF. */}
        <div data-frame="pair1" className="flex w-full flex-col gap-4">
          {FAMILIES.slice(0, 2).map((family) => <SubChart key={family.id} family={family} ctx={subCtx} />)}
        </div>
        <div data-frame="pair2" className="flex w-full flex-col gap-4">
          {FAMILIES.slice(2).map((family) => <SubChart key={family.id} family={family} ctx={subCtx} />)}
        </div>
      </div>
    </div>
  );

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
  { key: "wa", label: "Poids descendant", labelEn: "Downweight" },
  { key: "wd", label: "Poids remontant", labelEn: "Upweight" },
  { key: "friction", label: "Friction", labelEn: "Friction" },
  { key: "balance", label: "Poids d'équilibre", labelEn: "Balance Weight" },
] as const;
type MetricKey = (typeof COLUMNS)[number]["key"];


// Charte couleur stricte : rangée 1 noire, rangée 2 orange, rangée 3 verte.
type Tone = "cur" | "ref" | "csv" | "std";
const TONE_CLASS: Record<Tone, string> = {
  cur: "!text-black",
  ref: "!text-orange-600",
  csv: "!text-blue-600",
  std: "!text-green-600",
};

// Bloc de moyenne façon page Saisie : moyenne globale en grand + détail Blanches/Noires.
function AverageBlock({ label, global, white, black, tone }: { label: string; global: string; white: string; black: string; tone: Tone }) {
  const toneClass = TONE_CLASS[tone];
  const val = (v: string) => v === "—" ? <span className={toneClass}>—</span> : <>{v}<span className="!text-xs !font-medium"> gr.</span></>;
  const sub = (v: string) => v === "—" ? "—" : <>{v}<span className={toneClass}> gr.</span></>;
  return (
    <div className="flex h-full flex-col justify-end rounded bg-muted px-2 py-1.5 text-center">
      <div className="!text-[1.1rem] font-bold tracking-wide !text-black">{label}</div>
      <div className={`mt-1 !text-2xl !font-bold tabular-nums ${toneClass}`}>{val(global)}</div>
      <div className={`mt-0.5 flex items-end justify-center gap-2 text-[0.65rem] tabular-nums ${toneClass}`}>
        <span>{sub(white)}</span>
        <span className={toneClass}>/</span>
        <span>{sub(black)}</span>
      </div>
      <div className={`flex items-end justify-center gap-2 text-[0.55rem] tabular-nums ${toneClass}`}>
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

export function AverageRow({ chartData, source, hasData, csv = false }: { chartData: ChartPoint[]; source: "cur" | "ref"; hasData: boolean; csv?: boolean }) {
  const lang = useLang();
  return (
    <div className="grid grid-cols-4 gap-3">
      {COLUMNS.map(({ key, label, labelEn }) => {
        const [globalKey, whiteKey, blackKey] = AVG_KEYS[key][source];
        return (
          <AverageBlock
            key={key}
            label={lang === "en" ? labelEn : label}
            tone={source === "ref" && csv ? "csv" : source}
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
          <div key={key} className="flex h-full flex-col justify-end rounded bg-muted px-2 py-1.5 text-center">
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

const PILL_BASE = "h-[31px] min-h-[31px] max-h-[31px] min-w-0 flex-none shrink-0 rounded-full border px-1.5 py-0 text-[0.68rem] leading-none transition-colors whitespace-nowrap";
const pillClass = (active: boolean) => `${PILL_BASE} ${active ? "border-black bg-gray-100 font-semibold text-slate-700" : "border-gray-200 bg-white text-gray-400 hover:border-gray-300 hover:text-gray-500"}`;
// Boutons cycliques Oui/Non (CLOUD, CIBLE, IMPORT CSV) : bordure noire quand actif.
const cyclePillClass = (active: boolean) =>
  `${PILL_BASE} flex w-full items-center justify-start gap-2 border-gray-200 bg-white !opacity-100 hover:border-gray-300 [&_svg]:!opacity-100`;

/** Infobulle maison : rapide au 1er survol, délai doublé ensuite, décalée de 30 px du bouton. */
function FastTip({ text, children }: { text: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const seen = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  return (
    <div
      className="relative w-full"
      onMouseEnter={() => { const d = seen.current ? 250 : 125; timer.current = setTimeout(() => { seen.current = true; setOpen(true); }, d); }}
      onMouseLeave={() => { if (timer.current) clearTimeout(timer.current); setOpen(false); }}
    >
      {children}
      {open && (
        <div className="pointer-events-none absolute right-full top-1/2 z-50 mr-[-30px] w-60 -translate-y-1/2 rounded-md border border-gray-300 bg-white px-2 py-1 text-[0.7rem] font-medium !text-black shadow-lg">{text}</div>
      )}
    </div>
  );
}


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

/** Petit clavier de piano épuré (touches blanches + noires). */
export function PianoKeysIcon({ bold = false }: { bold?: boolean }) {
  return (
    <svg aria-hidden="true" className={`h-3.5 w-3.5 shrink-0 ${bold ? "font-bold" : ""}`} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={bold ? 2.4 : 1.2} strokeLinejoin="round">
      <rect x="2" y="4" width="16" height="12" rx="1.2" />
      <path d="M6.5 4v12M10 4v12M13.5 4v12" />
      <rect x="5" y="4" width="3" height="6.5" fill="currentColor" stroke="none" />
      <rect x="12" y="4" width="3" height="6.5" fill="currentColor" stroke="none" />
    </svg>
  );
}


type SidebarPanelProps = {
  cloudEnabled: boolean;
  standardEnabled: boolean;
  csvActive: boolean;
  cloudSampleCount: number;
  cloudTotalCount: number;
  cloudLoading: boolean;
  onToggleCloud: () => void;
  onToggleStandard: () => void;
  onImport: (file: File) => void;
  onClearCsv: () => void;
  filtersDisabled: boolean;
  sameClimate: boolean;
  sameYear: boolean;
  importantChanges: ChangesFilter;
  youngOnly: boolean;
  usageLevel: UsageLevel;
  setSameClimate: (value: boolean) => void;
  setSameYear: (value: boolean) => void;
  setImportantChanges: (value: ChangesFilter) => void;
  setYoungOnly: (value: boolean) => void;
  cycleUsage: () => void;

};

function SidebarPanel(props: SidebarPanelProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const lang = useLang();
  const en = lang === "en";
  const usageLabel = props.usageLevel === "low" ? "FAIBLE" : props.usageLevel === "medium" ? "MOYEN" : "INTENSIF";
  const changesLabel = props.importantChanges === "included" ? "INCLUS" : props.importantChanges === "excluded" ? "EXCLUS" : "SEULS";
  const tipCloud = en
    ? "Compare your piano with the same model shared by other users."
    : "Comparez votre piano avec ceux du même modèle partagés par d'autres utilisateurs.";
  const tipTarget = en
    ? "Generic values generally expected for a piano keyboard."
    : "Valeurs génériques généralement attendues pour un clavier de piano.";
  const tipCsv = en
    ? "Import your measurement files in CSV format from your local storage."
    : "Importez vos fichiers de mesures format CSV depuis votre stockage local.";
  // Filtres du bas : bascule ON/OFF. Aucune icône, aucune bordure noire.
  // État ON signalé par un "V" majuscule noir juste après le titre en CAPITALES.
  const cycleRow = (label: string, checked: boolean, onChange: (value: boolean) => void) => (
    <Button
      type="button"
      variant="outline"
      disabled={props.filtersDisabled}
      aria-pressed={checked}
      onClick={() => onChange(!checked)}
      className={`${PILL_BASE} flex w-full items-center justify-start gap-2 border-gray-200 bg-white !opacity-100 hover:border-gray-300 disabled:!opacity-100`}
    >
      {/* Espaceur invisible de même largeur que l'icône RefreshCw (16px) pour aligner le début du texte sur les boutons du haut. */}
      <span className="w-4 shrink-0" aria-hidden="true" />
      <span className="flex items-center font-bold uppercase text-black">
        {label}
        {checked
          ? <SquareX size={18} strokeWidth={2.6} className="ml-[10px] shrink-0 !text-black" />
          : <Square size={18} strokeWidth={1.4} className="ml-[10px] shrink-0 !text-black" />}
      </span>
    </Button>
  );

  const sourceButtonClass = (active: boolean, activeText: string) =>
    `${PILL_BASE} flex w-full items-center justify-start gap-2 bg-white !opacity-100 disabled:!opacity-100 hover:border-gray-300 ${active ? `border-black ${activeText}` : "border-gray-200 !text-black"} [&_svg]:!opacity-100`;

  return (
    <Frame title="Réglages" className="flex flex-1 flex-col">
      <div className="flex h-full flex-col items-stretch justify-start gap-2 pt-2">
          <div className="text-sm font-bold !text-black">{en ? "Compare current piano with:" : "Comparer piano actuel avec :"}</div>
          <FastTip text={tipCloud}><Button type="button" variant="outline" aria-pressed={props.cloudEnabled} onClick={props.onToggleCloud} className={sourceButtonClass(props.cloudEnabled, "!text-orange-600")}><span className="w-full text-center font-bold uppercase">Cloud</span></Button></FastTip>
          <div className="flex items-center gap-1"><FastTip text={tipTarget}><Button type="button" variant="outline" aria-pressed={props.standardEnabled} onClick={props.onToggleStandard} className={sourceButtonClass(props.standardEnabled, "!text-green-600")}><span className="w-full text-center font-bold uppercase">{en ? "Target" : "Cible"}</span></Button></FastTip><TargetLegalInfoIcon /></div>
           <FastTip text={tipCsv}><Button type="button" variant="outline" aria-pressed={props.csvActive} onClick={() => { if (props.csvActive) props.onClearCsv(); else inputRef.current?.click(); }} className={`${sourceButtonClass(props.csvActive, "!text-blue-600")} ${props.csvActive ? "!border-black !text-blue-700 [&_svg]:!text-blue-700" : "!border-gray-200 !text-black"}`}><span className="w-full text-center font-bold uppercase">{en ? "Imported CSV" : "IMPORT CVS"}</span></Button></FastTip>
          <input ref={inputRef} type="file" accept=".csv,text/csv" className="hidden" onChange={(event) => { const file = event.target.files?.[0]; if (file) props.onImport(file); event.target.value = ""; }} />
          <div className="mt-5 border-t border-gray-400 pt-5 text-sm font-bold" style={{ color: "#f97316" }}>{en ? "CLOUD filters" : "Filtres CLOUD"}</div>
          <Button type="button" variant="outline" disabled={props.filtersDisabled} onClick={props.cycleUsage} aria-label={`Usage instrument : ${usageLabel}`} className={`${PILL_BASE} flex w-full items-center justify-start gap-2 border-gray-200 bg-white !text-black !opacity-100 disabled:!opacity-100 font-medium hover:border-gray-300 [&_svg]:!text-black [&_svg]:!opacity-100`}><RefreshCw size={14} strokeWidth={props.usageLevel !== "low" ? 2.5 : 1.2} className="shrink-0" /><span className="!text-black font-bold uppercase">Usage instrument : <span className="!text-black font-semibold uppercase">{usageLabel}</span></span></Button>
          <Button type="button" variant="outline" disabled={props.filtersDisabled} onClick={() => props.setImportantChanges(props.importantChanges === "included" ? "excluded" : props.importantChanges === "excluded" ? "only" : "included")} className={`${PILL_BASE} flex w-full items-center justify-start gap-2 border-gray-200 bg-white text-left !text-black !opacity-100 disabled:!opacity-100 [&_svg]:!text-black [&_svg]:!opacity-100`}><RefreshCw size={14} strokeWidth={props.importantChanges !== "excluded" ? 2.5 : 1.2} className="shrink-0" /><span className="!text-black font-bold uppercase">Modifications importantes : <span className="!text-black font-semibold uppercase">{changesLabel}</span></span></Button>
          {cycleRow("Même zone climatique", props.sameClimate, props.setSameClimate)}
          {cycleRow("Même année de fabrication", props.sameYear, props.setSameYear)}
          {cycleRow("Pianos de moins de 5 ans", props.youngOnly, props.setYoungOnly)}
          <div className="text-center font-bold leading-tight" style={{ color: "#f97316", marginTop: "15px", fontSize: "0.85rem" }}>
            {(!Number(props.cloudSampleCount) || !Number(props.cloudTotalCount)) ? (
              <>
                <div>{en ? "0 pianos of this model on the Cloud yet" : "0 piano de ce modèle pour l'instant"}</div>
                <div>{en ? "Be the first to contribute" : "Soyez le 1er à contribuer"}</div>
                <div>{en ? "for this model!" : "pour ce modèle !"}</div>
              </>
            ) : (
              <>
                <div className="uppercase">{props.cloudSampleCount}/{props.cloudTotalCount} pianos</div>
                <div className="uppercase">{en ? "with identical model" : "modèle identique"}</div>
                <div className="uppercase">{en ? "on the Cloud" : "sur le Cloud"}</div>
              </>
            )}
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

/** Comptage compact des touches mesurées : " - xx Blanches / yy Noires". */
function countKeys(values: number[] | undefined) {
  let white = 0;
  let black = 0;
  (values ?? []).forEach((value, index) => {
    if (typeof value !== "number" || !Number.isFinite(value)) return;
    if (isBlackKey(index + 1)) black += 1;
    else white += 1;
  });
  return ` - ${white} Blanches / ${black} Noires`;
}

function Comparer() {
  const [sourceMode, setSourceMode] = useState<SourceMode>("cloud");
  const [standardEnabled, setStandardEnabled] = useState(true);
  const [keyFilter, setKeyFilter] = useState<KeyFilter>("all");
  const [sameClimate, setSameClimate] = useState(true);
  const [sameYear, setSameYear] = useState(false);
  const [importantChanges, setImportantChanges] = useState<ChangesFilter>("excluded");
  const [youngOnly, setYoungOnly] = useState(false);
  const [usageLevel, setUsageLevel] = useState<UsageLevel>("low");
  const [mine, setMine] = useState<ProfileRecord | null>(null);
  const [standard, setStandard] = useState<RefProfile>(FACTORY_STANDARD);
  const [standardLabel, setStandardLabel] = useState("CIBLE (Internet)");

  const [cloudProfile, setCloudProfile] = useState<RefProfile | null>(null);
  const [cloudSampleCount, setCloudSampleCount] = useState(0);
  const [cloudTotalCount, setCloudTotalCount] = useState(0);
  const [cloudLoading, setCloudLoading] = useState(false);
  // État indépendant : le CSV importé alimente UNIQUEMENT la courbe orange.
  // current_piano (courbe Live noire) et le buffer PIANO_ACTUEL ne sont jamais touchés.
  const [comparedPiano, setComparedPiano] = useState<ProfileRecord | null>(null);
  const [status, setStatus] = useState<"loading" | "ok" | "error">("loading");
  const averagesRef = useRef<HTMLDivElement>(null);
  const settingsRef = useRef<HTMLDivElement>(null);
  // Miroir hors écran de la page Saisie : pages 1 à 3 du rapport unique.
  const mirrorAveragesRef = useRef<HTMLElement | null>(null);
  const mirrorSheetRef = useRef<HTMLElement | null>(null);
  const mirrorChartsRef = useRef<HTMLDivElement>(null);
  const liveChartsRef = useRef<HTMLDivElement>(null);

  // Export PDF autonome de la page Comparer : 3 pages A4 portrait en PNG.
  useEffect(() => {
    const onPdf = () => {
      window.dispatchEvent(new CustomEvent("piano-pdf-force-split"));
      setTopbarState({ isExporting: true, exportProgress: 0 });
      // 150 ms : « Export en cours... » a le temps d'être peint (10 px sous
      // le bouton Sauver) avant le calcul lourd des captures.
      window.setTimeout(() => {
        void (async () => {
          try {
            const inside = (root: HTMLElement | null, id: string) =>
              root?.querySelector<HTMLElement>(`[data-frame="${id}"]`) ?? null;
            const pick = (id: string) => inside(liveChartsRef.current, id);
            const mirror = (id: string) => inside(mirrorChartsRef.current, id);
            const keep = (list: Array<HTMLElement | null>) =>
              list.filter((el): el is HTMLElement => el !== null);
            const pages: LandscapePage[] = [
              // Pages 1 à 3 : atelier (miroir hors écran de la page Saisie).
              {
                blocks: keep([mirrorAveragesRef.current, mirrorSheetRef.current]),
                layout: "column" as const,
              },
              { blocks: keep([mirror("wa"), mirror("wd")]), layout: "column" as const },
              { blocks: keep([mirror("bal"), mirror("fric")]), layout: "column" as const },
              // Page 4 : titre officiel, « Réglages » à gauche et « Moyennes » à droite.
              {
                blocks: keep([settingsRef.current, averagesRef.current]),
                layout: "row" as const,
                title: "COMPARAISON PROFIL PIANO ACTUEL VS CLOUD ET/OU CIBLES",
              },
              // Page 5 : Poids descendant (haut) et Poids remontant (bas).
              { blocks: keep([pick("pair1")]), layout: "column" as const },
              // Page 6 : Poids d'équilibre (haut) et Friction (bas).
              { blocks: keep([pick("pair2")]), layout: "column" as const },
            ].filter((page) => page.blocks.length > 0);
            if (pages.length === 0) return;
            await generateComparisonReport(pages, "COMPARATIF_TOUCHWEIGHT.pdf", 1, 6);
          } finally {
            setTopbarState({ isExporting: false });
          }
        })();
      }, 150);
    };
    window.addEventListener("piano-export-pdf", onPdf);
    return () => window.removeEventListener("piano-export-pdf", onPdf);
  }, []);
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


  // Compteur global de fiches pianos publiées sur le Cloud (hors ligne tampon).
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const { count } = await externalSupabase
        .from("piano_profiles")
        .select("id", { count: "exact", head: true })
        .neq("id", CURRENT_PIANO_BUFFER_UUID);
      if (!cancelled && typeof count === "number") setCloudTotalCount(count);
    })();
    return () => { cancelled = true; };
  }, []);

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
      if (importantChanges === "only") query = query.eq("maintenance_type", "Major modifications");
      else if (importantChanges === "excluded") query = query.neq("maintenance_type", "Major modifications");
      else query = query.not("maintenance_type", "eq", "Major modifications");
      if (youngOnly) query = query.gte("manufacture_year", new Date().getFullYear() - 5);
      query = query.eq("usage_level", databaseUsage(usageLevel));

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
  // Résumé IMPORT CSV scindé : identité du fichier puis portion statistique/temporelle
  // formatée exactement comme la première ligne (casse normale).
  // Identité du CSV : aucun tiret vide, aucune mention "SN" orpheline.
  const csvIdentity = comparedPiano
    ? [
        [comparedPiano.brand, comparedPiano.model].filter(Boolean).join(" "),
        comparedPiano.year ? String(comparedPiano.year) : "",
        comparedPiano.serialNumber ? `SN ${comparedPiano.serialNumber}` : "",
      ]
        .filter(Boolean)
        .join(" - ")
    : "";
  const csvStats = comparedPiano
    ? ` - Mesure ${formatMeasureDate(comparedPiano.measureDate)}${comparedTime}${countKeys(comparedPiano.wa)}`
    : "";

  const chartData = useMemo(() => buildChartData(mine, comparisonProfile, standardEnabled ? standard : null), [mine, comparisonProfile, standard, standardEnabled]);

  async function handleImport(file: File) {
    try {
      const parsed = parseDiagnosticCsv(await readCsvFileContent(file));
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
    setUsageLevel((value) => value === "low" ? "medium" : value === "medium" ? "intensive" : "low");
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
        ? "- Moyennes sur base de 1 profil de modèle identique\u00A0"
        : `Moyennes sur ${cloudSampleCount} pianos de modèle identique enregistrés par les utilisateurs`;

  // Pages 1 à 3 du rapport : profil du piano actuel seul, courbes séparées.
  const mirrorChartData = useMemo(() => buildChartData(mine, null, null), [mine]);

  return (
    <main className="mx-auto w-full max-w-[1400px] px-6 py-8">
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-x-0 top-[77px] z-40 h-[50px] bg-white"
      />
      {/* Miroir hors écran (jamais visible) : cadre Mesures + graphiques
          d'atelier, source des pages 1 à 3 du rapport PDF unique. */}
      <PianoSheetMirror
        wa={mine?.wa ?? []}
        wd={mine?.wd ?? []}
        summary={summary}
        averagesRef={(node) => {
          mirrorAveragesRef.current = node;
        }}
        sheetRef={(node) => {
          mirrorSheetRef.current = node;
        }}
      />
      <div aria-hidden="true" className="absolute -left-[9999px] top-0 pointer-events-none">
        <div ref={mirrorChartsRef} className="!w-[1250px] !min-w-[1250px] !max-w-[1250px] bg-white">
          <ComparisonChart
            chartData={mirrorChartData}
            keyFilter="split"
            comparisonLabel=""
            comparisonShort=""
            currentBaseName=""
            autoDomain
            sideMargin={60}
          />
        </div>
      </div>
      {status === "loading" ? <p className="py-16 text-center text-muted-foreground">Chargement des profils externes…</p> : (
        <>
          <div className="grid w-full grid-cols-[minmax(0,1fr)_minmax(250px,300px)] items-stretch gap-6">
            <div className="min-w-0">
              
              <div ref={averagesRef} data-pdf-expand className="sticky top-[127px] z-50 mb-[50px] w-full bg-white pb-2 relative">
                <Frame titleClassName="absolute -top-3.5 left-4 whitespace-nowrap bg-card px-2 text-lg font-bold text-foreground" title={<span>Moyennes</span>} className="h-fit">
                  {/* Séparateurs affichés uniquement si au moins deux sources sont présentes. */}
                  <div className={(comparedPiano !== null || sourceMode === "cloud" || standardEnabled) ? "mb-3 border-b border-gray-400 pb-3" : ""}><div className="mb-1.5 px-1 text-[0.7rem] font-semibold uppercase tracking-wide !text-black">Piano actuel : <span className="normal-case">{summary}</span></div><AverageRow chartData={chartData} source="cur" hasData={mine !== null} /></div>
                  {(comparedPiano !== null || sourceMode === "cloud") && (
                    <div className={standardEnabled ? "mb-3 border-b border-gray-400 pb-3" : ""}>
                      <div className={`mb-1.5 px-1 text-[0.7rem] font-semibold uppercase tracking-wide ${comparedPiano ? "!text-blue-600" : "!text-orange-600"}`}>{comparedPiano ? <>IMPORT CSV : <span className="normal-case">{csvIdentity}{csvStats}</span></> : <>Cloud</>}{cloudActive && <span className="ml-2 normal-case text-orange-600">{cloudCounterText}{countKeys(cloudProfile?.wa)}</span>}</div>
                      <AverageRow chartData={chartData} source="ref" hasData={comparisonProfile !== null} csv={comparedPiano !== null} />
                      {cloudIsEmpty && <p className="mt-3 text-center text-sm font-semibold text-slate-600">Échantillon trop faible pour générer une moyenne</p>}
                    </div>
                  )}
                  {standardEnabled && (
                    <div>
                      <div className="mb-1.5 px-1 text-[0.7rem] font-semibold uppercase tracking-wide !text-green-600">{standardLabel}<BrandTargetInfoIcon variant={/standard/i.test(standardLabel) ? "standard" : "brand"} /></div>
                      <StandardRow chartData={chartData} />
                    </div>
                  )}
                </Frame>
              </div>

              <div ref={liveChartsRef}>
                <ComparisonChart chartData={chartData} keyFilter={keyFilter} comparisonLabel={comparedPiano ? "Import CSV" : "Cloud"} comparisonShort={comparedPiano ? "Import CSV" : "Cloud"} csvActive={comparedPiano !== null} targetLabel={standardEnabled ? standardLabel : "Cible"} onCycleKeyFilter={cycleKeyFilter} />
              </div>
            </div>
            <aside className="min-w-0"><div ref={settingsRef} data-pdf-expand className="sticky top-[127px] z-50 flex flex-col overflow-visible" style={averagesHeight > 0 ? { height: `${averagesHeight - 8}px` } : undefined}><SidebarPanel cloudEnabled={sourceMode === "cloud" && !comparedPiano} standardEnabled={standardEnabled} csvActive={comparedPiano !== null} cloudSampleCount={cloudSampleCount} cloudTotalCount={cloudTotalCount} cloudLoading={cloudLoading} onToggleCloud={() => { if (comparedPiano) { resetComparison(); } else { setSourceMode((value) => value === "cloud" ? "none" : "cloud"); } }} onToggleStandard={() => setStandardEnabled((value) => !value)} onImport={(file) => void handleImport(file)} onClearCsv={resetComparison} filtersDisabled={sourceMode !== "cloud" || comparedPiano !== null} sameClimate={sameClimate} sameYear={sameYear} importantChanges={importantChanges} youngOnly={youngOnly} usageLevel={usageLevel} setSameClimate={setSameClimate} setSameYear={setSameYear} setImportantChanges={setImportantChanges} setYoungOnly={setYoungOnly} cycleUsage={cycleUsage} /></div></aside>
          </div>
        </>
      )}
    </main>
  );
}
