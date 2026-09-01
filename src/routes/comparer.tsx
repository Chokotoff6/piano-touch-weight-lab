import { createFileRoute } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";

// ---------------------------------------------------------------------------
// Page de comparaison — architecture + grille visuelle uniquement.
// Aucun graphique Recharts, aucune connexion base de données pour l'instant.
// Toutes les valeurs sont à "—" (absence de données) tant qu'aucune source
// de comparaison n'est chargée. Le panneau de filtres reste masqué par défaut.
// ---------------------------------------------------------------------------

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
