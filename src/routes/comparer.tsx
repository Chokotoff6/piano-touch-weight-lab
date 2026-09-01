import { createFileRoute, useLoaderData } from "@tanstack/react-router";
import { useMemo, useState, type ReactNode } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
} from "recharts";
import { supabase } from "@/integrations/supabase/client";

// ---------------------------------------------------------------------------
// Page de comparaison — connectée aux profils réels (table piano_profiles).
//  - Courbes noires  : serial_number = 'MOCK-MON-PIANO' ("Mon piano").
//  - Courbes oranges : serial_number = 'MOCK-WITNESS'  ("Same model(s)").
// Échelles Y verrouillées avec des domaines fixes pour une loupe verticale
// stable, sans chaos visuel.
// ---------------------------------------------------------------------------

// --- Moteur graphique (BLOCS 2 + 3) -----------------------------------------
// Positions X des touches DO sur le clavier (1..88).
const DO_POSITIONS = [4, 16, 28, 40, 52, 64, 76, 88];

// 15 points d'échantillonnage de la matrice (pastilles noires ultra-fines).
const SAMPLE_POSITIONS = Array.from({ length: 15 }, (_, i) =>
  Math.round((i * 87) / 14),
);
const SAMPLE_INDICES = new Set(SAMPLE_POSITIONS);

// --- Filtre par type de touches ---------------------------------------------
// Touches noires du clavier (touche 1 = La0 blanc, touche 4 = premier Do).
const BLACK_KEYS = new Set([
  2, 5, 7, 10, 12, 14, 17, 19, 22, 24, 26, 29, 31, 34, 36, 38, 41, 43, 46, 48, 50,
  53, 55, 58, 60, 62, 65, 67, 70, 72, 74, 77, 79, 82, 84, 86,
]);
const isBlackKey = (key: number) => BLACK_KEYS.has(key);

type KeyFilter = "all" | "white" | "black";

const KEY_FILTERS: Array<{ id: KeyFilter; label: string }> = [
  { id: "all", label: "Toutes les touches" },
  { id: "white", label: "Touches Blanches ⚪" },
  { id: "black", label: "Touches Noires ⚫" },
];

// --- Données réelles (piano_profiles) ---------------------------------------
// Chaque profil stocke 15 valeurs par mesure (matrice d'échantillonnage),
// placées aux 15 positions SAMPLE_POSITIONS puis interpolées linéairement
// sur les 88 touches.
type ProfileRow = {
  serial_number: string;
  marque: string | null;
  modele: string | null;
  wa_values: number[];
  wd_values: number[];
  balance_values: number[];
  friction_values: number[];
};

type ChartPoint = {
  key: number;
  waCur?: number;
  sameWa?: number;
  wdCur?: number;
  sameWd?: number;
  balCur?: number;
  sameBal?: number;
  fricCur?: number;
  sameFric?: number;
};

type MetricFamily = "wa" | "wd" | "bal" | "fric";

// Étend les 15 points d'échantillonnage sur les 88 touches (interpolation
// linéaire entre points de mesure, extrapolation plate aux extrémités).
function expandSamples(values: number[] | null | undefined): (number | undefined)[] {
  const out: (number | undefined)[] = new Array(88).fill(undefined);
  if (!values || values.length === 0) return out;
  const pts = values.slice(0, 15).map((v) => Number(v));
  while (pts.length < 15) pts.push(pts[pts.length - 1]!);
  for (let s = 0; s < SAMPLE_POSITIONS.length; s++) {
    const i0 = SAMPLE_POSITIONS[s]!;
    out[i0] = Number(pts[s]!.toFixed(1));
    if (s < SAMPLE_POSITIONS.length - 1) {
      const i1 = SAMPLE_POSITIONS[s + 1]!;
      const v0 = pts[s]!;
      const v1 = pts[s + 1]!;
      for (let i = i0 + 1; i < i1; i++) {
        const t = (i - i0) / (i1 - i0);
        out[i] = Number((v0 + (v1 - v0) * t).toFixed(1));
      }
    }
  }
  // Extrapolation plate avant le premier / après le dernier point.
  for (let i = 0; i < SAMPLE_POSITIONS[0]!; i++) out[i] = out[SAMPLE_POSITIONS[0]!];
  for (let i = SAMPLE_POSITIONS[14]! + 1; i < 88; i++) out[i] = out[SAMPLE_POSITIONS[14]!];
  return out;
}

function buildChartData(
  mine: ProfileRow | undefined,
  witness: ProfileRow | undefined,
): ChartPoint[] {
  const mWa = expandSamples(mine?.wa_values);
  const mWd = expandSamples(mine?.wd_values);
  const mBal = expandSamples(mine?.balance_values);
  const mFric = expandSamples(mine?.friction_values);
  const wWa = expandSamples(witness?.wa_values);
  const wWd = expandSamples(witness?.wd_values);
  const wBal = expandSamples(witness?.balance_values);
  const wFric = expandSamples(witness?.friction_values);
  const points: ChartPoint[] = [];
  for (let k = 1; k <= 88; k++) {
    const i = k - 1;
    points.push({
      key: k,
      waCur: mWa[i],
      wdCur: mWd[i],
      balCur: mBal[i],
      fricCur: mFric[i],
      sameWa: wWa[i],
      sameWd: wWd[i],
      sameBal: wBal[i],
      sameFric: wFric[i],
    });
  }
  return points;
}

// Moyenne d'une série (affichée comme valeur moyenne au flanc droit).
// Ignore les points absents ; renvoie "" si la série est vide.
function seriesAverage(data: ChartPoint[], key: keyof Omit<ChartPoint, "key">): string {
  const vals = data
    .map((p) => p[key])
    .filter((v): v is number => typeof v === "number" && Number.isFinite(v));
  if (vals.length === 0) return "";
  return (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1);
}

// Indique si une série contient au moins une valeur réelle.
function seriesHasData(data: ChartPoint[], key: keyof Omit<ChartPoint, "key">): boolean {
  return data.some((p) => typeof p[key] === "number");
}

// Pastilles noires calibrées (r = 2) uniquement sur les 15 points
// d'échantillonnage de la matrice — réservées aux courbes réelles.
const SAMPLE_DOT_CONFIG = { r: 2, fill: "#000000", strokeWidth: 0 };
function sampleDot(props: { cx?: number; cy?: number; index?: number }) {
  const { cx = 0, cy = 0, index = -1 } = props;
  if (!SAMPLE_INDICES.has(index)) return <g key={`dot-${index}`} />;
  return <circle key={`dot-${index}`} cx={cx} cy={cy} r={2} fill="#000000" strokeWidth={0} />;
}

// Étiquettes d'extrémité compressées :
//  - Flanc gauche (index 0)   : nom brut du groupe ("Wa", "Bal.", ...), textAnchor="end", x - 10.
//  - Flanc droit (index max)  : "Moy: xx.xg", textAnchor="start", x + 10.
//  - dy = 4 fixe (pile en face de l'axe de la courbe), sans décalage complexe.
type EndLabelOptions = {
  shortName: string;
  avg: string;
  color: string;
  count: number;
  // Décalages verticaux anti-collision des deux flancs (dy final absolu).
  // Valeurs échelonnées ex: -10 / 4 / 18 pour interdire les chevauchements.
  dyLeft?: number;
  dyRight?: number;
};

function makeEndLabel(opts: EndLabelOptions) {
  const EndLabel = (props: { x?: number; y?: number; index?: number }) => {
    const { x = 0, y = 0, index = -1 } = props;
    if (index === 0) {
      const dy = opts.dyLeft ?? 4;
      return (
        <text x={x - 10} y={y} dy={dy} textAnchor="end" fontSize={11} fontWeight={600} fill={opts.color}>
          {opts.shortName}
        </text>
      );
    }
    if (index === opts.count - 1) {
      const dy = opts.dyRight ?? 4;
      return (
        <text x={x + 10} y={y} dy={dy} textAnchor="start" fontSize={11} fontWeight={600} fill={opts.color}>
          {`Moy: ${opts.avg}g`}
        </text>
      );
    }
    return <g />;
  };
  return EndLabel;
}

// Anti-collision des étiquettes d'extrémité : si deux valeurs d'un même
// flanc sont distantes de moins de `threshold` grammes, on trie les séries
// par valeur décroissante et on applique des dy fixes échelonnés
// (-10 / 4 / 18) pour interdire tout chevauchement de texte.
function staggerDy(
  entries: Array<{ key: string; v: number }>,
  threshold: number,
): Map<string, number> {
  const map = new Map<string, number>();
  const sorted = [...entries].sort((a, b) => b.v - a.v);
  let collides = false;
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i - 1]!.v - sorted[i]!.v < threshold) collides = true;
  }
  if (!collides) return map;
  const STEPS = [-10, 4, 18];
  sorted.forEach((e, i) => map.set(e.key, STEPS[i] ?? 4 + i * 14));
  return map;
}

// Tick personnalisé de l'axe supérieur :
//  - note 4 : "(DO)" déporté à gauche (x - 24) + "4" ancré à x,
//  - autres DO : numéro brut centré sur son axe vertical.
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

// Le tooltip trie désormais strictement par poids décroissant (voir
// CustomTooltipContent) — plus de rang par famille de courbe.

type TooltipEntry = {
  name?: string;
  value?: number;
  color?: string;
};

// Couleur de pastille / texte selon la famille de la série (charte graphique) :
//  - Actuel       → noir (#000000)
//  - Same models  → orange (#f97316)
//  - Std / Factory → vert (#10b981)
function tooltipColorFor(name: string): string {
  const n = name.toLowerCase();
  if (n.includes("mon piano")) return "#000000";
  if (n.startsWith("same model")) return "#f97316";
  return "#10b981"; // Std ou Factory (références)
}

function CustomTooltipContent(props: {
  active?: boolean;
  payload?: TooltipEntry[];
  label?: number;
}) {
  const { active, payload, label } = props;
  if (!active || !payload || payload.length === 0) return null;
  // 1. Capture complète : copie du payload reçu.
  const items = [...payload];
  // 2. Filtre les éléments sans valeur numérique valide.
  const valid = items.filter(
    (e) => e.value !== undefined && typeof e.value === "number" && !Number.isNaN(e.value),
  );
  // 3. Tri dynamique strict par poids décroissant (live, touche par touche).
  valid.sort((a, b) => Number(b.value) - Number(a.value));
  return (
    <div className="rounded-md border border-gray-200 bg-white/95 px-3 py-2 text-xs shadow-md">
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

function ComparisonChart() {
  // Données réelles chargées depuis piano_profiles (loader de la route).
  const { profiles } = useLoaderData({ from: "/comparer" });
  const data = useMemo<ChartPoint[]>(() => {
    const mine = profiles.find((p) => p.serial_number === "MOCK-MON-PIANO");
    const witness = profiles.find((p) => p.serial_number === "MOCK-WITNESS");
    return buildChartData(mine, witness);
  }, [profiles]);
  // Filtre global par type de touches (blanches / noires / toutes).
  const [keyFilter, setKeyFilter] = useState<KeyFilter>("all");

  // Filtrage en amont : Recharts ne reçoit que les points du type choisi.
  const filteredData = useMemo(() => {
    if (keyFilter === "white") return data.filter((p) => !isBlackKey(p.key));
    if (keyFilter === "black") return data.filter((p) => isBlackKey(p.key));
    return data;
  }, [data, keyFilter]);

  const count = filteredData.length;

  // Moyennes recalculées sur le sous-ensemble filtré.
  const avg = (key: keyof Omit<ChartPoint, "key">) =>
    seriesAverage(filteredData, key);

  // Définitions des courbes : trait plein continu 1.5 px, labels d'extrémité.
  // Nommage exact : "Mon piano Wa/Wd/Balance/Friction" (noir, réel) et
  // "Same model(s)" (orange, témoin). Pas de courbe Std/Factory tant qu'aucune
  // référence réelle n'est stockée en base.
  const LINES: Array<{
    dataKey: keyof Omit<ChartPoint, "key">;
    name: string;
    shortName: string;
    color: string;
    family: MetricFamily;
    real?: boolean; // pastilles noires d'échantillonnage
  }> = [
    { dataKey: "waCur", name: "Mon piano Wa", shortName: "Mon piano", color: "#000000", family: "wa", real: true },
    { dataKey: "sameWa", name: "Same model(s)", shortName: "Same model(s)", color: "#f97316", family: "wa" },
    { dataKey: "wdCur", name: "Mon piano Wd", shortName: "Mon piano", color: "#000000", family: "wd", real: true },
    { dataKey: "sameWd", name: "Same model(s)", shortName: "Same model(s)", color: "#f97316", family: "wd" },
    { dataKey: "balCur", name: "Mon piano Balance", shortName: "Mon piano", color: "#000000", family: "bal", real: true },
    { dataKey: "sameBal", name: "Same model(s)", shortName: "Same model(s)", color: "#f97316", family: "bal" },
    { dataKey: "fricCur", name: "Mon piano Friction", shortName: "Mon piano", color: "#000000", family: "fric", real: true },
    { dataKey: "sameFric", name: "Same model(s)", shortName: "Same model(s)", color: "#f97316", family: "fric" },
  ];

  // Regroupement par famille — ordre physique imposé (de haut en bas) :
  // WA → WD → BALANCE → FRICTION.
  const WA_LINES = LINES.filter((l) => l.family === "wa");
  const WD_LINES = LINES.filter((l) => l.family === "wd");
  const BAL_LINES = LINES.filter((l) => l.family === "bal");
  const FRIC_LINES = LINES.filter((l) => l.family === "fric");

  // Sous-graphique individuel (famille isolée). Sync global "piano".
  function SubChart({
    lines,
    withTopAxis,
    yDomain,
  }: {
    lines: typeof LINES;
    withTopAxis?: boolean;
    yDomain: [number, number];
  }) {
    const visible = lines.filter((l) => seriesHasData(filteredData, l.dataKey));
    const first = filteredData[0];
    // Anti-collision : flanc gauche sur la première valeur, flanc droit sur
    // les moyennes affichées.
    const dyLeft = staggerDy(
      visible.map((l) => ({ key: l.dataKey, v: Number(first?.[l.dataKey] ?? 0) })),
      1.2,
    );
    const dyRight = staggerDy(
      visible.map((l) => ({ key: l.dataKey, v: Number(avg(l.dataKey) || 0) })),
      1.2,
    );
    return (
      <div className="flex-1 h-full w-full min-h-0 relative">
        <div className="absolute inset-0">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={filteredData}
            syncId="piano"
            margin={{ top: 8, right: 120, bottom: withTopAxis ? 15 : 4, left: 120 }}
          >
            <XAxis xAxisId="main" dataKey="key" type="number" domain={[1, 88]} hide />
            {withTopAxis ? (
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
            ) : (
              <XAxis xAxisId="topAxis" dataKey="key" type="number" domain={[1, 88]} hide />
            )}
            {/* Échelle individualisée par famille (calibrage rationnel). */}
            <YAxis
              width={0}
              tick={false}
              axisLine={false}
              tickLine={false}
              domain={yDomain}
            />
            {/* Séparateurs verticaux fins aux emplacements des touches DO. */}
            {DO_POSITIONS.map((pos) => (
              <ReferenceLine
                key={pos}
                xAxisId="main"
                x={pos}
                stroke="#e5e7eb"
                strokeWidth={1}
              />
            ))}
            <Tooltip content={<CustomTooltipContent />} />
            {lines.map((line) => (
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
                  avg: avg(line.dataKey),
                  color: line.color,
                  count,
                  dyRight: dyRight.get(line.dataKey) ?? 0,
                })}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col px-2 pt-2 pb-12">
      {/* Interrupteur de sélection : filtre par type de touches. */}
      <div className="mb-4 flex flex-wrap items-center justify-center gap-2">
        <span className="mr-1 text-sm font-semibold text-gray-700">
          Filtre clavier :
        </span>
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

      <div className="w-full h-[580px] flex flex-col justify-between gap-10">
      {/* BLOC 1 : Wa (conserve l'axe supérieur DO). */}
      <SubChart lines={WA_LINES} withTopAxis yDomain={["dataMin - 1.5", "dataMax + 1.5"]} />
      {/* BLOC 2 : Balance. */}
      <SubChart lines={BAL_LINES} yDomain={["dataMin - 1.0", "dataMax + 1.0"]} />
      {/* BLOC 3 : Wd. */}
      <SubChart lines={WD_LINES} yDomain={["dataMin - 1.5", "dataMax + 1.5"]} />
      {/* BLOC 4 : Friction. */}
      <SubChart lines={FRIC_LINES} yDomain={["dataMin - 0.5", "dataMax + 0.5"]} />
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

function Comparer() {
  // État local isolé : aucune source de données branchée pour l'instant.
  // Tout est "—" par défaut — prêt à être alimenté plus tard.
  const [summary] = useState<PianoSummary>(EMPTY_SUMMARY);
  const [current] = useState<Averages>(EMPTY_AVERAGES);
  const [witness] = useState<Averages>(EMPTY_AVERAGES);
  // Aucune donnée de comparaison chargée → panneau de filtres masqué.
  const [hasComparisonData] = useState(false);

  return (
    <main className="mx-auto max-w-[1400px] w-full px-6 py-8">
      {/* Bandeau de résumé condensé, ligne centrée, sans cadre. */}
      <div className="mb-6">
        <SummaryBanner s={summary} />
      </div>

      {/* Grille responsive : colonne unique sur mobile, deux colonnes sur grand écran. */}
      <div className="flex flex-col lg:flex-row w-full gap-6">
        {/* Zone centrale : futur graphique + cadre de confrontation des moyennes. */}
        <div className={hasComparisonData ? "flex-1 min-w-0" : "w-full"}>
          {/* Moteur graphique (BLOC 2) : courbes de pesée, axe des DO, tooltip trié. */}
          <div className="mb-6">
            <ComparisonChart />
          </div>

          {/* Cadre de confrontation des moyennes (double grands chiffres). */}
          <Frame title="Moyennes" className="mt-2">
            {/* Ligne 1 — Piano Actuel */}
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

            {/* Ligne 2 — Piano Témoin (couleur orange active #f97316, tiret gris par défaut). */}
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

        {/* Volet de filtres — strictement masqué tant qu'aucune donnée de
            comparaison n'est chargée. La zone centrale prend alors 100% de la largeur. */}
        {hasComparisonData && (
          <aside className="w-full lg:w-80 shrink-0">
            <Frame title="Filtres" className="mt-2">
              <p className="text-sm text-muted-foreground">
                Sélection du piano témoin communautaire — à venir.
              </p>
            </Frame>
          </aside>
        )}
      </div>
    </main>
  );
}
