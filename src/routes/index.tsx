import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useMemo, useRef, useState } from "react";
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

const BLACK_RATIO = 0.605;

// décalages réels des touches noires (en largeur de touche blanche),
// mesurés depuis la séparation entre les deux blanches voisines
const BLACK_OFFSET: Record<number, number> = {
  1: 0, // do#
  3: 0, // ré#
  6: 0, // fa#
  8: 0, // sol#
  10: 0, // la#
};


const pitchClass = (key: number) => (key + 20) % 12;

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
        const px = (n: number) => Math.round(n * dpr) / dpr;
        const whites = keys.filter((k) => !BLACK_KEYS.has(k)).length;
        // largeur blanche visible identique pour toutes les touches
        const v = Math.floor((avail * dpr) / whites) / dpr;
        const b = (2 * Math.round((v * BLACK_RATIO * dpr) / 2)) / dpr;

        // bornes visibles des blanches + centres décalés des noires
        let whiteIdx = 0;
        const meta = keys.map((k) => {
          if (BLACK_KEYS.has(k)) {
            const boundary = px(whiteIdx * v);
            const center = boundary + (BLACK_OFFSET[pitchClass(k)] ?? 0) * v;
            const start = px(center - b / 2);
            return { black: true, boundary, start, end: start + b };
          }

          const i = whiteIdx++;
          return { black: false, boundary: 0, start: px(i * v), end: px((i + 1) * v) };
        });

        // colonnes : les blanches absorbent la place prise par les noires
        const cols = meta.map((m, i) => {
          if (m.black) return { start: m.start, end: m.end };
          const prev = meta[i - 1];
          const next = meta[i + 1];
          return {
            start: prev?.black ? prev.end : m.start,
            end: next?.black ? next.start : m.end,
          };
        });

        // bord droit de la dernière touche blanche visible
        const lastWhiteIdx = meta.reduce((last, m, i) => (m.black ? last : i), -1);
        const lastCol = cols[lastWhiteIdx >= 0 ? lastWhiteIdx : cols.length - 1];
        const resultRight = lastCol?.end ?? cols[cols.length - 1]!.end;

        const template = cols.map((c) => `${c.end - c.start}px`).join(" ");
        node.style.gridTemplateColumns = template;
        node.style.setProperty("--black-col", `${b}px`);
        node.style.setProperty("--white-col", `${v}px`);
        node.style.setProperty("--hairline", `${1 / dpr}px`);
        node.style.setProperty("--result-right", `${px(resultRight)}px`);

        const applyVars = (container: HTMLElement) => {
          Array.from(container.children).forEach((child, i) => {
            const el = child as HTMLElement;
            const m = meta[i];
            const c = cols[i];
            if (!m || !c) return;
            if (m.black) {
              el.style.setProperty("--line-x", `${px(m.boundary - c.start)}px`);
              el.style.removeProperty("--shift");
              el.style.removeProperty("--wstart");
            } else {
              el.style.setProperty(
                "--shift",
                `${px((m.start + m.end) / 2 - (c.start + c.end) / 2)}px`,
              );
              const ws = px(m.start - c.start);
              el.style.setProperty("--wstart", `${ws}px`);
              el.style.setProperty("--sep", ws < 0 ? "0px" : "var(--hairline, 1px)");

              el.style.removeProperty("--line-x");
            }
          });
        };

        node
          .closest("section")
          ?.querySelectorAll<HTMLElement>(".result-grid")
          .forEach((g) => {
            g.style.gridTemplateColumns = template;
            g.style.setProperty("--hairline", `${1 / dpr}px`);
            g.style.setProperty("--white-col", `${v}px`);
            g.style.setProperty("--black-col", `${b}px`);
            g.style.setProperty("--result-right", `${px(resultRight)}px`);
            applyVars(g);
          });

        applyVars(node);

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

  const sectionAverages = useMemo(() => {
    const calc = (slice: Row[]) => {
      const valid = slice.filter((r) => {
        const wa = parseFloat(r.wa);
        const wd = parseFloat(r.wd);
        return !Number.isNaN(wa) && !Number.isNaN(wd);
      });
      if (valid.length === 0) {
        return { wa: "—", wd: "—", friction: "—", balance: "—", count: 0 };
      }
      const avgWa = valid.reduce((s, r) => s + parseFloat(r.wa), 0) / valid.length;
      const avgWd = valid.reduce((s, r) => s + parseFloat(r.wd), 0) / valid.length;
      return {
        wa: avgWa.toFixed(1),
        wd: avgWd.toFixed(1),
        friction: ((avgWd - avgWa) / 2).toFixed(1),
        balance: ((avgWd + avgWa) / 2).toFixed(1),
        count: valid.length,
      };
    };
    return { first: calc(rows.slice(0, 44)), second: calc(rows.slice(44, 88)) };
  }, [rows]);

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
        <span className="text-[0.82em]">.{decimal}</span>
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
          <div className="label-wa-white">Wa (gr)</div>
          <div className="label-wd-white">Wd (gr)</div>
        </div>
        <div className="piano-grid" ref={gridRef}>
          {rows.slice(from - 1, to).map((row, offset) => {
            const index = from - 1 + offset;
            const black = BLACK_KEYS.has(index + 1);
            const leftBlack = !black && BLACK_KEYS.has(index);
            const rightBlack = !black && BLACK_KEYS.has(index + 2);
            const shift = leftBlack === rightBlack ? "" : leftBlack ? "shift-left" : "shift-right";
            return (
              <div
                key={index}
                className={`piano-measure-column ${black ? "is-black" : "is-white"} ${shift} ${NATURAL_KEY_BREAKS.has(index + 1) ? "natural-key-break" : ""} ${index + 1 === to ? "is-last-key" : ""}`}
              >
                <div className={`key-number ${C_KEYS.has(index + 1) ? "is-c-key" : ""}`}>
                  {index + 1}
                </div>
                <div className="key-body">
                  <div className="weight-fields weight-fields-wa">
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
                  </div>
                  <div className="weight-fields weight-fields-wd">
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
              </div>
            );
          })}
        </div>
      </div>
      {(["friction", "balance"] as const).map((kind) => (
        <div className="result-sheet" key={kind}>
          <div className="result-label">{kind === "friction" ? "Friction" : "Balance"}</div>
          <div className="result-grid">
            {rows.slice(from - 1, to).map((row, offset) => {
              const index = from - 1 + offset;
              const black = BLACK_KEYS.has(index + 1);
              const value = compute(row)[kind];
              return (
                <div key={index} className={`result-col ${black ? "is-black" : "is-white"}`}>
                  <div className="result-strip">{black ? formatResult(value) : null}</div>
                  <div className="result-value">
                    <span className="rv-text">{black ? null : formatResult(value)}</span>
                  </div>
                </div>

              );
            })}
          </div>
        </div>
      ))}
    </section>
  );

  return (
    <main className="mx-auto max-w-[1400px] px-6 py-10">
      <h1 className="text-xl font-semibold">Instrument details</h1>
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

      <section className="mt-8 rounded-md border-2 border-foreground bg-card p-4">
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
        <div className="mt-4 border-t border-border pt-3">
          <p className="text-xs font-medium text-muted-foreground">
            Moyennes ({averages.count} touche{averages.count > 1 ? "s" : ""} mesurée
            {averages.count > 1 ? "s" : ""})
          </p>
          <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded bg-muted px-2 py-1.5 text-center">
              <div className="text-[0.65rem] uppercase tracking-wide text-muted-foreground">Wa</div>
              <div className="text-sm font-semibold tabular-nums">{averages.wa}</div>
            </div>
            <div className="rounded bg-muted px-2 py-1.5 text-center">
              <div className="text-[0.65rem] uppercase tracking-wide text-muted-foreground">Wd</div>
              <div className="text-sm font-semibold tabular-nums">{averages.wd}</div>
            </div>
            <div className="rounded bg-muted px-2 py-1.5 text-center">
              <div className="text-[0.65rem] uppercase tracking-wide text-muted-foreground">Friction</div>
              <div className="text-sm font-semibold tabular-nums">{averages.friction}</div>
            </div>
            <div className="rounded bg-muted px-2 py-1.5 text-center">
              <div className="text-[0.65rem] uppercase tracking-wide text-muted-foreground">Balance</div>
              <div className="text-sm font-semibold tabular-nums">{averages.balance}</div>
            </div>
          </div>
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
