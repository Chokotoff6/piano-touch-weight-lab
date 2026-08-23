import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useRef, useState } from "react";
import { Button } from "@/components/ui/button";

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

const BLACK_KEYS = new Set([
  2, 5, 7, 10, 12, 14, 17, 19, 22, 24, 26, 29, 31, 34, 36, 38, 41, 43, 46,
  48, 50, 53, 55, 58, 60, 62, 65, 67, 70, 72, 74, 77, 79, 82, 84, 86,
]);

const NATURAL_KEY_BREAKS = new Set([
  3, 10, 15, 22, 27, 34, 39, 46, 51, 58, 63, 70, 75, 82, 87,
]);

const C_KEYS = new Set([4, 16, 28, 40, 52, 64, 76, 88]);

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

const BLACK_RATIO = 0.55;

function useSnappedGrid(from: number, to: number) {
  return useCallback(
    (node: HTMLDivElement | null) => {
      if (!node) return;
      const keys = Array.from({ length: to - from + 1 }, (_, i) => from + i);
      const snap = () => {
        const parent = node.parentElement;
        if (!parent) return;
        const avail =
          parent.getBoundingClientRect().width -
          (parent.firstElementChild?.getBoundingClientRect().width ?? 0);
        const dpr = window.devicePixelRatio || 1;
        const whites = keys.filter((k) => !BLACK_KEYS.has(k)).length;
        const v = avail / whites;
        const b = Math.round(v * BLACK_RATIO * dpr) / dpr;
        // widths so that every white key reads the same visible width v
        const raw = keys.map((k) => {
          if (BLACK_KEYS.has(k)) return b;
          const n =
            (BLACK_KEYS.has(k - 1) && keys.includes(k - 1) ? 1 : 0) +
            (BLACK_KEYS.has(k + 1) && keys.includes(k + 1) ? 1 : 0);
          return v - (n * b) / 2;
        });
        // snap cumulative edges to device pixels so all hairlines stay 1px
        let cum = 0;
        let prev = 0;
        const cols = raw.map((w) => {
          cum += w;
          const edge = Math.round(cum * dpr) / dpr;
          const width = edge - prev;
          prev = edge;
          return width;
        });
        node.style.gridTemplateColumns = cols.map((w) => `${w}px`).join(" ");
        node.style.setProperty("--black-col", `${b}px`);
        node.style.setProperty("--hairline", `${1 / dpr}px`);
      };
      snap();
      const ro = new ResizeObserver(snap);
      ro.observe(node.parentElement ?? node);
    },
    [from, to],
  );
}


function Index() {
  const [rows, setRows] = useState<Row[]>(EMPTY);
  const [info, setInfo] = useState<Record<string, string>>({});
  const inputs = useRef<Record<string, HTMLInputElement | null>>({});
  const gridRef1 = useSnappedGrid(1, 44);
  const gridRef2 = useSnappedGrid(45, 88);

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

  const formatResult = (value: string) => {
    if (!value) return null;
    const [integer, decimal] = value.split(".");
    return (
      <span className="whitespace-nowrap">
        {integer}
        <span className="text-[0.68em]">.{decimal}</span>
      </span>
    );
  };

  const renderSection = (from: number, to: number, gridRef: (n: HTMLDivElement | null) => void) => (
    <section className="mt-8" aria-label={`Touches ${from} à ${to}`}>
      <div className="technical-sheet">
        <div className="technical-labels" aria-hidden="true">
          <div className="label-key" />
          <div className="label-wa">Wa (gr)</div>
          <div className="label-wd">Wd (gr)</div>
          <div className="label-friction">Friction</div>
          <div className="label-balance">Balance</div>
        </div>
        <div className="piano-grid" ref={gridRef}>
          {rows.slice(from - 1, to).map((row, offset) => {
            const index = from - 1 + offset;
            const black = BLACK_KEYS.has(index + 1);
            const leftBlack = !black && BLACK_KEYS.has(index);
            const rightBlack = !black && BLACK_KEYS.has(index + 2);
            const shift = leftBlack === rightBlack ? "" : leftBlack ? "shift-left" : "shift-right";
            const { friction, balance } = compute(row);
            return (
              <div
                key={index}
                className={`piano-measure-column ${black ? "is-black" : "is-white"} ${shift} ${NATURAL_KEY_BREAKS.has(index + 1) ? "natural-key-break" : ""}`}
              >
                <div className={`key-number ${C_KEYS.has(index + 1) ? "is-c-key" : ""}`}>
                  {index + 1}
                </div>
                <div className="key-body">
                  <div className="weight-fields">
                  <input
                    ref={(el) => {
                      inputs.current[`${index}-wa`] = el;
                    }}
                    value={row.wa}
                    onChange={(e) => setValue(index, "wa", e.target.value)}
                    onKeyDown={(e) => onKeyDown(e, index, "wa")}
                    inputMode="decimal"
                    aria-label={`Wa touche ${index + 1}`}
                    className="weight-input"
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
                    className="weight-input"
                  />
                  </div>
                </div>
                <div className="result-cell result-friction">
                  {formatResult(friction)}
                </div>
                <div className="result-cell result-balance">
                  {formatResult(balance)}
                </div>
              </div>
            );
          })}
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
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setRows(EMPTY)}
            className="text-xs"
          >
            RESET
          </Button>
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

      {renderSection(1, 44, gridRef1)}
      {renderSection(45, 88, gridRef2)}
    </main>
  );
}
