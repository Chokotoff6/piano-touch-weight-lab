// Miroir hors écran du cadre « Mesures poids statiques » et du bloc
// « Moyennes » de la page Saisie. Il permet à la page Comparer de produire
// les pages 1 à 3 du rapport PDF sans dépendre de l'écran de saisie.
import { useCallback, type ReactNode } from "react";

const BLACK_KEYS = new Set([
  2, 5, 7, 10, 12, 14, 17, 19, 22, 24, 26, 29, 31, 34, 36, 38, 41, 43, 46, 48, 50, 53, 55, 58, 60,
  62, 65, 67, 70, 72, 74, 77, 79, 82, 84, 86,
]);
const NATURAL_KEY_BREAKS = new Set([3, 10, 15, 22, 27, 34, 39, 46, 51, 58, 63, 70, 75, 82, 87]);
const C_KEYS = new Set([4, 16, 28, 40, 52, 64, 76, 88]);
const BLACK_RATIO = 0.605;
const BLACK_OFFSET: Record<number, number> = { 1: 0, 3: 0, 6: 0, 8: 0, 10: 0 };
const pitchClass = (key: number) => (key + 20) % 12;

const FRAME_CLASS = "relative rounded-md border-2 border-foreground bg-card p-4 pt-5";
const FRAME_TITLE_CLASS = "absolute -top-3.5 left-4 bg-card px-2 text-lg font-bold text-black";
const SIDE_LABEL_CLASS = "min-w-[120px] w-32 text-right";

/** Copie stricte du calcul de colonnes de la page Saisie (alignement pixel). */
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
        const v = Math.floor((avail * dpr) / whites) / dpr;
        const b = (2 * Math.round((v * BLACK_RATIO * dpr) / 2)) / dpr;

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

        const cols = meta.map((m, i) => {
          if (m.black) return { start: m.start, end: m.end };
          const prev = meta[i - 1];
          const next = meta[i + 1];
          return {
            start: prev?.black ? prev.end : m.start,
            end: next?.black ? next.start : m.end,
          };
        });

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

type Cell = { wa: string; wd: string; friction: string; balance: string };

function buildCells(wa: (number | undefined)[], wd: (number | undefined)[]): Cell[] {
  return Array.from({ length: 88 }, (_, i) => {
    const a = wa[i];
    const d = wd[i];
    const valid =
      typeof a === "number" && Number.isFinite(a) && typeof d === "number" && Number.isFinite(d) && a > d;
    return {
      wa: typeof a === "number" && Number.isFinite(a) ? String(Math.round(a)) : "",
      wd: typeof d === "number" && Number.isFinite(d) ? String(Math.round(d)) : "",
      friction: valid ? ((a - d) / 2).toFixed(1) : "",
      balance: valid ? ((a + d) / 2).toFixed(1) : "",
    };
  });
}

function formatResult(value: string): ReactNode {
  if (!value) return null;
  const [integer, decimal] = value.split(".");
  return (
    <span className="whitespace-nowrap">
      {integer}
      <span className="text-[0.82em]">.{decimal}</span>
    </span>
  );
}

function formatAverage(value: string): ReactNode {
  if (value === "—") return <span className="!text-2xl">—</span>;
  const [integer, decimal] = value.split(".");
  return (
    <>
      {integer}
      <span className="!text-2xl">.{decimal}</span>
    </>
  );
}

type Avg = { wa: string; wd: string; friction: string; balance: string };

function average(cells: Cell[]): Avg {
  const valid = cells
    .map((c) => ({ wa: Number(c.wa), wd: Number(c.wd) }))
    .filter((e) => Number.isFinite(e.wa) && Number.isFinite(e.wd) && e.wa > e.wd && e.wd > 0);
  if (valid.length === 0) return { wa: "—", wd: "—", friction: "—", balance: "—" };
  const avgWa = valid.reduce((s, e) => s + e.wa, 0) / valid.length;
  const avgWd = valid.reduce((s, e) => s + e.wd, 0) / valid.length;
  return {
    wa: avgWa.toFixed(1),
    wd: avgWd.toFixed(1),
    friction: ((avgWa - avgWd) / 2).toFixed(1),
    balance: ((avgWa + avgWd) / 2).toFixed(1),
  };
}



function Section({
  from,
  to,
  cells,
}: {
  from: number;
  to: number;
  cells: Cell[];
}) {
  const gridRef = useSnappedGrid(from, to);
  return (
    <section className="mt-2 flex w-full flex-col items-center" aria-label={`Touches ${from} à ${to}`}>
      <div className="technical-sheet">
        <div className={`technical-labels ${SIDE_LABEL_CLASS}`} aria-hidden="true">
          <div className="label-key" />
          <div className="label-wa">Poids descendant</div>
          <div className="label-wd">Poids remontant</div>
          <div className="label-wa-white">Poids descendant</div>
          <div className="label-wd-white">Poids remontant</div>
        </div>
        <div className="piano-grid" ref={gridRef}>
          {cells.slice(from - 1, to).map((cell, offset) => {
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
                  {(["wa", "wd"] as const).map((field) => (
                    <div key={field} className={`weight-fields weight-fields-${field}`}>
                      <span
                        className="weight-input !font-sans"
                        style={{
                          display: "block",
                          textAlign: "center",
                          textAlignLast: "center",
                          width: "100%",
                          padding: "0px",
                          margin: "0px",
                          fontWeight: "bold",
                          color: "#000000",
                          backgroundColor: "#cbd5e1",
                        }}
                      >
                        {cell[field]}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <div data-pdf-result-frame className="w-full h-auto max-h-none overflow-visible opacity-100 pointer-events-none">
        {(["friction", "balance"] as const).map((kind) => (
          <div className="result-sheet" key={kind}>
            <div className={`result-label ${SIDE_LABEL_CLASS}`}>
              {kind === "friction" ? "Friction" : "Poids d'équilibre"}
            </div>
            <div className="result-grid">
              {cells.slice(from - 1, to).map((cell, offset) => {
                const index = from - 1 + offset;
                const black = BLACK_KEYS.has(index + 1);
                const value = cell[kind];
                return (
                  <div key={index} className={`result-col ${black ? "is-black" : "is-white"}`}>
                    <div className="result-strip">{black ? formatResult(value) : null}</div>
                    <div className={`result-value ${!black ? "!overflow-visible" : ""}`}>
                      <span
                        className={`rv-text !text-center !whitespace-nowrap !overflow-visible ${!black ? "!w-[125%] !max-w-none !px-0" : "!w-full !px-0.5"}`}
                      >
                        {black ? null : formatResult(value)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

/**
 * Miroir hors écran (1250 px) : bloc « Moyennes » + cadre complet
 * « Mesures poids statiques » des 88 touches, tels qu'imprimés en page 1.
 */
export function PianoSheetMirror({
  wa,
  wd,
  summary,
  averagesRef,
  sheetRef,
}: {
  wa: (number | undefined)[];
  wd: (number | undefined)[];
  summary: string;
  averagesRef: (node: HTMLElement | null) => void;
  sheetRef: (node: HTMLElement | null) => void;
}) {
  const cells = buildCells(wa, wd);
  const isBlack = (index: number) => BLACK_KEYS.has(index + 1);
  const global = average(cells);
  const whites = average(cells.filter((_, i) => !isBlack(i)));
  const blacks = average(cells.filter((_, i) => isBlack(i)));

  return (
    <div aria-hidden="true" className="absolute -left-[9999px] top-0 pointer-events-none">
      <div className="!w-[1250px] !min-w-[1250px] !max-w-[1250px] overflow-visible bg-white">
        <section className={`${FRAME_CLASS} !p-3 !pt-4 bg-white`} ref={averagesRef}>
          <h2 className={FRAME_TITLE_CLASS}>Moyennes</h2>
          <span
            className="!absolute !-top-3.5 !left-1/2 !-translate-x-1/2 !whitespace-nowrap !bg-card !px-2 !text-gray-950 !font-medium"
            style={{ fontSize: "0.83rem" }}
          >
            {summary}
          </span>
          <div className="grid grid-cols-4 mt-0.5 !gap-2.5">
            {(
              [
                { key: "wa", label: "Poids descendant" },
                { key: "wd", label: "Poids remontant" },
                { key: "friction", label: "Friction" },
                { key: "balance", label: "Poids d'équilibre" },
              ] as const
            ).map(({ key, label }) => (
              <div key={key} className="rounded bg-muted px-2 py-1.5 text-center">
                <div className="!text-[1.1rem] font-bold tracking-wide text-muted-foreground">{label}</div>
                <div className="mt-1 !text-2xl font-semibold tabular-nums">
                  {formatAverage(global[key])}
                  {global[key] !== "—" && <span className="!text-xs !font-medium"> gr.</span>}
                </div>
                <div className="mt-0.5 flex justify-center gap-2 text-[0.65rem] text-muted-foreground tabular-nums">
                  <span>
                    {whites[key]}
                    {whites[key] !== "—" && <span className="text-muted-foreground"> gr.</span>}
                  </span>
                  <span className="text-muted-foreground">/</span>
                  <span>
                    {blacks[key]}
                    {blacks[key] !== "—" && <span className="text-muted-foreground"> gr.</span>}
                  </span>
                </div>
                <div className="flex justify-center gap-2 text-[0.55rem] text-muted-foreground tabular-nums">
                  <span className="!text-xs font-medium">Blanches</span>
                  <span className="invisible">/</span>
                  <span className="!text-xs font-medium">Noires</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section
          className={`${FRAME_CLASS} mt-4 !w-[1250px] !min-w-[1250px] !max-w-[1250px] overflow-visible bg-white pb-4`}
          ref={(node) => {
            sheetRef(node);
            node?.setAttribute("data-pdf-compact", "");
          }}
        >
          <h2 className={FRAME_TITLE_CLASS}>Mesures poids statiques</h2>
          <div className="mx-auto flex w-full flex-col items-center justify-center overflow-visible">
            <Section from={1} to={44} cells={cells} />
            <Section from={45} to={88} cells={cells} />
          </div>
        </section>
      </div>
    </div>
  );
}
