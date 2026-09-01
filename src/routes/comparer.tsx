import { createFileRoute } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
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
// Page de comparaison — architecture, grille visuelle et moteur graphique.
// Aucune connexion base de données pour l'instant : les courbes utilisent des
// données fictives temporaires (mock) en attendant le branchement réel.
// Le panneau de filtres reste masqué par défaut.
// ---------------------------------------------------------------------------

// --- Moteur graphique (BLOCS 2 + 3) -----------------------------------------
// Positions X des touches DO sur le clavier (1..88).
const DO_POSITIONS = [4, 16, 28, 40, 52, 64, 76, 88];

// 15 points d'échantillonnage de la matrice (pastilles noires ultra-fines).
const SAMPLE_INDICES = new Set(
  Array.from({ length: 15 }, (_, i) => Math.round((i * 87) / 14)),
);

// Données fictives temporaires : courbe de Wa décroissante réaliste
// (~52 g dans le grave → ~34 g dans l'aigu), Wd et dérivés calculés.
// Les séries témoins / std sont calibrées pour simuler des collisions de
// texte (< 3 g) aux extrémités, afin de valider la micro-aération (BLOC 3).
type ChartPoint = {
  key: number;
  waCur: number;
  sameWa: number;
  stdWa: number;
  wdCur: number;
  balCur: number;
  fricCur: number;
  sameWd: number;
  stdWd: number;
  sameBal: number;
  factoryBal: number;
  sameFric: number;
  factoryFric: number;
};

function buildMockData(): ChartPoint[] {
  const points: ChartPoint[] = [];
  for (let k = 1; k <= 88; k++) {
    const t = (k - 1) / 87;
    const wa = 52 - 18 * t + Math.sin(k * 0.7) * 1.2;
    const wd = wa - 12 - Math.cos(k * 0.5) * 0.8;
    const bal = (wa + wd) / 2;
    const fric = (wa - wd) / 2;
    // Séries témoins / références Wa : écart constant ≥ 3 g pour éviter
    // toute collision d'étiquettes au flanc gauche (hors aération BLOC 3).
    const sameWa = wa + 3.5;
    const stdWa = wa - 3.5;
    // Flanc GAUCHE (k=1) : trois Wd serrées à moins de 3 g → collision,
    // mais étiquettes droites espacées (fins ≥ 2,4 g).
    const sameWd = wd + 1.2 - t * 3.6;
    const stdWd = wd - 1.1 + t * 3.5;
    // Flanc DROIT serré (< 3 g) → collision Balance et Friction.
    const sameBal = bal + 2.4 - t * 1.2; // fin : bal + 1.2
    const factoryBal = bal - 2.2 + t * 1.1; // fin : bal - 1.1
    const sameFric = fric + 2.2 - t * 1.1; // fin : fric + 1.1
    const factoryFric = fric - 2.4 + t * 1.2; // fin : fric - 1.2
    const n = (v: number) => Number(v.toFixed(1));
    points.push({
      key: k,
      waCur: n(wa),
      sameWa: n(sameWa),
      stdWa: n(stdWa),
      wdCur: n(wd),
      balCur: n(bal),
      fricCur: n(fric),
      sameWd: n(sameWd),
      stdWd: n(stdWd),
      sameBal: n(sameBal),
      factoryBal: n(factoryBal),
      sameFric: n(sameFric),
      factoryFric: n(factoryFric),
    });
  }
  return points;
}

// Écart minimal entre deux valeurs d'un groupe (détection de collision < 3 g).
function minGap(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  let min = Infinity;
  for (let i = 1; i < sorted.length; i++) min = Math.min(min, sorted[i]! - sorted[i - 1]!);
  return min;
}

// Moyenne d'une série (affichée comme valeur moyenne au flanc droit).
function seriesAverage(data: ChartPoint[], key: keyof Omit<ChartPoint, "key">): string {
  const sum = data.reduce((acc, p) => acc + (p[key] as number), 0);
  return (sum / data.length).toFixed(1);
}

// Pastille noire ultra-fine (r = 1.4) uniquement sur les 15 points
// d'échantillonnage de la matrice — réservée aux courbes réelles.
function sampleDot(props: { cx?: number; cy?: number; index?: number }) {
  const { cx = 0, cy = 0, index = -1 } = props;
  if (!SAMPLE_INDICES.has(index)) return <g key={`dot-${index}`} />;
  return <circle key={`dot-${index}`} cx={cx} cy={cy} r={1.4} fill="#111827" />;
}

// Étiquettes d'extrémité (BLOC 3) :
//  - Flanc gauche (index 0)   : nom de la courbe, textAnchor="end", x - 10.
//  - Flanc droit (index max)  : valeur moyenne, textAnchor="start", x + 10.
//  - Règle 1 : dy = 4 par défaut (pile en face de l'axe de la courbe).
//  - Règle 2 : si collision (< 3 g), décalage vertical selon l'altitude
//    géométrique réelle (dyLeft / dyRight de la VERSION REF GRAPH 22).
type EndLabelOptions = {
  name: string;
  avg: string;
  color: string;
  count: number;
  dyLeft?: number | null | undefined; // null/undefined → règle 1 (dy 4)
  dyRight?: number | null | undefined;
};

function makeEndLabel(opts: EndLabelOptions) {
  const EndLabel = (props: { x?: number; y?: number; index?: number }) => {
    const { x = 0, y = 0, index = -1 } = props;
    if (index === 0) {
      const dy = opts.dyLeft ?? 4;
      return (
        <text x={x - 10} y={y} dy={dy} textAnchor="end" fontSize={11} fontWeight={600} fill={opts.color}>
          {opts.name}
        </text>
      );
    }
    if (index === opts.count - 1) {
      const dy = opts.dyRight ?? 4;
      return (
        <text x={x + 10} y={y} dy={dy} textAnchor="start" fontSize={11} fontWeight={600} fill={opts.color}>
          {opts.avg}
        </text>
      );
    }
    return <g />;
  };
  return EndLabel;
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
  if (name.includes("actuel")) return "#000000";
  if (name.startsWith("Same models")) return "#f97316";
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
  // Données mock en attendant le branchement réel.
  const [data] = useState<ChartPoint[]>(buildMockData);
  // Chaque sous-graphique gère désormais son échelle verticale automatique
  // (dataMin - 3 / dataMax + 3) — plus de domaine global.
  const count = data.length;
  const first = data[0]!;
  const last = data[count - 1]!;

  // Simulation : les spécifications d'usine sont présentes (mock).
  const isFactorySpecs = true;

  // --- Détection des collisions d'étiquettes (< 3 g) aux extrémités ---------
  // Flanc GAUCHE — famille Wd : Same models Wd / Std Wd / Wd actuel.
  const collideLeftWd = minGap([first.sameWd, first.stdWd, first.wdCur]) < 3;
  // Flanc DROIT — famille Balance (quand isFactorySpecs) : Same models / Factory.
  const collideRightBal =
    isFactorySpecs && minGap([last.sameBal, last.factoryBal, last.balCur]) < 3;
  // Flanc DROIT — famille Friction (quand isFactorySpecs) : Same models / Factory.
  const collideRightFric =
    isFactorySpecs && minGap([last.sameFric, last.factoryFric, last.fricCur]) < 3;

  // Règle 2 (VERSION REF GRAPH 22) : décalages conditionnels, sinon règle 1 (dy 4).
  const dyLeft = {
    sameWd: collideLeftWd ? -12 : null, // la plus haute monte
    stdWd: collideLeftWd ? 0 : null, // se cale au centre
    wdCur: collideLeftWd ? 16 : null, // descend
  };
  const dyRight = {
    sameBal: collideRightBal ? 16 : null, // s'abaisse
    factoryBal: collideRightBal ? 4 : null, // monte
    sameFric: collideRightFric ? 8 : null, // s'abaisse
    factoryFric: collideRightFric ? 4 : null, // se stabilise
  };

  const avg = (key: keyof Omit<ChartPoint, "key">) => seriesAverage(data, key);

  // Définitions des courbes : trait plein continu 1.5 px, labels d'extrémité.
  const LINES: Array<{
    dataKey: keyof Omit<ChartPoint, "key">;
    name: string;
    color: string;
    real?: boolean; // pastilles noires d'échantillonnage
    dyLeft?: number | null;
    dyRight?: number | null;
  }> = [
    { dataKey: "waCur", name: "Wa actuel", color: "#111827", real: true },
    { dataKey: "sameWa", name: "Same models Wa", color: "#f97316" },
    { dataKey: "stdWa", name: "Std Wa", color: "#10b981" },
    { dataKey: "balCur", name: "Balance actuel", color: "#3b82f6", real: true },
    { dataKey: "wdCur", name: "Wd actuel", color: "#9ca3af", real: true, dyLeft: dyLeft.wdCur },
    { dataKey: "fricCur", name: "Friction actuel", color: "#ef4444", real: true },
    { dataKey: "sameWd", name: "Same models Wd", color: "#f97316", dyLeft: dyLeft.sameWd },
    { dataKey: "stdWd", name: "Std Wd", color: "#6b7280", dyLeft: dyLeft.stdWd },
    { dataKey: "sameBal", name: "Same models Balance", color: "#fb923c", dyRight: dyRight.sameBal },
    { dataKey: "factoryBal", name: "Factory Balance", color: "#0ea5e9", dyRight: dyRight.factoryBal },
    { dataKey: "sameFric", name: "Same models Friction", color: "#fbbf24", dyRight: dyRight.sameFric },
    { dataKey: "factoryFric", name: "Factory Friction", color: "#a855f7", dyRight: dyRight.factoryFric },
  ];

  // Regroupement par famille (ordre d'empilement vertical).
  const WA_LINES = LINES.filter((l) => l.name.includes("Wa"));
  const BAL_LINES = LINES.filter((l) => l.name.includes("Balance"));
  const WD_LINES = LINES.filter((l) => l.name.includes("Wd"));
  const FRIC_LINES = LINES.filter((l) => l.name.includes("Friction"));

  // Sous-graphique individuel (famille isolée). Sync global "piano".
  function SubChart({
    lines,
    withTopAxis,
  }: {
    lines: typeof LINES;
    withTopAxis?: boolean;
  }) {
    return (
      <div className="flex-1 h-full w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={data}
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
            {/* Échelle automatique respirante : dataMin - 3 → dataMax + 3. */}
            <YAxis
              width={0}
              tick={false}
              axisLine={false}
              tickLine={false}
              domain={["dataMin - 3", "dataMax + 3"]}
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
                dot={line.real ? sampleDot : false}
                isAnimationActive={false}
                label={makeEndLabel({
                  name: line.name,
                  avg: `${avg(line.dataKey)} g.`,
                  color: line.color,
                  count,
                  dyLeft: line.dyLeft,
                  dyRight: line.dyRight,
                })}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    );
  }

  return (
    <div className="w-full min-h-[650px] flex flex-col justify-between gap-8">
      {/* BLOC 1 : Wa (conserve l'axe supérieur DO). */}
      <SubChart lines={WA_LINES} withTopAxis />
      {/* BLOC 2 : Balance. */}
      <SubChart lines={BAL_LINES} />
      {/* BLOC 3 : Wd. */}
      <SubChart lines={WD_LINES} />
      {/* BLOC 4 : Friction. */}
      <SubChart lines={FRIC_LINES} />
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
