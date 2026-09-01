import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
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
// Page de comparaison — architecture, grille visuelle et moteur graphique.
// Aucune connexion base de données pour l'instant : les courbes utilisent des
// données fictives temporaires (mock) en attendant le branchement réel.
// Le panneau de filtres reste masqué par défaut.
// ---------------------------------------------------------------------------

// --- Moteur graphique (BLOCS 2 + 3) -----------------------------------------
// Positions X des touches DO sur le clavier (1..88).
const DO_POSITIONS = [4, 16, 28, 40, 52, 64, 76, 88];

// 15 notes réelles échantillonnées de la matrice (index des cellules 0..14).
const SAMPLE_NOTES = [4, 10, 16, 22, 28, 34, 40, 46, 52, 58, 64, 70, 76, 82, 88];
// Touches noires parmi les notes échantillonnées.
const BLACK_NOTES = new Set([10, 22, 34, 46, 58, 70, 82]);
const isBlackKey = (key: number) => BLACK_NOTES.has(key);

type KeyFilter = "all" | "white" | "black";

const KEY_FILTERS: Array<{ id: KeyFilter; label: string }> = [
  { id: "all", label: "Toutes les touches" },
  { id: "white", label: "Touches Blanches ⚪" },
  { id: "black", label: "Touches Noires ⚫" },
];

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

type MetricFamily = "wa" | "bal" | "wd" | "fric";

// ---------------------------------------------------------------------------
// Chargement des profils réels depuis la base (table piano_profiles) :
//  - serial_number = 'MOCK-MON-PIANO' → courbes "Mon piano" (noires)
//  - serial_number = 'MOCK-WITNESS'   → série "Same model(s)" (orange)
// Les 15 cellules des matrices wa/wd/friction/balance correspondent aux
// notes SAMPLE_NOTES. Les références Std / Factory sont dérivées du témoin.
// ---------------------------------------------------------------------------
type PianoProfileRow = {
  serial_number: string;
  wa_values: number[];
  wd_values: number[];
  friction_values: number[];
  balance_values: number[];
};

async function fetchProfiles(): Promise<PianoProfileRow[]> {
  const { data, error } = await supabase
    .from("piano_profiles")
    .select("serial_number, wa_values, wd_values, friction_values, balance_values")
    .in("serial_number", ["MOCK-MON-PIANO", "MOCK-WITNESS"]);
  if (error) throw error;
  return (data ?? []) as unknown as PianoProfileRow[];
}

// Construit les points du graphique à partir des profils réels.
function buildRealData(cur: PianoProfileRow, same: PianoProfileRow): ChartPoint[] {
  const n = (v: number) => Number(v.toFixed(1));
  return SAMPLE_NOTES.map((key, i) => {
    const wa = Number(cur.wa_values[i]);
    const wd = Number(cur.wd_values[i]);
    const fric = Number(cur.friction_values[i]);
    const bal = Number(cur.balance_values[i]);
    const sameWa = Number(same.wa_values[i]);
    const sameWd = Number(same.wd_values[i]);
    const sameFric = Number(same.friction_values[i]);
    const sameBal = Number(same.balance_values[i]);
    return {
      key,
      waCur: n(wa),
      sameWa: n(sameWa),
      stdWa: n(sameWa - 2.5),
      wdCur: n(wd),
      balCur: n(bal),
      fricCur: n(fric),
      sameWd: n(sameWd),
      stdWd: n(sameWd - 2.5),
      sameBal: n(sameBal),
      factoryBal: n(sameBal - 2.0),
      sameFric: n(sameFric),
      factoryFric: n(sameFric - 2.0),
    };
  });
}

// Données de repli (mock) si les profils ne sont pas encore disponibles.
function buildMockData(): ChartPoint[] {
  const points: ChartPoint[] = [];
  for (const k of SAMPLE_NOTES) {
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

// Moyenne d'une série (affichée comme valeur moyenne au flanc droit).
function seriesAverage(data: ChartPoint[], key: keyof Omit<ChartPoint, "key">): string {
  const sum = data.reduce((acc, p) => acc + (p[key] as number), 0);
  return (sum / data.length).toFixed(1);
}

// Pastilles noires calibrées (r = 2) sur chacun des 15 points réels
// de la matrice — réservées aux courbes "Mon piano".
const SAMPLE_DOT_CONFIG = { r: 2, fill: "#000000", strokeWidth: 0 };

// Étiquettes d'extrémité compressées :
//  - Flanc gauche (index 0)   : nom brut du groupe ("Wa", "Bal.", ...), textAnchor="end", x - 10.
//  - Flanc droit (index max)  : "Moy: xx.xg", textAnchor="start", x + 10.
//  - dy = 4 fixe (pile en face de l'axe de la courbe), sans décalage complexe.
type EndLabelOptions = {
  shortName: string;
  avg: string;
  color: string;
  count: number;
  // Décalage vertical du flanc droit (aération 0 / 14 / 28 si moyennes < 1,2 g).
  dyRight?: number;
};

function makeEndLabel(opts: EndLabelOptions) {
  const EndLabel = (props: { x?: number; y?: number; index?: number }) => {
    const { x = 0, y = 0, index = -1 } = props;
    if (index === 0) {
      const dy = 4;
      return (
        <text x={x - 10} y={y} dy={dy} textAnchor="end" fontSize={11} fontWeight={600} fill={opts.color}>
          {opts.shortName}
        </text>
      );
    }
    if (index === opts.count - 1) {
      const dy = 4 + (opts.dyRight ?? 0);
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
  // Profils réels chargés depuis la base ; repli mock si indisponibles.
  const { data: profiles } = useQuery({
    queryKey: ["piano-profiles", "mock"],
    queryFn: fetchProfiles,
    staleTime: 5 * 60_000,
  });
  const data = useMemo<ChartPoint[]>(() => {
    const cur = profiles?.find((p) => p.serial_number === "MOCK-MON-PIANO");
    const same = profiles?.find((p) => p.serial_number === "MOCK-WITNESS");
    if (cur && same) return buildRealData(cur, same);
    return buildMockData();
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
  // Noms officiels dépouillés des suffixes de famille (le titre du bloc
  // indique déjà la mesure) : "Actuel", "Same models", "Std" / "Factory".
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
    { dataKey: "stdWa", name: "Std", shortName: "Std", color: "#10b981", family: "wa" },
    { dataKey: "balCur", name: "Mon piano Balance", shortName: "Mon piano", color: "#000000", family: "bal", real: true },
    { dataKey: "sameBal", name: "Same model(s)", shortName: "Same model(s)", color: "#f97316", family: "bal" },
    { dataKey: "factoryBal", name: "Factory", shortName: "Factory", color: "#10b981", family: "bal" },
    { dataKey: "wdCur", name: "Mon piano Wd", shortName: "Mon piano", color: "#000000", family: "wd", real: true },
    { dataKey: "sameWd", name: "Same model(s)", shortName: "Same model(s)", color: "#f97316", family: "wd" },
    { dataKey: "stdWd", name: "Std", shortName: "Std", color: "#10b981", family: "wd" },
    { dataKey: "fricCur", name: "Mon piano Friction", shortName: "Mon piano", color: "#000000", family: "fric", real: true },
    { dataKey: "sameFric", name: "Same model(s)", shortName: "Same model(s)", color: "#f97316", family: "fric" },
    { dataKey: "factoryFric", name: "Factory", shortName: "Factory", color: "#10b981", family: "fric" },
  ];

  // Sécurité flanc droit : si les 3 moyennes d'une famille sont espacées de
  // moins de 1,2 g, on aère verticalement les étiquettes (dy = 0 / 14 / 28).
  function dyRightFor(lines: typeof LINES): Map<string, number> {
    const map = new Map<string, number>();
    const entries = lines.map((l) => ({ key: l.dataKey, v: Number(avg(l.dataKey)) }));
    const sorted = [...entries].sort((a, b) => a.v - b.v);
    if (sorted.length >= 2 && sorted[sorted.length - 1]!.v - sorted[0]!.v < 1.2) {
      // Ordre décroissant : la moyenne la plus haute reste à dy 0, etc.
      [...entries]
        .sort((a, b) => b.v - a.v)
        .forEach((e, i) => map.set(e.key, i * 14));
    }
    return map;
  }

  // Regroupement par famille (ordre d'empilement vertical).
  const WA_LINES = LINES.filter((l) => l.family === "wa");
  const BAL_LINES = LINES.filter((l) => l.family === "bal");
  const WD_LINES = LINES.filter((l) => l.family === "wd");
  const FRIC_LINES = LINES.filter((l) => l.family === "fric");

  // Sous-graphique individuel (famille isolée). Sync global "piano".
  function SubChart({
    lines,
    withTopAxis,
    yDomain,
  }: {
    lines: typeof LINES;
    withTopAxis?: boolean;
    yDomain: [string, string];
  }) {
    const dyRight = dyRightFor(lines);
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
