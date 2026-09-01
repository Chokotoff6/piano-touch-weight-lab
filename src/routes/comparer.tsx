import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
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
// Page de comparaison — carrosserie graphique (cadres officiels) alimentée par
// un jeu de données de test local (15 points d'échantillonnage).
// ---------------------------------------------------------------------------

const DO_POSITIONS = [4, 16, 28, 40, 52, 64, 76, 88];

// --- Jeu de données de test en dur (mockup exact) ---------------------------
const dataRaw = [
  { noteIndex: 4, isBlack: false, Wa: 75.0, Wd: 67.0, Friction: 4.0, Balance: 71.0, WitnessWa: 71.5, WitnessWd: 69.0, WitnessFriction: 1.2, WitnessBalance: 70.2 },
  { noteIndex: 10, isBlack: true, Wa: 78.9, Wd: 56.9, Friction: 11.0, Balance: 67.9, WitnessWa: 75.4, WitnessWd: 58.9, WitnessFriction: 8.3, WitnessBalance: 67.2 },
  { noteIndex: 16, isBlack: false, Wa: 72.9, Wd: 64.6, Friction: 4.2, Balance: 68.8, WitnessWa: 69.4, WitnessWd: 66.6, WitnessFriction: 1.4, WitnessBalance: 68.0 },
  { noteIndex: 22, isBlack: true, Wa: 78.0, Wd: 54.6, Friction: 11.7, Balance: 66.3, WitnessWa: 74.5, WitnessWd: 56.6, WitnessFriction: 8.9, WitnessBalance: 65.5 },
  { noteIndex: 28, isBlack: false, Wa: 70.7, Wd: 64.4, Friction: 3.1, Balance: 67.6, WitnessWa: 67.2, WitnessWd: 66.4, WitnessFriction: 0.4, WitnessBalance: 66.8 },
  { noteIndex: 34, isBlack: true, Wa: 74.6, Wd: 53.6, Friction: 10.5, Balance: 64.1, WitnessWa: 71.1, WitnessWd: 55.6, WitnessFriction: 7.7, WitnessBalance: 63.3 },
  { noteIndex: 40, isBlack: false, Wa: 67.2, Wd: 63.1, Friction: 2.1, Balance: 65.2, WitnessWa: 63.7, WitnessWd: 65.1, WitnessFriction: -0.7, WitnessBalance: 64.4 },
  { noteIndex: 46, isBlack: true, Wa: 72.5, Wd: 50.0, Friction: 11.2, Balance: 61.2, WitnessWa: 69.0, WitnessWd: 52.0, WitnessFriction: 8.5, WitnessBalance: 60.5 },
  { noteIndex: 52, isBlack: false, Wa: 66.4, Wd: 61.9, Friction: 2.3, Balance: 64.2, WitnessWa: 62.9, WitnessWd: 63.9, WitnessFriction: -0.5, WitnessBalance: 63.4 },
  { noteIndex: 58, isBlack: true, Wa: 71.6, Wd: 47.7, Friction: 11.9, Balance: 59.6, WitnessWa: 68.1, WitnessWd: 49.7, WitnessFriction: 9.2, WitnessBalance: 58.9 },
  { noteIndex: 64, isBlack: false, Wa: 64.3, Wd: 59.5, Friction: 2.4, Balance: 61.9, WitnessWa: 60.8, WitnessWd: 61.5, WitnessFriction: -0.4, WitnessBalance: 61.1 },
  { noteIndex: 70, isBlack: true, Wa: 68.2, Wd: 45.4, Friction: 11.4, Balance: 56.8, WitnessWa: 64.7, WitnessWd: 47.4, WitnessFriction: 8.7, WitnessBalance: 56.0 },
  { noteIndex: 76, isBlack: false, Wa: 60.7, Wd: 59.3, Friction: 0.7, Balance: 60.0, WitnessWa: 57.2, WitnessWd: 61.3, WitnessFriction: -2.0, WitnessBalance: 59.2 },
  { noteIndex: 82, isBlack: true, Wa: 66.1, Wd: 44.4, Friction: 10.8, Balance: 55.2, WitnessWa: 62.6, WitnessWd: 46.4, WitnessFriction: 8.1, WitnessBalance: 54.5 },
  { noteIndex: 88, isBlack: false, Wa: 60.0, Wd: 58.0, Friction: 1.0, Balance: 59.0, WitnessWa: 56.5, WitnessWd: 60.0, WitnessFriction: -1.8, WitnessBalance: 58.2 },
];

type KeyFilter = "all" | "white" | "black";

const KEY_FILTERS: Array<{ id: KeyFilter; label: string }> = [
  { id: "all", label: "Toutes les touches" },
  { id: "white", label: "Touches Blanches ⚪" },
  { id: "black", label: "Touches Noires ⚫" },
];

// Point normalisé consommé par Recharts.
type ChartPoint = {
  key: number;
  isBlack: boolean;
  waCur: number;
  sameWa: number;
  stdWa: number;
  wdCur: number;
  sameWd: number;
  stdWd: number;
  balCur: number;
  sameBal: number;
  factoryBal: number;
  fricCur: number;
  sameFric: number;
  factoryFric: number;
};

const n1 = (v: number) => Number(v.toFixed(1));

// --- Profils de référence chargés depuis la base ---------------------------
// Correspondances exactes avec le mockup Supabase :
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
  const count = dataRaw.length;
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

// Construit les 15 points du graphique. Aucune formule locale : chaque série
// provient exclusivement de son profil chargé (ou de l'abaque pour le vert).
// Une valeur absente reste vide (pas de point).
function buildChartData(mine: RefProfile | null, same: RefProfile | null, ref: RefProfile | null): ChartPoint[] {
  return dataRaw.map((d, i) => {
    const v = (arr: number[] | undefined, fallback: number) => {
      const raw = arr?.[i];
      return typeof raw === "number" && !Number.isNaN(raw) ? n1(raw) : fallback;
    };
    return {
      key: d.noteIndex,
      isBlack: d.isBlack,
      waCur: v(mine?.wa, d.Wa),
      sameWa: v(same?.wa, undefined as unknown as number),
      stdWa: v(ref?.wa, undefined as unknown as number),
      wdCur: v(mine?.wd, d.Wd),
      sameWd: v(same?.wd, undefined as unknown as number),
      stdWd: v(ref?.wd, undefined as unknown as number),
      balCur: v(mine?.balance, d.Balance),
      sameBal: v(same?.balance, undefined as unknown as number),
      factoryBal: v(ref?.balance, undefined as unknown as number),
      fricCur: v(mine?.friction, d.Friction),
      sameFric: v(same?.friction, undefined as unknown as number),
      factoryFric: v(ref?.friction, undefined as unknown as number),
    };
  });
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
  count: number;
  dyLeft: number;
  dyRight: number;
};

function makeEndLabel(opts: EndLabelOptions) {
  const EndLabel = (props: { x?: number; y?: number; index?: number }) => {
    const { x = 0, y = 0, index = -1 } = props;
    if (index === 0) {
      return (
        <text x={x - 44} y={y} dy={opts.dyLeft} textAnchor="end" fontSize={11} fontWeight={600} fill={opts.color}>
          {opts.shortName}
        </text>
      );
    }
    if (index === opts.count - 1) {
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

// Définition des 4 familles : titre du cadre, échelle fixe, séries.
const FAMILIES: Array<{
  id: string;
  title: string;
  domain: [number, number];
  topAxis?: boolean;
  lines: LineDef[];
}> = [
  {
    id: "wa",
    title: "Poids d'enfoncement (Wa)",
    domain: [55, 85],
    topAxis: true,
    lines: [
      { dataKey: "waCur", name: "Mon piano Wa", shortName: "Mon piano Wa", color: "#000000", real: true },
      { dataKey: "sameWa", name: "Same model(s)", shortName: "Same model(s)", color: "#f97316" },
      { dataKey: "stdWa", name: "Std", shortName: "Std", color: "#10b981" },
    ],
  },
  {
    id: "wd",
    title: "Poids de retour (Wd)",
    domain: [50, 70],
    topAxis: true,
    lines: [
      { dataKey: "wdCur", name: "Mon piano Wd", shortName: "Mon piano Wd", color: "#000000", real: true },
      { dataKey: "sameWd", name: "Same model(s)", shortName: "Same model(s)", color: "#f97316" },
      { dataKey: "stdWd", name: "Std", shortName: "Std", color: "#10b981" },
    ],
  },
  {
    id: "bal",
    title: "Balance statique",
    domain: [55, 75],
    topAxis: true,
    lines: [
      { dataKey: "balCur", name: "Mon piano Balance", shortName: "Mon piano Balance", color: "#000000", real: true },
      { dataKey: "sameBal", name: "Same model(s)", shortName: "Same model(s)", color: "#f97316" },
      { dataKey: "factoryBal", name: "Factory", shortName: "Factory", color: "#10b981" },
    ],
  },
  {
    id: "fric",
    title: "Friction mécanique",
    domain: [-2, 16],
    topAxis: true,
    lines: [
      { dataKey: "fricCur", name: "Mon piano Friction", shortName: "Mon piano Friction", color: "#000000", real: true },
      { dataKey: "sameFric", name: "Same model(s)", shortName: "Same model(s)", color: "#f97316" },
      { dataKey: "factoryFric", name: "Factory", shortName: "Factory", color: "#10b981" },
    ],
  },
];

// Décalages verticaux des étiquettes d'extrémité : trois niveaux groupés
// (0 / 10 / 20 px) attribués selon l'altitude réelle des courbes (la courbe
// la plus haute reste à dy 0, centrée sur sa cote). Tous ≤ 20 px : les textes
// restent groupés face à leur courbe à la note 88, sans déborder du cadre.
const DY_STEPS = [0, 10, 20];

function offsetsFor(
  lines: LineDef[],
  point: ChartPoint | undefined,
  _domain: [number, number],
): Map<SeriesKey, number> {
  const map = new Map<SeriesKey, number>();
  if (!point) {
    lines.forEach((l, i) => map.set(l.dataKey, DY_STEPS[i] ?? 20));
    return map;
  }
  [...lines]
    .sort((a, b) => point[b.dataKey] - point[a.dataKey]) // courbe haute → basse
    .forEach((l, i) => map.set(l.dataKey, DY_STEPS[i] ?? 20));
  return map;
}

function ComparisonChart({ chartData }: { chartData: ChartPoint[] }) {
  const [keyFilter, setKeyFilter] = useState<KeyFilter>("all");
  const [hoveredChart, setHoveredChart] = useState<string | null>(null);
  const [hoveredNoteIndex, setHoveredNoteIndex] = useState<number | null>(null);

  const filteredData = useMemo(() => {
    if (keyFilter === "white") return chartData.filter((p) => !p.isBlack);
    if (keyFilter === "black") return chartData.filter((p) => p.isBlack);
    return chartData;
  }, [chartData, keyFilter]);

  const count = filteredData.length;
  const first = filteredData[0];
  const last = filteredData[count - 1];

  function SubChart({ family }: { family: (typeof FAMILIES)[number] }) {
    const dyLeft = offsetsFor(family.lines, first, family.domain);
    const dyRight = offsetsFor(family.lines, last, family.domain);
    const isHovered = hoveredChart === family.id;
    return (
      <Frame title={family.title} className="h-[310px]">
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
              margin={{ top: 5, right: 130, bottom: 15, left: 140 }}
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
              <YAxis width={0} tick={false} axisLine={false} tickLine={false} domain={family.domain} />
              {DO_POSITIONS.map((pos) => (
                <ReferenceLine key={pos} xAxisId="main" x={pos} stroke="#e5e7eb" strokeWidth={1} />
              ))}
              {hoveredNoteIndex !== null && (
                <ReferenceLine xAxisId="main" x={hoveredNoteIndex} stroke="#94a3b8" strokeWidth={1} />
              )}
              {isHovered && <Tooltip content={<CustomTooltipContent />} wrapperStyle={{ pointerEvents: "none" }} isAnimationActive={false} />}
              {family.lines.map((line) => (
                <Line
                  key={line.dataKey}
                  xAxisId="main"
                  type="monotone"
                  dataKey={line.dataKey}
                  name={line.name}
                  stroke={line.color}
                  strokeWidth={1.5}
                  dot={line.real ? SAMPLE_DOT_CONFIG : false}
                  isAnimationActive={false}
                  label={makeEndLabel({
                    shortName: line.shortName,
                    avg: seriesAverage(filteredData, line.dataKey),
                    color: line.color,
                    count,
                    dyLeft: dyLeft.get(line.dataKey) ?? 4,
                    dyRight: dyRight.get(line.dataKey) ?? 4,
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
      <div className="mb-6 flex flex-wrap items-center justify-center gap-2">
        <span className="mr-1 text-sm font-semibold text-gray-700">Filtre clavier :</span>
        {KEY_FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setKeyFilter(f.id)}
            className={`rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors ${
              keyFilter === f.id
                ? "border-gray-900 bg-gray-900 text-white"
                : "border-gray-300 bg-white text-gray-600 hover:border-gray-500 hover:text-gray-900"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>
      <div className="flex w-full flex-col gap-4">
        {FAMILIES.map((f) => (
          <SubChart key={f.id} family={f} />
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

function averageProfiles(
  rows: Array<{
    wa_values: number[];
    wd_values: number[];
    friction_values: number[];
    balance_values: number[];
  }>,
): RefProfile | null {
  if (rows.length === 0) return null;
  const average = (values: number[][]) => {
    const length = Math.max(...values.map((series) => series.length));
    return Array.from({ length }, (_, index) => {
      const atIndex = values.map((series) => series[index]).filter((value) => value !== undefined);
      return atIndex.length > 0 ? atIndex.reduce((sum, value) => sum + value, 0) / atIndex.length : 0;
    });
  };
  return {
    wa: average(rows.map((row) => row.wa_values)),
    wd: average(rows.map((row) => row.wd_values)),
    friction: average(rows.map((row) => row.friction_values)),
    balance: average(rows.map((row) => row.balance_values)),
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

  useEffect(() => {
    let cancelled = false;

    async function loadComparisonProfiles() {
      const { data } = await supabase
        .from("piano_profiles")
        .select("serial_number, marque, modele, wa_values, wd_values, friction_values, balance_values")
        .in("serial_number", [MY_PIANO_SERIAL, WITNESS_SERIAL]);

      if (cancelled) return;
      const rows = data ?? [];
      const mineRow = rows.find((row) => row.serial_number === MY_PIANO_SERIAL);
      const witnessRow = rows.find((row) => row.serial_number === WITNESS_SERIAL);
      setMyPiano(mineRow ? profileFromRow(mineRow) : null);
      setSameModel(witnessRow ? profileFromRow(witnessRow) : null);
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
          <div className="mb-6">
            <ComparisonChart chartData={chartData} />
          </div>
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
