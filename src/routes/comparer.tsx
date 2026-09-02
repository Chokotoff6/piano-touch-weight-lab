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
const TECHNICAL_SERIAL = /^(MOCK|STD|FACTORY)/i;

type KeyFilter = "all" | "split";
const KEY_FILTERS: Array<{ id: KeyFilter; label: string }> = [
  { id: "all", label: "Toutes les touches (Regroupées)" },
  { id: "split", label: "Vue éclatée" },
];

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
};

type SeriesKey = keyof Omit<ChartPoint, "key" | "isBlack">;
const n1 = (value: number) => Number(value.toFixed(1));

function valueAt(values: number[] | undefined, noteIndex: number, sampleIndex: number) {
  const raw = values?.length >= 88 ? values[noteIndex - 1] : values?.[sampleIndex];
  return typeof raw === "number" && Number.isFinite(raw) ? n1(raw) : undefined;
}

function buildChartData(
  mine: RefProfile | null,
  cloud: RefProfile | null,
  standard: RefProfile | null,
): ChartPoint[] {
  return SAMPLE_NOTES.map((noteIndex, sampleIndex) => {
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
    };
  });
}

function seriesAverage(data: ChartPoint[], key: SeriesKey): string {
  const values = data
    .map((point) => point[key])
    .filter((value): value is number => typeof value === "number" && Number.isFinite(value));
  if (values.length === 0) return "—";
  return (values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(1);
}

function profileAverage(profile: RefProfile | null, key: keyof RefProfile): string {
  const values = profile?.[key] ?? [];
  const finite = values.filter((value) => typeof value === "number" && Number.isFinite(value));
  if (finite.length === 0) return "—";
  return (finite.reduce((sum, value) => sum + value, 0) / finite.length).toFixed(1);
}

function averageProfiles(profiles: ProfileRecord[]): RefProfile | null {
  if (profiles.length === 0) return null;
  const average = (key: keyof RefProfile) => {
    const length = Math.max(...profiles.map((profile) => profile[key].length));
    return Array.from({ length }, (_, index) => {
      const values = profiles
        .map((profile) => profile[key][index])
        .filter((value) => typeof value === "number" && Number.isFinite(value));
      return values.length > 0 ? n1(values.reduce((sum, value) => sum + value, 0) / values.length) : Number.NaN;
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
    year: row.annee_fabrication,
    climate: row.zone_climatique ?? null,
    maintenance: row.type_entretien ?? null,
    usageLevel: row.usage_level ?? null,
  };
}

function normalizeValue(value: string | null | undefined) {
  return (value ?? "").trim().toLocaleLowerCase();
}

function matchesCloudFilters(
  profile: ProfileRecord,
  mine: ProfileRecord,
  filters: { sameClimate: boolean; sameYear: boolean; importantChanges: boolean; usageLevel: UsageLevel },
) {
  if (profile.model && mine.model && normalizeValue(profile.model) !== normalizeValue(mine.model)) return false;
  if (filters.sameClimate && normalizeValue(profile.climate) !== normalizeValue(mine.climate)) return false;
  if (filters.sameYear && profile.year !== mine.year) return false;
  if (filters.importantChanges && normalizeValue(profile.maintenance) !== "modifications importantes") return false;
  if (filters.usageLevel !== "all") {
    const expected = filters.usageLevel === "low" ? "faible" : "intensif";
    if (normalizeValue(profile.usageLevel) !== expected) return false;
  }
  return true;
}

const SAMPLE_DOT_CONFIG = { r: 2, fill: "#000000", strokeWidth: 0 };

type EndLabelOptions = {
  shortName: string;
  avg: string;
  color: string;
  firstIndex: number;
  lastIndex: number;
  dyLeft: number;
  dyRight: number;
};

function makeEndLabel(opts: EndLabelOptions) {
  const EndLabel = (props: { x?: number; y?: number; index?: number; value?: number }) => {
    const { x, y, index = -1, value } = props;
    const hasPoint = typeof x === "number" && Number.isFinite(x) && typeof y === "number" && Number.isFinite(y);
    const hasValue = typeof value === "number" && Number.isFinite(value);
    if (!hasPoint || !hasValue || opts.avg === "—") return <g />;
    if (index === opts.firstIndex) {
      return <text x={x - 44} y={y} dy={opts.dyLeft} textAnchor="end" fontSize={11} fontWeight={600} fill={opts.color}>{opts.shortName}</text>;
    }
    if (index === opts.lastIndex) {
      return <text x={x + 10} y={y} dy={opts.dyRight} textAnchor="start" fontSize={11} fontWeight={600} fill={opts.color}>{`Moy: ${opts.avg}g`}</text>;
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
  if (lower.includes("mon piano")) return "#000000";
  if (lower.startsWith("same model")) return "#f97316";
  return "#10b981";
}

function CustomTooltipContent(props: { active?: boolean; payload?: TooltipEntry[]; label?: number }) {
  const { active, payload, label } = props;
  if (!active || !payload || payload.length === 0) return null;
  const valid = [...payload]
    .filter((entry) => typeof entry.value === "number" && Number.isFinite(entry.value))
    .sort((a, b) => Number(b.value) - Number(a.value));
  return (
    <div className="rounded-md border border-gray-200 bg-white/95 px-3 py-2 text-xs shadow-md" style={{ pointerEvents: "none" }}>
      <div className="mb-1 font-bold text-gray-800">Touche {label}</div>
      {valid.map((entry) => {
        const color = tooltipColorFor(entry.name ?? "");
        return <div key={entry.name} className="flex items-center justify-between gap-4"><span className="flex items-center gap-2"><span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} /><span style={{ color }}>{entry.name}</span></span><span className="font-semibold tabular-nums text-gray-800">{entry.value?.toFixed(1)} g.</span></div>;
      })}
    </div>
  );
}

type LineDef = { dataKey: SeriesKey; name: string; shortName: string; color: string; real?: boolean };
const FAMILIES: Array<{ id: string; title: string; domain: [number, number]; lines: LineDef[] }> = [
  { id: "wa", title: "Poids d'enfoncement (Wa)", domain: [55, 85], lines: [{ dataKey: "sameWa", name: "Same model(s)", shortName: "Same model(s)", color: "#f97316" }, { dataKey: "stdWa", name: "Std", shortName: "Std", color: "#10b981" }] },
  { id: "wd", title: "Poids de retour (Wd)", domain: [50, 70], lines: [{ dataKey: "sameWd", name: "Same model(s)", shortName: "Same model(s)", color: "#f97316" }, { dataKey: "stdWd", name: "Std", shortName: "Std", color: "#10b981" }] },
  { id: "bal", title: "Balance statique", domain: [55, 75], lines: [{ dataKey: "sameBal", name: "Same model(s)", shortName: "Same model(s)", color: "#f97316" }, { dataKey: "factoryBal", name: "Factory", shortName: "Factory", color: "#10b981" }] },
  { id: "fric", title: "Friction mécanique", domain: [-2, 16], lines: [{ dataKey: "sameFric", name: "Same model(s)", shortName: "Same model(s)", color: "#f97316" }, { dataKey: "factoryFric", name: "Factory", shortName: "Factory", color: "#10b981" }] },
];
const DY_STEPS = [0, 10, 20];
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
  const metrics: Record<string, [SeriesKey, SeriesKey, SeriesKey]> = { wa: ["waCur", "waCurW", "waCurB"], wd: ["wdCur", "wdCurW", "wdCurB"], bal: ["balCur", "balCurW", "balCurB"], fric: ["fricCur", "fricCurW", "fricCurB"] };
  const labels: Record<string, string> = { wa: "Wa", wd: "Wd", bal: "Balance", fric: "Friction" };
  const metric = metrics[familyId];
  if (!metric) return [];
  const label = labels[familyId] ?? "Wa";
  if (keyFilter === "split") return [
    { dataKey: metric[1], name: `Mon piano ${label} — blanches`, shortName: `Mon piano ${label}`, color: "#000000", real: true },
    { dataKey: metric[2], name: `Mon piano ${label} — noires`, shortName: `Mon piano ${label}`, color: "#6b7280", real: true },
  ];
  return [{ dataKey: metric[0], name: `Mon piano ${label}`, shortName: `Mon piano ${label}`, color: "#000000", real: true }];
}

function ComparisonChart({ chartData }: { chartData: ChartPoint[] }) {
  const [keyFilter, setKeyFilter] = useState<KeyFilter>("all");
  const [hoveredChart, setHoveredChart] = useState<string | null>(null);
  const [hoveredNoteIndex, setHoveredNoteIndex] = useState<number | null>(null);
  const filteredData = useMemo(() => chartData, [chartData]);
  const first = filteredData[0];
  const last = filteredData[filteredData.length - 1];

  function SubChart({ family }: { family: (typeof FAMILIES)[number] }) {
    const lines = [...currentLinesFor(family.id, keyFilter), ...family.lines];
    const dyLeft = offsetsFor(lines, first);
    const dyRight = offsetsFor(lines, last);
    const isHovered = hoveredChart === family.id;
    return (
      <Frame title={family.title} className="h-[300px] !pt-2">
        <div className="h-full w-full" onMouseEnter={() => setHoveredChart(family.id)} onMouseLeave={() => setHoveredChart(null)}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={filteredData} onMouseMove={(state) => { const note = state?.activeLabel; if (typeof note === "number") setHoveredNoteIndex(note); }} onMouseLeave={() => { setHoveredChart(null); setHoveredNoteIndex(null); }} margin={{ top: 5, right: 140, bottom: 15, left: 140 }}>
              <XAxis xAxisId="main" dataKey="key" type="number" domain={[1, 88]} hide />
              <XAxis xAxisId="topAxis" dataKey="key" type="number" domain={[1, 88]} orientation="top" height={15} axisLine={false} tickLine={false} ticks={DO_POSITIONS} tick={<CustomTickTop dy={-6} />} />
              <YAxis width={0} tick={false} axisLine={false} tickLine={false} domain={family.domain} />
              {DO_POSITIONS.map((position) => <ReferenceLine key={position} xAxisId="main" x={position} stroke="#e5e7eb" strokeWidth={1} />)}
              {hoveredNoteIndex !== null && <ReferenceLine xAxisId="main" x={hoveredNoteIndex} stroke="#94a3b8" strokeWidth={1} />}
              {isHovered && <Tooltip content={<CustomTooltipContent />} wrapperStyle={{ pointerEvents: "none" }} isAnimationActive={false} />}
              {lines.map((line) => <Line key={line.dataKey} xAxisId="main" type="monotone" dataKey={line.dataKey} name={line.name} stroke={line.color} strokeWidth={2} dot={line.real ? SAMPLE_DOT_CONFIG : false} connectNulls isAnimationActive={false} label={makeEndLabel({ shortName: line.shortName, avg: seriesAverage(filteredData, line.dataKey), color: line.color, firstIndex: 0, lastIndex: filteredData.length - 1, dyLeft: dyLeft.get(line.dataKey) ?? 0, dyRight: dyRight.get(line.dataKey) ?? 0 })} />)}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Frame>
    );
  }

  return (
    <div className="w-full flex flex-col px-2 pt-2 pb-4">
      <div className="sticky top-0 z-50 -mx-2 mb-4 flex flex-wrap items-center justify-center gap-2 border-b border-gray-100 bg-white/95 py-3 shadow-sm backdrop-blur-sm">
        {KEY_FILTERS.map((filter) => <Button key={filter.id} type="button" variant={keyFilter === filter.id ? "default" : "outline"} onClick={() => setKeyFilter(filter.id)} className="rounded-full px-3.5 py-1.5 text-sm font-medium">{filter.label}</Button>)}
      </div>
      <div className="flex w-full flex-col gap-4">{FAMILIES.map((family) => <SubChart key={family.id} family={family} />)}</div>
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
function Frame({ title, className = "", children }: { title: ReactNode; className?: string; children: ReactNode }) {
  return <section className={`${FRAME_CLASS} ${className}`}><h2 className={FRAME_TITLE_CLASS}>{title}</h2>{children}</section>;
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

function SummaryBanner() {
  return <p className="w-full text-center !text-gray-700 text-sm font-medium tracking-wide">Résumé : Comparaison externe • Profils chargés depuis la source Cloud</p>;
}

function SourceSelector({ sourceMode, standardEnabled, onCloud, onStandard, onImport }: { sourceMode: SourceMode; standardEnabled: boolean; onCloud: () => void; onStandard: () => void; onImport: (file: File) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  return <div className="mb-6 flex flex-wrap items-center gap-2"><span className="mr-1 text-sm font-semibold text-foreground">Comparer avec </span><Button type="button" variant={sourceMode === "cloud" ? "default" : "outline"} aria-pressed={sourceMode === "cloud"} onClick={onCloud}>Cloud</Button><Button type="button" variant={standardEnabled ? "default" : "outline"} aria-pressed={standardEnabled} onClick={onStandard}>Standard</Button><Button type="button" variant={sourceMode === "import" ? "default" : "outline"} onClick={() => inputRef.current?.click()}>Import CSV</Button><input ref={inputRef} type="file" accept=".csv,text/csv" className="hidden" onChange={(event) => { const file = event.target.files?.[0]; if (file) onImport(file); event.target.value = ""; }} /></div>;
}

function RefinementPanel({ disabled, sameClimate, sameYear, importantChanges, usageLevel, setSameClimate, setSameYear, setImportantChanges, cycleUsage }: { disabled: boolean; sameClimate: boolean; sameYear: boolean; importantChanges: boolean; usageLevel: UsageLevel; setSameClimate: (value: boolean) => void; setSameYear: (value: boolean) => void; setImportantChanges: (value: boolean) => void; cycleUsage: () => void }) {
  const usageLabel = usageLevel === "all" ? "Tous" : usageLevel === "low" ? "Faible" : "Intensif";
  return <Frame title="Filtres d'affinage" className="sticky top-4 h-full"><div className="space-y-4 pt-2"><label className="flex items-center justify-between gap-3 text-sm font-medium text-foreground"><span>Même zone climatique</span><Switch checked={sameClimate} disabled={disabled} onCheckedChange={setSameClimate} /></label><label className="flex items-center justify-between gap-3 text-sm font-medium text-foreground"><span>Même année de fabrication</span><Switch checked={sameYear} disabled={disabled} onCheckedChange={setSameYear} /></label><label className="flex items-center justify-between gap-3 text-sm font-medium text-foreground"><span>Modifications importantes</span><Switch checked={importantChanges} disabled={disabled} onCheckedChange={setImportantChanges} /></label><Button type="button" variant="outline" className="w-full" disabled={disabled} onClick={cycleUsage} aria-label={`Niveau d'usage : ${usageLabel}`}>Niveau d'usage : {usageLabel}</Button></div></Frame>;
}

function Comparer() {
  const [sourceMode, setSourceMode] = useState<SourceMode>("cloud");
  const [standardEnabled, setStandardEnabled] = useState(false);
  const [sameClimate, setSameClimate] = useState(true);
  const [sameYear, setSameYear] = useState(false);
  const [importantChanges, setImportantChanges] = useState(false);
  const [usageLevel, setUsageLevel] = useState<UsageLevel>("all");
  const [mine, setMine] = useState<ProfileRecord | null>(null);
  const [profiles, setProfiles] = useState<ProfileRecord[]>([]);
  const [standard, setStandard] = useState<RefProfile | null>(null);
  const [imported, setImported] = useState<RefProfile | null>(null);
  const [status, setStatus] = useState<"loading" | "ok" | "error">("loading");

  useEffect(() => {
    let cancelled = false;
    async function loadExternalProfiles() {
      const result = await externalSupabase.from("piano_profiles").select("*");
      if (cancelled) return;
      if (result.error || !result.data) { setStatus("error"); return; }
      const records = (result.data as ExternalPianoProfileRow[]).map(profileFromRow);
      const current = records.find((profile) => profile.serialNumber === MY_PIANO_SERIAL) ?? null;
      const standardRow = records.find((profile) => profile.serialNumber === "FACTORY-UPRIGHT-SPEC") ?? null;
      setMine(current);
      setProfiles(records);
      setStandard(standardRow);
      setStatus(current ? "ok" : "error");
    }
    void loadExternalProfiles();
    return () => { cancelled = true; };
  }, []);

  const cloudProfile = useMemo(() => {
    if (!mine || sourceMode !== "cloud") return null;
    const filters = { sameClimate, sameYear, importantChanges, usageLevel };
    const matching = profiles.filter((profile) => profile.serialNumber !== MY_PIANO_SERIAL && !TECHNICAL_SERIAL.test(profile.serialNumber) && matchesCloudFilters(profile, mine, filters));
    return averageProfiles(matching);
  }, [mine, profiles, sourceMode, sameClimate, sameYear, importantChanges, usageLevel]);

  const activeCurrent = sourceMode === "import" && imported ? imported : mine;
  const chartData = useMemo(() => buildChartData(activeCurrent, cloudProfile, standardEnabled ? standard : null), [activeCurrent, cloudProfile, standard, standardEnabled]);
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

  return <main className="mx-auto w-full max-w-[1400px] px-6 py-8"><SourceSelector sourceMode={sourceMode} standardEnabled={standardEnabled} onCloud={() => setSourceMode((value) => value === "cloud" ? "none" : "cloud")} onStandard={() => setStandardEnabled((value) => !value)} onImport={(file) => void handleImport(file)} /><div className="mb-6"><SummaryBanner /></div>{status === "loading" ? <p className="py-16 text-center text-muted-foreground">Chargement des profils externes…</p> : status === "error" ? <div className="flex w-full items-center justify-center py-16"><p className="!text-2xl !font-bold !text-red-600 text-center">ERREUR D'ACCÈS SUPABASE : Impossible de lire MOCK-MON-PIANO. Vérifie les règles RLS de la table.</p></div> : <div className="flex w-full gap-6"><div className="min-w-0 flex-1"><ComparisonChart chartData={chartData} /><Frame title="Moyennes" className="mt-2"><div className="mb-3"><div className="mb-1.5 px-1 text-[0.7rem] font-semibold uppercase tracking-wide text-gray-500">Piano Actuel</div><div className="grid grid-cols-4 gap-3">{COLUMNS.map(({ key, label }) => <MetricCell key={key} label={label} value={current[key]} />)}</div></div><div><div className="mb-1.5 px-1 text-[0.7rem] font-semibold uppercase tracking-wide text-orange-600">Piano Témoin</div><div className="grid grid-cols-4 gap-3">{COLUMNS.map(({ key, label }) => <MetricCell key={key} label={label} value={sourceMode === "cloud" ? witness[key] : "—"} active />)}</div></div></Frame></div><aside className="hidden w-[260px] shrink-0 lg:block"><RefinementPanel disabled={sourceMode !== "cloud"} sameClimate={sameClimate} sameYear={sameYear} importantChanges={importantChanges} usageLevel={usageLevel} setSameClimate={setSameClimate} setSameYear={setSameYear} setImportantChanges={setImportantChanges} cycleUsage={cycleUsage} /></aside></div>}</main>;
}
