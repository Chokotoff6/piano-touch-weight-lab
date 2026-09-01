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

// --- Moteur graphique (BLOC 2) ---------------------------------------------
// Positions X des touches DO sur le clavier (1..88).
const DO_POSITIONS = [4, 16, 28, 40, 52, 64, 76, 88];

// Données fictives temporaires : courbe de Wa décroissante réaliste
// (~52 g dans le grave → ~34 g dans l'aigu), Wd et dérivés calculés.
type ChartPoint = {
  key: number;
  waCur: number;
  wdCur: number;
  balCur: number;
  fricCur: number;
};

function buildMockData(): ChartPoint[] {
  const points: ChartPoint[] = [];
  for (let k = 1; k <= 88; k++) {
    const t = (k - 1) / 87;
    const wa = 52 - 18 * t + Math.sin(k * 0.7) * 1.2;
    const wd = wa - 12 - Math.cos(k * 0.5) * 0.8;
    const bal = (wa + wd) / 2;
    const fric = (wa - wd) / 2;
    points.push({
      key: k,
      waCur: Number(wa.toFixed(1)),
      wdCur: Number(wd.toFixed(1)),
      balCur: Number(bal.toFixed(1)),
      fricCur: Number(fric.toFixed(1)),
    });
  }
  return points;
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

// Ordre décroissant des familles de courbes dans le tooltip :
// Wa → Balance → Wd → Friction (du plus haut niveau de pesée vers le bas).
const TOOLTIP_GROUP_RANK: Record<string, number> = {
  "Wa actuel": 0,
  "Same models Wa": 0,
  "Std Wa": 0,
  "Balance actuelle": 1,
  "Same models Balance": 1,
  "Std Bal.": 1,
  "Wd actuel": 2,
  "Same models Wd": 2,
  "Std Wd": 2,
  "Friction actuelle": 3,
  "Same models Friction": 3,
  "Std Friction": 3,
};

type TooltipEntry = {
  name?: string;
  value?: number;
  color?: string;
};

function CustomTooltipContent(props: {
  active?: boolean;
  payload?: TooltipEntry[];
  label?: number;
}) {
  const { active, payload, label } = props;
  if (!active || !payload || payload.length === 0) return null;
  const sorted = [...payload].sort((a, b) => {
    const ra = TOOLTIP_GROUP_RANK[a.name ?? ""] ?? 99;
    const rb = TOOLTIP_GROUP_RANK[b.name ?? ""] ?? 99;
    if (ra !== rb) return ra - rb;
    return (b.value ?? 0) - (a.value ?? 0);
  });
  return (
    <div className="rounded-md border border-gray-200 bg-white/95 px-3 py-2 text-xs shadow-md">
      <div className="mb-1 font-bold text-gray-800">Touche {label}</div>
      {sorted.map((entry) => (
        <div key={entry.name} className="flex items-center justify-between gap-4">
          <span style={{ color: entry.color }}>{entry.name}</span>
          <span className="font-semibold tabular-nums text-gray-800">
            {typeof entry.value === "number" ? entry.value.toFixed(1) : entry.value} g.
          </span>
        </div>
      ))}
    </div>
  );
}

function ComparisonChart() {
  // Données mock en attendant le branchement réel (piano actuel uniquement).
  const [data] = useState<ChartPoint[]>(buildMockData);
  // Domaine vertical live : max de Wa du piano actuel + 1.
  const maxWaLive = data.reduce((m, p) => Math.max(m, p.waCur), 0);

  return (
    <div className="w-full" style={{ height: 380 }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 120, bottom: 15, left: 120 }}>
          {/* Axe X principal : 1..88, graduations standards du bas masquées. */}
          <XAxis
            xAxisId="main"
            dataKey="key"
            type="number"
            domain={[1, 88]}
            hide
          />
          {/* Axe X supérieur : repères des touches DO uniquement. */}
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
          {/* Axe Y totalement invisible mais actif (zéro écran blanc) :
              jamais de domain={[]} ni de ticks={[]} vides. */}
          <YAxis
            width={0}
            tick={false}
            axisLine={false}
            tickLine={false}
            domain={[0, maxWaLive + 1]}
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
          {/* Courbes du piano actuel (mock). */}
          <Line xAxisId="main" type="monotone" dataKey="waCur" name="Wa actuel" stroke="#111827" strokeWidth={2} dot={false} isAnimationActive={false} />
          <Line xAxisId="main" type="monotone" dataKey="balCur" name="Balance actuelle" stroke="#3b82f6" strokeWidth={1.5} dot={false} isAnimationActive={false} />
          <Line xAxisId="main" type="monotone" dataKey="wdCur" name="Wd actuel" stroke="#9ca3af" strokeWidth={1.5} dot={false} isAnimationActive={false} />
          <Line xAxisId="main" type="monotone" dataKey="fricCur" name="Friction actuelle" stroke="#ef4444" strokeWidth={1.5} dot={false} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
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
          {/* Emplacement réservé au futur graphique (aucun Recharts pour l'instant). */}
          <div
            className="mb-6 rounded-md border-2 border-dashed border-border bg-muted/30 p-6 text-center text-sm text-muted-foreground"
            aria-label="Emplacement réservé au graphique"
          >
            Graphique — à venir
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
