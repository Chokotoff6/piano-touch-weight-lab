import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { parseDiagnosticCsv } from "@/lib/import-csv";
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
const SAMPLE_NOTES = [4, 10, 16, 22, 28, 34, 40, 46, 52, 58, 64, 70, 76, 82, 88] as const;
const BLACK_MODULOS = new Set([2, 5, 7, 10, 0]);
const isBlackKey = (noteIndex: number) => BLACK_MODULOS.has(noteIndex % 12);
const MY_PIANO_SERIAL = "MOCK-MON-PIANO";
const STANDARD_SERIAL = "FACTORY-UPRIGHT-SPEC";
const PROFILE_FIELDS = "id,serial_number,brand,model,wa_values,wd_values,friction_values,balance_values,manufacture_year,climate_zone,maintenance_type,usage_level,mesure_date,created_at";

type KeyFilter = "all" | "split";
type SourceMode = "none" | "cloud" | "import";
type UsageLevel = "all" | "low" | "intensive";

type RefProfile = {
  wa: number[];
  wd: number[];
  friction: number[];
  balance: number[];
};

type ProfileRecord = RefProfile & {
  serialNumber: string;
  brand: string;
  model: string;
  year: number | null;
  climate: string | null;
  maintenance: string | null;
  usageLevel: string | null;
  measureDate: string | null;
};

type ChartPoint = {
  key: number;
  isBlack: boolean;
  waCur: number | undefined;
  waCurW: number | undefined;
  waCurB: number | undefined;
  sameWa: number | undefined;
  stdWa: number | undefined;
  wdCur: number | undefined;
  wdCurW: number | undefined;
  wdCurB: number | undefined;
  sameWd: number | undefined;
  stdWd: number | undefined;
  balCur: number | undefined;
  balCurW: number | undefined;
  balCurB: number | undefined;
  sameBal: number | undefined;
  factoryBal: number | undefined;
  fricCur: number | undefined;
  fricCurW: number | undefined;
  fricCurB: number | undefined;
  sameFric: number | undefined;
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
  const raw = source.length >= 88 ? source[noteIndex - 1] : source[sampleIndex];
  return typeof raw === "number" && Number.isFinite(raw) ? n1(raw) : undefined;
}

function buildChartData(
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
    return {
      key: noteIndex,
      isBlack: black,
      waCur,
      waCurW: black ? undefined : waCur,
      waCurB: black ? waCur : undefined,
      sameWa: valueAt(cloud?.wa, noteIndex, sampleIndex),
      stdWa: valueAt(standard?.wa, noteIndex, sampleIndex),
      wdCur,
      wdCurW: black ? undefined : wdCur,
      wdCurB: black ? wdCur : undefined,
      sameWd: valueAt(cloud?.wd, noteIndex, sampleIndex),
      stdWd: valueAt(standard?.wd, noteIndex, sampleIndex),
      balCur,
      balCurW: black ? undefined : balCur,
      balCurB: black ? balCur : undefined,
      sameBal: valueAt(cloud?.balance, noteIndex, sampleIndex),
      factoryBal: valueAt(standard?.balance, noteIndex, sampleIndex),
      fricCur,
      fricCurW: black ? undefined : fricCur,
      fricCurB: black ? fricCur : undefined,
      sameFric: valueAt(cloud?.friction, noteIndex, sampleIndex),
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

function profileAverage(profile: RefProfile | null, key: keyof RefProfile): string {
  const values = profile?.[key] ?? [];
  const finite = values.filter((value) => typeof value === "number" && Number.isFinite(value));
  if (finite.length === 0) return "—";
  return (finite.reduce<number>((sum, value) => sum + value, 0) / finite.length).toFixed(1);
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

function profileFromRow(row: ExternalPianoProfileRow): ProfileRecord {
  return {
    wa: row.wa_values,
    wd: row.wd_values,
    friction: row.friction_values,
    balance: row.balance_values,
    serialNumber: row.serial_number,
    brand: row.brand ?? "",
    model: row.model ?? "",
    year: row.manufacture_year ?? null,
    climate: row.climate_zone ?? null,
    maintenance: row.maintenance_type ?? null,
    usageLevel: row.usage_level ?? null,
    measureDate: row.mesure_date ?? null,
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

const SAMPLE_DOT_CONFIG = { r: 2, fill: "#000000", strokeWidth: 0 };

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

const LABEL_MIN_Y = 14;
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

type TooltipEntry = { name?: string; value?: number; color?: string };
function tooltipColorFor(name: string) {
  const lower = name.toLowerCase();
  if (lower.includes("noires")) return "#000000";
  if (lower.includes("blanches")) return "#6b7280";
  if (lower.includes("mon piano")) return "#000000";
  if (lower.startsWith("cloud")) return "#f97316";
  return "#10b981";
}

function CustomTooltipContent(props: { active?: boolean; payload?: TooltipEntry[]; label?: number }) {
  const { active, payload, label } = props;
  if (!active || !payload || payload.length === 0) return null;
  const valid = [...payload]
    .filter((entry) => entry.name !== "Mon piano centre")
    .filter((entry) => typeof entry.value === "number" && Number.isFinite(entry.value))
    .sort((a, b) => Number(b.value) - Number(a.value));
  return (
    <div className="pointer-events-none rounded-md border border-gray-200 bg-white/95 px-3 py-2 text-xs shadow-md">
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
  { id: "wa", title: "Poids d'enfoncement (Wa)", domain: [55, 85], lines: [{ dataKey: "sameWa", name: "Cloud", shortName: "Cloud", color: "#f97316" }, { dataKey: "stdWa", name: "Std", shortName: "Std", color: "#10b981" }] },
  { id: "wd", title: "Poids de retour (Wd)", domain: [50, 70], lines: [{ dataKey: "sameWd", name: "Cloud", shortName: "Cloud", color: "#f97316" }, { dataKey: "stdWd", name: "Std", shortName: "Std", color: "#10b981" }] },
  { id: "bal", title: "Balance statique", domain: [55, 75], lines: [{ dataKey: "sameBal", name: "Cloud", shortName: "Cloud", color: "#f97316" }, { dataKey: "factoryBal", name: "Factory", shortName: "Factory", color: "#10b981" }] },
  { id: "fric", title: "Friction mécanique", domain: [-2, 16], lines: [{ dataKey: "sameFric", name: "Cloud", shortName: "Cloud", color: "#f97316" }, { dataKey: "factoryFric", name: "Factory", shortName: "Factory", color: "#10b981" }] },
];
const DY_STEPS = [-10, 4, 18, 32];
function offsetsFor(lines: LineDef[], point: ChartPoint | undefined) {
  const map = new Map<SeriesKey, number>();
  [...lines].sort((a, b) => {
    const aValue = point?.[a.dataKey];
    const bValue = point?.[b.dataKey];
    return (typeof bValue === "number" ? bValue : -Infinity) - (typeof aValue === "number" ? aValue : -Infinity);
  }).forEach((line, index) => map.set(line.dataKey, DY_STEPS[index] ?? 20));
  return map;
}

function currentLinesFor(familyId: string, keyFilter: KeyFilter): LineDef[] {
  const metrics: Record<string, [SeriesKey, SeriesKey, SeriesKey, SeriesKey]> = { wa: ["waCur", "waCurW", "waCurB", "waMid"], wd: ["wdCur", "wdCurW", "wdCurB", "wdMid"], bal: ["balCur", "balCurW", "balCurB", "balMid"], fric: ["fricCur", "fricCurW", "fricCurB", "fricMid"] };
  const metric = metrics[familyId];
  if (!metric) return [];
  if (keyFilter === "split") return [
    { dataKey: metric[1], name: "Mon piano blanches", shortName: "Blanches", color: "#6b7280", real: true },
    { dataKey: metric[2], name: "Mon piano noires", shortName: "Noires", color: "#000000", real: true },
    { dataKey: metric[3], name: "Mon piano centre", shortName: "Mon piano", color: "#000000", hidden: true },
  ];
  return [{ dataKey: metric[0], name: "Mon piano", shortName: "Mon piano", color: "#000000", real: true }];
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


function ComparisonChart({ chartData, keyFilter }: { chartData: ChartPoint[]; keyFilter: KeyFilter }) {
  const [hoveredChart, setHoveredChart] = useState<string | null>(null);
  const [hoveredNoteIndex, setHoveredNoteIndex] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);

  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;
    const update = () => setContainerWidth(node.clientWidth);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  // Ancrage fixe du tooltip sur le flanc droit du graphique.
  const tooltipPosition = { x: Math.max(containerWidth - 200, 0), y: 8 };

  function SubChart({ family }: { family: (typeof FAMILIES)[number] }) {
    const lines = [...currentLinesFor(family.id, keyFilter), ...family.lines];
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
    const isHovered = hoveredChart === family.id;
    return (
      <Frame title={family.title} className="h-[300px] !pt-2">
        <div className="h-full w-full" onMouseEnter={() => setHoveredChart(family.id)} onMouseLeave={() => setHoveredChart(null)}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} onMouseMove={(state) => { const note = state?.activeLabel; if (typeof note === "number") setHoveredNoteIndex(note); }} onMouseLeave={() => { setHoveredChart(null); setHoveredNoteIndex(null); }} margin={{ top: 5, right: 140, bottom: 15, left: 140 }}>
              <XAxis xAxisId="main" dataKey="key" type="number" domain={[1, 88]} hide />
              <XAxis xAxisId="topAxis" dataKey="key" type="number" domain={[1, 88]} orientation="top" height={15} axisLine={false} tickLine={false} ticks={DO_POSITIONS} tick={<CustomTickTop dy={-6} />} />
              <YAxis width={0} tick={false} axisLine={false} tickLine={false} domain={family.domain} />
              {DO_POSITIONS.map((position) => <ReferenceLine key={position} xAxisId="main" x={position} stroke="#e5e7eb" strokeWidth={1} />)}
              {hoveredNoteIndex !== null && <ReferenceLine xAxisId="main" x={hoveredNoteIndex} stroke="#94a3b8" strokeWidth={1} />}
              {isHovered && <Tooltip content={<CustomTooltipContent />} position={tooltipPosition} allowEscapeViewBox={{ x: true, y: true }} wrapperStyle={{ pointerEvents: "none" }} isAnimationActive={false} />}
              {lines.map((line) => <Line key={line.dataKey} xAxisId="main" type="monotone" dataKey={line.dataKey} name={line.name} stroke={line.hidden ? "transparent" : line.color} strokeWidth={2} dot={line.real ? SAMPLE_DOT_CONFIG : false} connectNulls={true} isAnimationActive={false} label={makeEndLabel({ shortName: line.shortName, avg: seriesAverage(chartData, line.dataKey), color: line.color, firstIndex: firstDefinedIndex(chartData, line.dataKey), lastIndex: lastDefinedIndex(chartData, line.dataKey), dyLeft: line.hidden ? 0 : dyLeft.get(line.dataKey) ?? 0, dyRight: line.hidden ? 0 : dyRight.get(line.dataKey) ?? 0, showAverage: !line.hidden })} />)}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Frame>
    );
  }

  return <div ref={containerRef} className="w-full px-2 pb-4 pt-2"><div className="flex w-full flex-col gap-4">{FAMILIES.map((family) => <SubChart key={family.id} family={family} />)}</div></div>;
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
function Frame({ title, className = "", titleClassName, children }: { title: ReactNode; className?: string; titleClassName?: string; children: ReactNode }) {
  return <section className={`${FRAME_CLASS} ${className}`}><h2 className={titleClassName ?? FRAME_TITLE_CLASS}>{title}</h2>{children}</section>;
}

const COLUMNS = [
  { key: "wa", label: "Poids descendant (Wa)" },
  { key: "wd", label: "Poids ascendant (Wd)" },
  { key: "friction", label: "Friction" },
  { key: "balance", label: "Balance" },
] as const;
type MetricKey = (typeof COLUMNS)[number]["key"];
type Averages = Record<MetricKey, string>;

function MetricCell({ label, value, active = false }: { label: string; value: string; active?: boolean }) {
  return <div className="rounded bg-muted px-2 py-1.5 text-center"><div className="!text-[1.1rem] font-bold tracking-wide text-muted-foreground">{label}</div><div className={`mt-1 !text-2xl !font-bold tabular-nums ${active ? "!text-orange-600" : ""}`} style={active ? { color: "#f97316" } : undefined}>{value === "—" ? <span className={active ? "" : "text-muted-foreground"}>—</span> : <>{value}<span className="!text-xs !font-medium"> g.</span></>}</div></div>;
}

function averageSet(chartData: ChartPoint[]): Averages {
  return { wa: seriesAverage(chartData, "waCur"), wd: seriesAverage(chartData, "wdCur"), friction: seriesAverage(chartData, "fricCur"), balance: seriesAverage(chartData, "balCur") };
}

const PILL_BASE = "h-7 min-w-0 flex-1 rounded-full border px-1.5 text-[0.68rem] leading-tight transition-colors whitespace-nowrap";
const pillClass = (active: boolean) => `${PILL_BASE} ${active ? "border-gray-300 bg-gray-100 font-semibold text-slate-700" : "border-gray-200 bg-white text-gray-400 hover:border-gray-300 hover:text-gray-500"}`;

function CycleIcon() {
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
  onToggleCloud: () => void;
  onToggleStandard: () => void;
  onImport: (file: File) => void;
  keyFilter: KeyFilter;
  cycleKeyFilter: () => void;
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
};

function SidebarPanel(props: SidebarPanelProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const usageLabel = props.usageLevel === "all" ? "Tous" : props.usageLevel === "low" ? "Faible" : "Intensif";
  const switchRow = (label: string, checked: boolean, onChange: (value: boolean) => void) => (
    <label className="flex min-w-0 items-center justify-between gap-3 text-xs font-medium text-slate-700">
      <span className="min-w-0">{label}</span>
      <Switch checked={checked} disabled={props.filtersDisabled} onCheckedChange={onChange} className="data-[state=checked]:bg-slate-500 data-[state=unchecked]:bg-gray-200" />
    </label>
  );
  return (
    <Frame title="Réglages" className="h-fit">
      <div className="flex flex-col gap-4 pt-2">
          <div>
            <div className="mb-1.5 whitespace-nowrap !text-xs !font-bold !text-black">Comparer piano avec :</div>
            <div className="flex items-center gap-1.5">
              <Button type="button" variant="outline" aria-pressed={props.cloudEnabled} onClick={props.onToggleCloud} className={pillClass(props.cloudEnabled)}>Cloud</Button>
              <Button type="button" variant="outline" aria-pressed={props.standardEnabled} onClick={props.onToggleStandard} className={pillClass(props.standardEnabled)}>Standard</Button>
              <Button type="button" variant="outline" aria-pressed={props.csvActive} onClick={() => inputRef.current?.click()} className={pillClass(props.csvActive)}>CSV</Button>
              <input ref={inputRef} type="file" accept=".csv,text/csv" className="hidden" onChange={(event) => { const file = event.target.files?.[0]; if (file) props.onImport(file); event.target.value = ""; }} />
            </div>
          </div>
          <div className="space-y-2 border-t border-gray-200 pt-3">
            <Button type="button" variant="outline" onClick={props.cycleKeyFilter} aria-label={`Vue clavier : ${props.keyFilter === "all" ? "Toutes les touches" : "Vue éclatée"}`} className={`${PILL_BASE} flex w-full items-center justify-start gap-2 border-gray-200 bg-white text-slate-700 hover:border-gray-300`}><CycleIcon /><span>Vue clavier : <span className="font-semibold">{props.keyFilter === "all" ? "Toutes les touches" : "Vue éclatée"}</span></span></Button>
            <Button type="button" variant="outline" disabled={props.filtersDisabled} onClick={props.cycleUsage} aria-label={`Niveau d'usage instrument : ${usageLabel}`} className={`${PILL_BASE} flex w-full items-center justify-start gap-2 border-gray-200 bg-white text-slate-700 hover:border-gray-300`}><CycleIcon /><span>Niveau d'usage instrument : <span className="font-semibold">{usageLabel}</span> ↻</span></Button>
            <Button type="button" variant="outline" disabled={props.filtersDisabled} aria-pressed={props.importantChanges} onClick={() => props.setImportantChanges(!props.importantChanges)} className={`${PILL_BASE} flex w-full items-center justify-start gap-2 border-gray-200 bg-white text-left ${props.importantChanges ? "font-semibold text-slate-700" : "text-slate-500"}`}><CycleIcon /><span>Modifications importantes : <span className="font-semibold">{props.importantChanges ? "Inclus" : "Exclus"}</span></span></Button>
          </div>
          <div className="space-y-2.5 border-t border-gray-200 pt-3">
            {switchRow("Même zone climatique", props.sameClimate, props.setSameClimate)}
            {switchRow("Même année de fabrication", props.sameYear, props.setSameYear)}
            {switchRow("Pianos de moins de 5 ans", props.youngOnly, props.setYoungOnly)}
          </div>
          <div className="border-t border-gray-200 pt-3">
            <div className="mb-1.5 !text-base !font-bold !text-black">Comparer avec même(s) modèle(s)</div>
            <div className="flex items-center gap-1.5">
              <Button type="button" variant="outline" aria-pressed={props.cloudEnabled} onClick={props.onToggleCloud} className={pillClass(props.cloudEnabled)}>Cloud</Button>
              <Button type="button" variant="outline" aria-pressed={props.standardEnabled} onClick={props.onToggleStandard} className={pillClass(props.standardEnabled)}>Standard</Button>
              <Button type="button" variant="outline" aria-pressed={props.csvActive} onClick={() => inputRef.current?.click()} className={pillClass(props.csvActive)}>CSV</Button>
              <input ref={inputRef} type="file" accept=".csv,text/csv" className="hidden" onChange={(event) => { const file = event.target.files?.[0]; if (file) props.onImport(file); event.target.value = ""; }} />
            </div>
          </div>
        </div>
      </Frame>
    );
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
  const [cloudProfile, setCloudProfile] = useState<RefProfile | null>(null);
  const [cloudSampleCount, setCloudSampleCount] = useState(0);
  const [imported, setImported] = useState<RefProfile | null>(null);
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

  useEffect(() => {
    let cancelled = false;
    async function loadBaseProfiles() {
      const mineResult = await externalSupabase
        .from("piano_profiles")
        .select(PROFILE_FIELDS)
        .eq("serial_number", MY_PIANO_SERIAL)
        .single();
      if (cancelled) return;
      if (mineResult.error || !mineResult.data) { setStatus("error"); return; }
      setMine(profileFromRow(mineResult.data as ExternalPianoProfileRow));
      setStatus("ok");
    }
    void loadBaseProfiles();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function loadCloudAverage() {
      if (!mine || sourceMode !== "cloud") {
        setCloudProfile(null);
        setCloudSampleCount(0);
        return;
      }
      let query = externalSupabase
        .from("piano_profiles")
        .select(PROFILE_FIELDS)
        .eq("model", mine.model)
        .neq("serial_number", mine.serialNumber);
      const climate = databaseClimate(mine.climate);
      if (sameClimate && climate) query = query.eq("climate_zone", climate);
      if (sameYear && mine.year !== null) query = query.eq("manufacture_year", mine.year);
      if (importantChanges) query = query.eq("maintenance_type", "Major modifications");
      else query = query.not("maintenance_type", "eq", "Major modifications");
      if (youngOnly) query = query.gte("manufacture_year", new Date().getFullYear() - 5);
      if (usageLevel !== "all") query = query.eq("usage_level", databaseUsage(usageLevel));

      const result = await query;
      if (cancelled) return;
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

  const activeCurrent = sourceMode === "import" && imported ? imported : mine;
  const chartData = useMemo(() => buildChartData(activeCurrent, sourceMode === "cloud" ? cloudProfile : null, standardEnabled ? standard : null), [activeCurrent, cloudProfile, sourceMode, standard, standardEnabled]);
  const current = averageSet(chartData);
  const witness: Averages = { wa: profileAverage(cloudProfile, "wa"), wd: profileAverage(cloudProfile, "wd"), friction: profileAverage(cloudProfile, "friction"), balance: profileAverage(cloudProfile, "balance") };

  async function handleImport(file: File) {
    try {
      const parsed = parseDiagnosticCsv(await file.text());
      const toNumber = (value: string) => { const normalized = value.trim().replace(",", "."); const number = Number(normalized); return normalized === "" || !Number.isFinite(number) ? Number.NaN : number; };
      setImported({ wa: parsed.rows.map((row) => toNumber(row.wa)), wd: parsed.rows.map((row) => toNumber(row.wd)), friction: [], balance: [] });
      setSourceMode("import");
    } catch {
      setImported(null);
    }
  }

  function cycleUsage() {
    setUsageLevel((value) => value === "all" ? "low" : value === "low" ? "intensive" : "all");
  }

  function cycleKeyFilter() {
    setKeyFilter((value) => value === "all" ? "split" : "all");
  }

  const summary = `${summaryValue(mine?.model)} - (${summaryValue(mine?.year)}) - ${summaryValue(mine?.serialNumber)} - Mesure (${summaryValue(mine?.measureDate)})`;
  const cloudIsEmpty = sourceMode === "cloud" && cloudSampleCount === 0;

  return (
    <main className="mx-auto w-full max-w-[1400px] px-6 py-8">
      {status === "loading" ? <p className="py-16 text-center text-muted-foreground">Chargement des profils externes…</p> : status === "error" ? <div className="flex w-full items-center justify-center py-16"><p className="!text-2xl !font-bold !text-red-600 text-center">ERREUR D’ACCÈS : Impossible de lire le profil du piano mesuré.</p></div> : (
        <>
          <div className="grid w-full grid-cols-[minmax(0,1fr)_minmax(250px,300px)] items-stretch gap-6">
            <div className="min-w-0">
              <div ref={averagesRef} className="sticky top-[127px] z-40 mb-[50px] w-full border-b border-border/60 bg-background pb-2 pt-2">
                <Frame titleClassName="absolute -top-3.5 left-4 whitespace-nowrap bg-card px-2 text-lg font-bold text-foreground" title={<><span>Moyennes</span><span className="ml-2 text-sm font-semibold text-muted-foreground">({summary})</span></>} className="h-fit">
                  <div className="mb-3"><div className="mb-1.5 px-1 text-[0.7rem] font-semibold uppercase tracking-wide text-gray-500">Piano Actuel</div><div className="grid grid-cols-4 gap-3">{COLUMNS.map(({ key, label }) => <MetricCell key={key} label={label} value={current[key]} />)}</div></div>
                  <div><div className="mb-1.5 px-1 text-[0.7rem] font-semibold uppercase tracking-wide text-orange-600">Cloud</div><div className="grid grid-cols-4 gap-3">{COLUMNS.map(({ key, label }) => <MetricCell key={key} label={label} value={sourceMode === "cloud" ? witness[key] : "—"} active />)}</div>{cloudIsEmpty && <p className="mt-3 text-center text-sm font-semibold text-slate-600">Échantillon trop faible pour générer une moyenne</p>}</div>
                </Frame>
              </div>
              <ComparisonChart chartData={chartData} keyFilter={keyFilter} />
            </div>
            <aside className="min-w-0"><div className="sticky z-40 mt-[200px] h-fit" style={{ top: averagesHeight > 0 ? `${averagesHeight + 177}px` : "400px" }}><SidebarPanel cloudEnabled={sourceMode === "cloud"} standardEnabled={standardEnabled} csvActive={sourceMode === "import"} onToggleCloud={() => setSourceMode((value) => value === "cloud" ? "none" : "cloud")} onToggleStandard={() => setStandardEnabled((value) => !value)} onImport={(file) => void handleImport(file)} keyFilter={keyFilter} cycleKeyFilter={cycleKeyFilter} filtersDisabled={sourceMode !== "cloud"} sameClimate={sameClimate} sameYear={sameYear} importantChanges={importantChanges} youngOnly={youngOnly} usageLevel={usageLevel} setSameClimate={setSameClimate} setSameYear={setSameYear} setImportantChanges={setImportantChanges} setYoungOnly={setYoungOnly} cycleUsage={cycleUsage} /></div></aside>
          </div>
          <div className="h-[70vh]" aria-hidden="true" />
        </>
      )}
    </main>
  );
}
