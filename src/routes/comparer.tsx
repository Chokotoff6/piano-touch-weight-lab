import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { externalSupabase } from "@/integrations/external-supabase/client";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
} from "recharts";

// ---------------------------------------------------------------------------
// Page de comparaison — carrosserie graphique (cadres officiels) alimentée
// EXCLUSIVEMENT par les profils de la table `piano_profiles` (aucune donnée
// locale, aucun fallback, aucun calcul dérivé d'une série vers une autre).
// ---------------------------------------------------------------------------

const DO_POSITIONS = [4, 16, 28, 40, 52, 64, 76, 88];

// Positions d'échantillonnage des 15 mesures sur le clavier 88 touches.
const SAMPLE_NOTES = [4, 10, 16, 22, 28, 34, 40, 46, 52, 58, 64, 70, 76, 82, 88] as const;

// Note 1 = La0. Touches noires : La#, Do#, Ré#, Fa#, Sol#.
const BLACK_MODULOS = new Set([2, 5, 7, 10, 0]);
const isBlackKey = (noteIndex: number) => BLACK_MODULOS.has(noteIndex % 12);

type KeyFilter = "all" | "split" | "white" | "black";

const KEY_FILTERS: Array<{ id: KeyFilter; label: string }> = [
  { id: "all", label: "Toutes les touches" },
  { id: "split", label: "Vue Éclatée (Blanches ⚪ vs Noires ⚫)" },
  { id: "white", label: "Touches Blanches ⚪" },
  { id: "black", label: "Touches Noires ⚫" },
];

// Point normalisé consommé par Recharts.
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

const n1 = (v: number) => Number(v.toFixed(1));

// --- Profils de référence chargés depuis la base ---------------------------
//  - "Mon piano" (noir)        : serial_number = 'MOCK-MON-PIANO'
//  - "Same model(s)" (orange)  : serial_number = 'MOCK-WITNESS'
//  - "Std" / "Factory" (vert)  : abaque théorique généré localement.
const MY_PIANO_SERIAL = "MOCK-MON-PIANO";
const WITNESS_SERIAL = "MOCK-WITNESS";

export type RefProfile = {
  wa: number[];
  wd: number[];
  friction: number[];
  balance: number[];
};

// Abaque de référence vert (15 points d'échantillonnage), indépendant des
// autres séries : Wa descend linéairement de `waStart` à `waEnd`, les autres
// familles sont stables.
function makeReferenceProfile(opts: {
  waStart: number;
  waEnd: number;
  wd: number;
  balance: number;
  friction: number;
}): RefProfile {
  const count = SAMPLE_NOTES.length;
  const step = count > 1 ? (opts.waEnd - opts.waStart) / (count - 1) : 0;
  return {
    wa: Array.from({ length: count }, (_, i) => n1(opts.waStart + step * i)),
    wd: Array.from({ length: count }, () => opts.wd),
    balance: Array.from({ length: count }, () => opts.balance),
    friction: Array.from({ length: count }, () => opts.friction),
  };
}

const STD_PROFILE = makeReferenceProfile({ waStart: 55, waEnd: 50, wd: 24, balance: 39, friction: 5 });
const FACTORY_PROFILE = makeReferenceProfile({ waStart: 54, waEnd: 49, wd: 23, balance: 38, friction: 4.5 });

// Construit les 15 points du graphique. Chaque série lit STRICTEMENT son
// propre tableau brut : aucune dérivation, aucun fallback croisé. Une valeur
// absente reste vide (pas de point).
function buildChartData(mine: RefProfile | null, same: RefProfile | null, ref: RefProfile | null): ChartPoint[] {
  return SAMPLE_NOTES.map((noteIndex, i) => {
    const black = isBlackKey(noteIndex);
    const v = (arr: number[] | undefined): number | undefined => {
      const raw = arr?.[i];
      return typeof raw === "number" && !Number.isNaN(raw) ? n1(raw) : undefined;
    };
    const waCur = v(mine?.wa);
    const wdCur = v(mine?.wd);
    const balCur = v(mine?.balance);
    const fricCur = v(mine?.friction);
    return {
      key: noteIndex,
      isBlack: black,
      waCur,
      waCurW: black ? undefined : waCur,
      waCurB: black ? waCur : undefined,
      sameWa: v(same?.wa),
      stdWa: v(ref?.wa),
      wdCur,
      wdCurW: black ? undefined : wdCur,
      wdCurB: black ? wdCur : undefined,
      sameWd: v(same?.wd),
      stdWd: v(ref?.wd),
      balCur,
      balCurW: black ? undefined : balCur,
      balCurB: black ? balCur : undefined,
      sameBal: v(same?.balance),
      factoryBal: v(ref?.balance),
      fricCur,
      fricCurW: black ? undefined : fricCur,
      fricCurB: black ? fricCur : undefined,
      sameFric: v(same?.friction),
      factoryFric: v(ref?.friction),
    };
  });
}

// Échelle verticale adaptée aux données réellement présentes dans le cadre
// (loupe automatique) : évite toute courbe hors champ.
function computeDomain(
  data: ChartPoint[],
  keys: SeriesKey[],
  baseDomain: [number, number],
): [number, number] {
  const vals: number[] = [];
  data.forEach((p) => {
    keys.forEach((k) => {
      const v = p[k];
      if (typeof v === "number" && Number.isFinite(v)) vals.push(v);
    });
  });
  if (vals.length === 0) return baseDomain;
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const pad = Math.max((max - min) * 0.18, 1.5);
  return [Math.floor(min - pad), Math.ceil(max + pad)];
}



type SeriesKey = keyof Omit<ChartPoint, "key" | "isBlack">;

function seriesAverage(data: ChartPoint[], key: SeriesKey): string {
  const vals = data.map((p) => p[key]).filter((v): v is number => typeof v === "number" && !Number.isNaN(v));
  if (vals.length === 0) return "—";
  const sum = vals.reduce((acc, v) => acc + v, 0);
  return (sum / vals.length).toFixed(1);
}

const SAMPLE_DOT_CONFIG = { r: 2, fill: "#000000", strokeWidth: 0 };

// Étiquettes d'extrémité : nom à gauche, moyenne à droite, avec décalage
// vertical ordonné (-10 / 4 / 18) selon l'altitude réelle de la courbe.
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
    // Sécurité de rendu : sans coordonnée valide (ou sans donnée), on masque
    // totalement l'étiquette au lieu de la laisser stagner en haut du cadre.
    const hasPoint =
      typeof x === "number" && Number.isFinite(x) && typeof y === "number" && Number.isFinite(y);
    const hasValue = typeof value === "number" && Number.isFinite(value);
    if (!hasPoint || !hasValue || opts.avg === "—") return <g />;
    if (index === opts.firstIndex) {
      return (
        <text x={x - 44} y={y} dy={opts.dyLeft} textAnchor="end" fontSize={11} fontWeight={600} fill={opts.color}>
          {opts.shortName}
        </text>
      );
    }
    if (index === opts.lastIndex) {
      return (
        <text x={x + 10} y={y} dy={opts.dyRight} textAnchor="start" fontSize={11} fontWeight={600} fill={opts.color}>
          {`Moy: ${opts.avg}g`}
        </text>
      );
    }
    return <g />;
  };
  return EndLabel;
}

function CustomTickTop(props: {
  x?: number;
  y?: number;
  dy?: number;
  payload?: { value: number };
}) {
  const { x = 0, y = 0, dy = 0, payload } = props;
  const value = payload?.value ?? 0;
  return (
    <g transform={`translate(${x},${y})`}>
      {value === 4 && (
        <text x={-24} y={dy} dy={6} textAnchor="middle" fontSize={10} fill="#6b7280">
          (DO)
        </text>
      )}
      <text x={0} y={dy} dy={6} textAnchor="middle" fontSize={10} fill="#6b7280">
        {value}
      </text>
    </g>
  );
}

type TooltipEntry = { name?: string; value?: number; color?: string };

function tooltipColorFor(name: string): string {
  const n = name.toLowerCase();
  if (n.includes("mon piano")) return "#000000";
  if (n.startsWith("same model")) return "#f97316";
  return "#10b981";
}

function CustomTooltipContent(props: {
  active?: boolean;
  payload?: TooltipEntry[];
  label?: number;
}) {
  const { active, payload, label } = props;
  if (!active || !payload || payload.length === 0) return null;
  const valid = [...payload].filter(
    (e) => e.value !== undefined && typeof e.value === "number" && !Number.isNaN(e.value),
  );
  valid.sort((a, b) => Number(b.value) - Number(a.value));
  return (
    <div
      className="rounded-md border border-gray-200 bg-white/95 px-3 py-2 text-xs shadow-md"
      style={{ pointerEvents: "none" }}
    >
      <div className="mb-1 font-bold text-gray-800">Touche {label}</div>
      {valid.map((entry) => {
        const color = tooltipColorFor(entry.name ?? "");
        return (
          <div key={entry.name} className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-2">
              <span
                className="inline-block h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: color }}
              />
              <span style={{ color }}>{entry.name}</span>
            </span>
            <span className="font-semibold tabular-nums text-gray-800">
              {typeof entry.value === "number" ? entry.value.toFixed(1) : entry.value} g.
            </span>
          </div>
        );
      })}
    </div>
  );
}

type LineDef = {
  dataKey: SeriesKey;
  name: string;
  shortName: string;
  color: string;
  real?: boolean;
};

// Séries de référence affichées avec les valeurs brutes du profil témoin et
// de l'abaque sélectionné. La série noire est ajoutée selon le mode de vue.
const FAMILIES: Array<{
  id: string;
  title: string;
  domain: [number, number];
  lines: LineDef[];
}> = [
  {
    id: "wa",
    title: "Poids d'enfoncement (Wa)",
    domain: [55, 85],
    lines: [
      { dataKey: "sameWa", name: "Same model(s)", shortName: "Same model(s)", color: "#f97316" },
      { dataKey: "stdWa", name: "Std", shortName: "Std", color: "#10b981" },
    ],
  },
  {
    id: "wd",
    title: "Poids de retour (Wd)",
    domain: [50, 70],
    lines: [
      { dataKey: "sameWd", name: "Same model(s)", shortName: "Same model(s)", color: "#f97316" },
      { dataKey: "stdWd", name: "Std", shortName: "Std", color: "#10b981" },
    ],
  },
  {
    id: "bal",
    title: "Balance statique",
    domain: [55, 75],
    lines: [
      { dataKey: "sameBal", name: "Same model(s)", shortName: "Same model(s)", color: "#f97316" },
      { dataKey: "factoryBal", name: "Factory", shortName: "Factory", color: "#10b981" },
    ],
  },
  {
    id: "fric",
    title: "Friction mécanique",
    domain: [-2, 16],
    lines: [
      { dataKey: "sameFric", name: "Same model(s)", shortName: "Same model(s)", color: "#f97316" },
      { dataKey: "factoryFric", name: "Factory", shortName: "Factory", color: "#10b981" },
    ],
  },
];

const DY_STEPS = [0, 10, 20];

function offsetsFor(lines: LineDef[], point: ChartPoint | undefined): Map<SeriesKey, number> {
  const map = new Map<SeriesKey, number>();
  if (!point) {
    lines.forEach((line, index) => map.set(line.dataKey, DY_STEPS[index] ?? 20));
    return map;
  }
  [...lines]
    .sort((a, b) => {
      const aValue = point[a.dataKey];
      const bValue = point[b.dataKey];
      return (typeof bValue === "number" ? bValue : -Infinity) -
        (typeof aValue === "number" ? aValue : -Infinity);
    })
    .forEach((line, index) => map.set(line.dataKey, DY_STEPS[index] ?? 20));
  return map;
}

function currentLinesFor(familyId: string, keyFilter: KeyFilter): LineDef[] {
  const metrics: Record<string, [SeriesKey, SeriesKey, SeriesKey]> = {
    wa: ["waCur", "waCurW", "waCurB"],
    wd: ["wdCur", "wdCurW", "wdCurB"],
    bal: ["balCur", "balCurW", "balCurB"],
    fric: ["fricCur", "fricCurW", "fricCurB"],
  };
  const labels: Record<string, string> = {
    wa: "Wa",
    wd: "Wd",
    bal: "Balance",
    fric: "Friction",
  };
  const metric = metrics[familyId];
  if (!metric) return [];
  const label = labels[familyId] ?? "Wa";
  if (keyFilter === "split") {
    return [
      { dataKey: metric[1], name: `Mon piano ${label} — blanches`, shortName: `Mon piano ${label}`, color: "#000000", real: true },
      { dataKey: metric[2], name: `Mon piano ${label} — noires`, shortName: `Mon piano ${label}`, color: "#6b7280", real: true },
    ];
  }
  const dataKey = keyFilter === "white" ? metric[1] : keyFilter === "black" ? metric[2] : metric[0];
  return [{ dataKey, name: `Mon piano ${label}`, shortName: `Mon piano ${label}`, color: "#000000", real: true }];
}

function ComparisonChart({ chartData }: { chartData: ChartPoint[] }) {
  const [keyFilter, setKeyFilter] = useState<KeyFilter>("all");
  const [hoveredChart, setHoveredChart] = useState<string | null>(null);
  const [hoveredNoteIndex, setHoveredNoteIndex] = useState<number | null>(null);

  const filteredData = useMemo(() => {
    if (keyFilter === "white") return chartData.filter((point) => !point.isBlack);
    if (keyFilter === "black") return chartData.filter((point) => point.isBlack);
    return chartData;
  }, [chartData, keyFilter]);

  const count = filteredData.length;
  const first = filteredData[0];
  const last = filteredData[count - 1];

  function SubChart({ family }: { family: (typeof FAMILIES)[number] }) {
    const lines = [...currentLinesFor(family.id, keyFilter), ...family.lines];
    const dyLeft = offsetsFor(lines, first);
    const dyRight = offsetsFor(lines, last);
    const isHovered = hoveredChart === family.id;
    const domain = computeDomain(filteredData, lines.map((line) => line.dataKey), family.domain);
    return (
      <Frame title={family.title} className="h-[300px] !pt-2">
        <div
          className="h-full w-full"
          onMouseEnter={() => setHoveredChart(family.id)}
          onMouseLeave={() => setHoveredChart(null)}
        >
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={filteredData}
              onMouseMove={(state) => {
                const note = state?.activeLabel;
                if (typeof note === "number") setHoveredNoteIndex(note);
              }}
              onMouseLeave={() => {
                setHoveredChart(null);
                setHoveredNoteIndex(null);
              }}
              margin={{ top: 5, right: 140, bottom: 15, left: 140 }}
            >
              <XAxis xAxisId="main" dataKey="key" type="number" domain={[1, 88]} hide />
              <XAxis
                xAxisId="topAxis"
                dataKey="key"
                type="number"
                domain={[1, 88]}
                orientation="top"
                height={15}
                axisLine={false}
                tickLine={false}
                ticks={DO_POSITIONS}
                tick={<CustomTickTop dy={-6} />}
              />
              <YAxis width={0} tick={false} axisLine={false} tickLine={false} domain={domain} />
              {DO_POSITIONS.map((pos) => (
                <ReferenceLine key={pos} xAxisId="main" x={pos} stroke="#e5e7eb" strokeWidth={1} />
              ))}
              {hoveredNoteIndex !== null && (
                <ReferenceLine xAxisId="main" x={hoveredNoteIndex} stroke="#94a3b8" strokeWidth={1} />
              )}
              {isHovered && (
                <Tooltip
                  content={<CustomTooltipContent />}
                  wrapperStyle={{ pointerEvents: "none" }}
                  isAnimationActive={false}
                />
              )}
              {lines.map((line) => (
                <Line
                  key={line.dataKey}
                  xAxisId="main"
                  type="monotone"
                  dataKey={line.dataKey}
                  name={line.name}
                  stroke={line.color}
                  strokeWidth={line.name.includes("noires") ? 1 : 1.5}
                  dot={line.real ? SAMPLE_DOT_CONFIG : false}
                  connectNulls={false}
                  isAnimationActive={false}
                  label={makeEndLabel({
                    shortName: line.shortName,
                    avg: seriesAverage(filteredData, line.dataKey),
                    color: line.color,
                    firstIndex: 0,
                    lastIndex: count - 1,
                    dyLeft: dyLeft.get(line.dataKey) ?? 0,
                    dyRight: dyRight.get(line.dataKey) ?? 0,
                  })}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Frame>
    );
  }

  return (
    <div className="w-full flex flex-col px-2 pt-2 pb-4">
      <div className="sticky top-0 z-50 -mx-2 mb-4 flex flex-wrap items-center justify-center gap-2 border-b border-gray-100 bg-white/95 py-3 shadow-sm backdrop-blur-sm">
        {KEY_FILTERS.map((filter) => (
          <Button
            key={filter.id}
            type="button"
            variant={keyFilter === filter.id ? "default" : "outline"}
            onClick={() => setKeyFilter(filter.id)}
            className="rounded-full px-3.5 py-1.5 text-sm font-medium"
          >
            {filter.label}
          </Button>
        ))}
      </div>
      <div className="flex w-full flex-col gap-4">
        {FAMILIES.map((family) => (
          <SubChart key={family.id} family={family} />
        ))}
      </div>
    </div>
  );
}

export const Route = createFileRoute("/comparer")({
  head: () => ({
    meta: [
      { title: "Comparer — Touchweight statique piano" },
      {
        name: "description",
        content:
          "Confrontation des moyennes de touchweight statique entre le piano actuel et un piano témoin communautaire.",
      },
      { property: "og:title", content: "Comparer — Touchweight piano" },
      {
        property: "og:description",
        content:
          "Confrontation des moyennes de touchweight statique entre le piano actuel et un piano témoin.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Comparer,
});

// --- Reproduction stricte du cadre "Moyennes" de la page Saisie -------------
// (FRAME_CLASS / FRAME_TITLE_CLASS de saisie.tsx, recopiés à l'identique —
//  on ne peut pas importer le composant Frame interne de /saisie sans le
//  modifier, ce qui est interdit.)
const FRAME_CLASS = "relative rounded-md border-2 border-foreground bg-card p-4 pt-5";
const FRAME_TITLE_CLASS = "absolute -top-3.5 left-4 bg-card px-2 text-lg font-bold text-black";

function Frame({
  title,
  className = "",
  children,
}: {
  title: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section className={`${FRAME_CLASS} ${className}`}>
      <h2 className={FRAME_TITLE_CLASS}>{title}</h2>
      {children}
    </section>
  );
}

// Colonnes identiques au cadre Moyennes de Saisie.
const COLUMNS = [
  { key: "wa", label: "Poids descendant (Wa)" },
  { key: "wd", label: "Poids ascendant (Wd)" },
  { key: "friction", label: "Friction" },
  { key: "balance", label: "Balance" },
] as const;

type MetricKey = (typeof COLUMNS)[number]["key"];

// Valeurs "—" par défaut : aucun piano actuel ni témoin chargé.
type Averages = Record<MetricKey, string>;
const EMPTY_AVERAGES: Averages = { wa: "—", wd: "—", friction: "—", balance: "—" };

// --- Bandeau de résumé condensé --------------------------------------------
type PianoSummary = {
  brand: string;
  model: string;
  year: string;
  snPrefix: string;
  snCentral: string;
  snSuffix: string;
  measureDate: string;
  modeLabel: string;
};

const EMPTY_SUMMARY: PianoSummary = {
  brand: "",
  model: "",
  year: "",
  snPrefix: "",
  snCentral: "",
  snSuffix: "",
  measureDate: "",
  modeLabel: "",
};

const DASH = "-";

function SummaryBanner({ s }: { s: PianoSummary }) {
  const sn =
    [s.snPrefix, s.snCentral, s.snSuffix].some((v) => v.trim() !== "")
      ? [s.snPrefix, s.snCentral, s.snSuffix].filter((v) => v.trim() !== "").join("-")
      : DASH;
  const parts = [
    `${s.brand || DASH} ${s.model || DASH}${s.year ? ` (${s.year})` : ""}`,
    `SN : ${sn}`,
    `Mesures du ${s.measureDate || DASH}`,
    `Mode actuel : ${s.modeLabel || DASH}`,
  ];
  return (
    <p className="w-full text-center !text-gray-700 text-sm font-medium tracking-wide">
      Résumé : {parts.join(" • ")}
    </p>
  );
}

// --- Cellule de grand chiffre (Piano Actuel / Piano Témoin) -----------------
function MetricCell({
  label,
  value,
  active = false,
}: {
  label: string;
  value: string;
  active?: boolean;
}) {
  return (
    <div className="rounded bg-muted px-2 py-1.5 text-center">
      <div className="!text-[1.1rem] font-bold tracking-wide text-muted-foreground">
        {label}
      </div>
      <div
        className={`mt-1 !text-2xl !font-bold tabular-nums ${
          active ? "!text-orange-600" : ""
        }`}
        style={active ? { color: "#f97316" } : undefined}
      >
        {value === "—" ? (
          <span className={active ? "" : "text-muted-foreground"}>—</span>
        ) : (
          <>
            {value}
            <span className="!text-xs !font-medium"> g.</span>
          </>
        )}
      </div>
    </div>
  );
}

function profileFromRow(row: {
  wa_values: number[];
  wd_values: number[];
  friction_values: number[];
  balance_values: number[];
}): RefProfile {
  return {
    wa: row.wa_values,
    wd: row.wd_values,
    friction: row.friction_values,
    balance: row.balance_values,
  };
}


function profileAverage(profile: RefProfile | null, key: keyof RefProfile): string {
  const values = profile?.[key] ?? [];
  if (values.length === 0) return "—";
  return (values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(1);
}

function Comparer() {
  const [summary] = useState<PianoSummary>(EMPTY_SUMMARY);
  const [myPiano, setMyPiano] = useState<RefProfile | null>(null);
  const [sameModel, setSameModel] = useState<RefProfile | null>(null);
  const [factorySpecs, setFactorySpecs] = useState(false);

  // Gate d'accès : erreur RLS OU ligne MOCK-MON-PIANO absente => blocage écran.
  const [debugStatus, setDebugStatus] = useState<"loading" | "ok" | "error">("loading");


  useEffect(() => {
    let cancelled = false;

    async function loadComparisonProfiles() {
      // Source de vérité : projet Supabase EXTERNE (djnznvmdzyvlekqypaox).
      const [mineResult, witnessResult] = await Promise.all([
        externalSupabase
          .from("piano_profiles")
          .select("*")
          .eq("serial_number", "MOCK-MON-PIANO")
          .single(),
        externalSupabase
          .from("piano_profiles")
          .select("*")
          .eq("serial_number", "MOCK-WITNESS")
          .single(),
      ]);

      if (cancelled) return;

      // Gate MOCK-MON-PIANO : erreur d'accès OU ligne absente => bloqué.
      setDebugStatus(mineResult.error || !mineResult.data ? "error" : "ok");


      setMyPiano(mineResult.data ? profileFromRow(mineResult.data) : null);
      setSameModel(witnessResult.data ? profileFromRow(witnessResult.data) : null);
    }

    void loadComparisonProfiles();
    return () => {
      cancelled = true;
    };
  }, []);

  const chartData = useMemo(
    () => buildChartData(myPiano, sameModel, factorySpecs ? FACTORY_PROFILE : STD_PROFILE),
    [myPiano, sameModel, factorySpecs],
  );

  const current: Averages = {
    wa: seriesAverage(chartData, "waCur"),
    wd: seriesAverage(chartData, "wdCur"),
    friction: seriesAverage(chartData, "fricCur"),
    balance: seriesAverage(chartData, "balCur"),
  };
  const witness: Averages = {
    wa: profileAverage(sameModel, "wa"),
    wd: profileAverage(sameModel, "wd"),
    friction: profileAverage(sameModel, "friction"),
    balance: profileAverage(sameModel, "balance"),
  };


  return (
    <main className="mx-auto w-full max-w-[1400px] px-6 py-8">
      <div className="mb-6">
        <SummaryBanner s={summary} />
      </div>
      <div className="mb-4 flex justify-center">
        <Button
          type="button"
          variant={factorySpecs ? "default" : "outline"}
          onClick={() => setFactorySpecs((value) => !value)}
          aria-pressed={factorySpecs}
        >
          {factorySpecs ? "Factory Specs" : "Valeurs Types"}
        </Button>
      </div>
      <div className="flex w-full flex-col gap-6">
        <div className="w-full min-w-0">
          {/* --- Test de vérité : diagnostic Supabase MOCK-MON-PIANO --- */}
          {debugStatus === "error" ? (
            <div className="flex w-full items-center justify-center py-16">
              <p className="!text-2xl !font-bold !text-red-600 text-center">
                ERREUR D'ACCÈS SUPABASE : Impossible de lire MOCK-MON-PIANO. Vérifie les règles RLS de la table.
              </p>
            </div>
          ) : (
            <div className="mb-6">
              <ComparisonChart chartData={chartData} />
            </div>
          )}

          <Frame title="Moyennes" className="mt-2">
            <div className="mb-3">
              <div className="mb-1.5 px-1 text-[0.7rem] font-semibold uppercase tracking-wide text-gray-500">
                Piano Actuel
              </div>
              <div className="grid grid-cols-4 gap-3">
                {COLUMNS.map(({ key, label }) => (
                  <MetricCell key={key} label={label} value={current[key]} />
                ))}
              </div>
            </div>
            <div>
              <div className="mb-1.5 px-1 text-[0.7rem] font-semibold uppercase tracking-wide text-orange-600">
                Piano Témoin
              </div>
              <div className="grid grid-cols-4 gap-3">
                {COLUMNS.map(({ key, label }) => (
                  <MetricCell key={key} label={label} value={witness[key]} active />
                ))}
              </div>
            </div>
          </Frame>
        </div>
      </div>
    </main>
  );
}
