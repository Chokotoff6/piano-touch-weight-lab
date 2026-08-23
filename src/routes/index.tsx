import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useRef, useState } from "react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Touchweight statique piano — Wa / Wd, friction, balance" },
      {
        name: "description",
        content:
          "Outil de relevé du touchweight statique : saisie des poids ascendant et descendant des 88 touches, calcul automatique de la friction et de la balance.",
      },
      { property: "og:title", content: "Touchweight statique piano" },
      {
        property: "og:description",
        content:
          "Consignez Wa et Wd sur 88 touches et obtenez friction et balance instantanément.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

// A0 = touche 1. Motif chromatique des noires.
const BLACK_IN_OCTAVE = new Set([1, 4, 6, 9, 11]); // demi-tons depuis Do
function isBlack(keyIndex: number) {
  // A0 correspond au demi-ton 9 (La)
  const semitone = (9 + (keyIndex - 1)) % 12;
  return BLACK_IN_OCTAVE.has(semitone);
}

type Row = { wa: string; wd: string };

const EMPTY: Row[] = Array.from({ length: 88 }, () => ({ wa: "", wd: "" }));

const INFO_FIELDS = [
  { key: "date", label: "Date" },
  { key: "marque", label: "Marque" },
  { key: "modele", label: "Modèle" },
  { key: "sn", label: "Numéro de série (SN)" },
  { key: "fabrication", label: "Date de fabrication" },
  { key: "remarques", label: "Remarques" },
] as const;

function Index() {
  const [rows, setRows] = useState<Row[]>(EMPTY);
  const [info, setInfo] = useState<Record<string, string>>({});
  const inputs = useRef<Record<string, HTMLInputElement | null>>({});

  const focusCell = (index: number, field: "wa" | "wd") => {
    inputs.current[`${index}-${field}`]?.focus();
    inputs.current[`${index}-${field}`]?.select();
  };

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent, index: number, field: "wa" | "wd") => {
      if (e.key !== "Enter") return;
      e.preventDefault();
      if (field === "wa") focusCell(index, "wd");
      else if (index < 87) focusCell(index + 1, "wa");
    },
    [],
  );

  const setValue = (index: number, field: "wa" | "wd", value: string) =>
    setRows((prev) => prev.map((r, i) => (i === index ? { ...r, [field]: value } : r)));

  const compute = (r: Row) => {
    const wa = parseFloat(r.wa);
    const wd = parseFloat(r.wd);
    if (Number.isNaN(wa) || Number.isNaN(wd)) return { friction: "", balance: "" };
    return {
      friction: ((wd - wa) / 2).toFixed(1),
      balance: ((wd + wa) / 2).toFixed(1),
    };
  };

  const renderSection = (from: number, to: number, title: string) => (
    <section className="mt-8">
      <h2 className="mb-2 text-sm font-medium text-muted-foreground">{title}</h2>
      <div className="w-full overflow-hidden rounded-md border border-border bg-card p-2 sm:p-3">
        <div className="flex w-full items-start">
          <div className="w-14 shrink-0 border-r border-border pr-2 text-right text-[9px] font-medium text-muted-foreground sm:w-20 sm:text-[11px]">
            <div className="h-4 leading-4">Touche</div>
            <div className="mt-1 h-7 leading-7">Wa (gr)</div>
            <div className="mt-1 h-7 leading-7">Wd (gr)</div>
            <div className="mt-1 h-5 leading-5">Friction</div>
            <div className="mt-1 h-5 leading-5">Balance</div>
          </div>
          <div className="flex min-w-0 flex-1">
          {rows.slice(from - 1, to).map((row, offset) => {
            const index = from - 1 + offset;
            const black = isBlack(index + 1);
            const { friction, balance } = compute(row);
            return (
              <div
                key={index}
                className="flex min-w-0 flex-1 flex-col items-center"
              >
                <div className="h-4 w-full overflow-hidden text-center text-[8px] leading-4 tabular-nums text-muted-foreground sm:text-[10px]">
                  {index + 1}
                </div>
                <input
                  ref={(el) => {
                    inputs.current[`${index}-wa`] = el;
                  }}
                  value={row.wa}
                  onChange={(e) => setValue(index, "wa", e.target.value)}
                  onKeyDown={(e) => onKeyDown(e, index, "wa")}
                  inputMode="decimal"
                  aria-label={`Wa touche ${index + 1}`}
                  className="mt-1 h-7 w-full min-w-0 rounded-sm border border-input bg-background p-0 text-center text-[8px] tabular-nums outline-none focus:relative focus:z-20 focus:border-ring focus:ring-1 focus:ring-ring sm:text-[10px]"
                />
                <input
                  ref={(el) => {
                    inputs.current[`${index}-wd`] = el;
                  }}
                  value={row.wd}
                  onChange={(e) => setValue(index, "wd", e.target.value)}
                  onKeyDown={(e) => onKeyDown(e, index, "wd")}
                  inputMode="decimal"
                  aria-label={`Wd touche ${index + 1}`}
                  className="mt-1 h-7 w-full min-w-0 rounded-sm border border-input bg-background p-0 text-center text-[8px] tabular-nums outline-none focus:relative focus:z-20 focus:border-ring focus:ring-1 focus:ring-ring sm:text-[10px]"
                />
                <div className="mt-1 h-5 w-full overflow-hidden rounded-sm bg-muted text-center text-[8px] leading-5 tabular-nums text-muted-foreground sm:text-[10px]">
                  {friction}
                </div>
                <div className="mt-1 h-5 w-full overflow-hidden rounded-sm bg-muted text-center text-[8px] leading-5 tabular-nums text-muted-foreground sm:text-[10px]">
                  {balance}
                </div>
                <div className="relative mt-2 h-[clamp(72px,12vw,120px)] w-full">
                  <div className="absolute inset-0 rounded-b-sm border border-border bg-background" />
                  {black && (
                    <div className="absolute left-[-35%] top-0 z-10 h-2/3 w-[70%] rounded-b-sm bg-foreground" />
                  )}
                </div>
              </div>
            );
          })}
          </div>
        </div>
      </div>
    </section>
  );

  return (
    <main className="mx-auto max-w-[1400px] px-6 py-10">
      <h1 className="text-xl font-semibold">Évaluation du touchweight statique pour piano</h1>
      <div className="mt-4 max-w-3xl space-y-3 text-sm leading-relaxed text-muted-foreground">
        <p>
          Bienvenue sur l'outil d'évaluation du touchweight statique pour piano. Cet outil permet de
          consigner les mesures de poids ascendant (Wa) et descendant (Wd) afin de calculer la
          friction et la balance mécanique de chaque touche.
        </p>
        <p className="font-medium text-foreground">Mode d'emploi :</p>
        <ol className="list-decimal space-y-1 pl-5">
          <li>Placez le curseur sur la case « Wa » de la première touche.</li>
          <li>
            Saisissez la valeur en grammes, puis appuyez sur « Entrée » : le curseur descend sur la
            case « Wd » de la même touche.
          </li>
          <li>
            Saisissez la valeur « Wd », puis appuyez sur « Entrée » : le curseur se déplace sur la
            case « Wa » de la touche suivante.
          </li>
        </ol>
      </div>

      <section className="mt-8 rounded-md border border-border bg-card p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium">Informations générales</h2>
          <button
            onClick={() => setRows(EMPTY)}
            className="rounded-md border border-input px-3 py-1.5 text-xs font-medium transition-colors hover:bg-accent"
          >
            RESET
          </button>
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {INFO_FIELDS.map((f) => (
            <label key={f.key} className="text-xs text-muted-foreground">
              {f.label}
              <input
                value={info[f.key] ?? ""}
                onChange={(e) => setInfo((p) => ({ ...p, [f.key]: e.target.value }))}
                className="mt-1 h-8 w-full rounded border border-input bg-background px-2 text-sm text-foreground outline-none focus:border-ring focus:ring-1 focus:ring-ring"
              />
            </label>
          ))}
        </div>
      </section>

      <div className="mt-6 flex gap-4 text-xs text-muted-foreground">
        <span>Friction = (Wd − Wa) / 2</span>
        <span>Balance = (Wd + Wa) / 2</span>
      </div>

      {renderSection(1, 51, "Section 1 — touches 1 à 51")}
      {renderSection(52, 88, "Section 2 — touches 52 à 88")}
    </main>
  );
}
