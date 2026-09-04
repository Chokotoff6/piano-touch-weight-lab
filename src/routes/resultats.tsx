import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { toast } from "sonner";
import { CompareFaq } from "@/components/CompareFaq";
import { setCompareUnlocked, useTopbarState } from "@/lib/topbar-store";
import {
  buildCurrentPiano,
  loadCurrentPiano,
  saveCurrentPiano,
  saveCurrentPianoToCloud,
  upsertCurrentPianoBuffer,
  findHistoryProfileId,
  type CurrentPiano,
} from "@/lib/current-piano";
import { fallbackZone } from "@/lib/climate";

export const Route = createFileRoute("/resultats")({
  head: () => ({
    meta: [
      { title: "Diagnostic de votre instrument — Touchweight piano" },
      {
        name: "description",
        content:
          "Moyennes de touchweight statique de votre piano : poids descendant, poids ascendant, friction et balance.",
      },
      { property: "og:title", content: "Diagnostic de votre instrument" },
      {
        property: "og:description",
        content: "Moyennes de touchweight statique et courbe d'équilibre du clavier.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Resultats,
});

const DRAFT_ROWS_KEY = "ptw_draft_rows";
const DRAFT_INFO_KEY = "ptw_draft_info";

const C_KEYS = [4, 16, 28, 40, 52, 64, 76, 88];
const BLACK_MODULOS = new Set([2, 5, 7, 10, 0]);
const isBlackIndex = (index: number) => BLACK_MODULOS.has((index + 1) % 12);

type Row = { wa: string; wd: string };
type Info = Record<string, string>;

function readDraft(): { rows: Row[]; info: Info } {
  const empty: Row[] = Array.from({ length: 88 }, () => ({ wa: "", wd: "" }));
  if (typeof window === "undefined") return { rows: empty, info: {} };
  let rows = empty;
  let info: Info = {};
  try {
    const raw = window.localStorage.getItem(DRAFT_ROWS_KEY);
    const parsed = raw ? (JSON.parse(raw) as Row[]) : null;
    if (Array.isArray(parsed) && parsed.length === 88) rows = parsed;
  } catch {
    /* stockage indisponible */
  }
  try {
    const raw = window.localStorage.getItem(DRAFT_INFO_KEY);
    const parsed = raw ? (JSON.parse(raw) as Info) : null;
    if (parsed && typeof parsed === "object") info = parsed;
  } catch {
    /* stockage indisponible */
  }
  return { rows, info };
}

const parseWeight = (value: string): number | null => {
  const n = Number(String(value ?? "").trim().replace(",", "."));
  return Number.isFinite(n) && n > 0 ? n : null;
};

function averages(rows: Row[]) {
  const calc = (slice: Row[]) => {
    const valid = slice
      .map((r) => ({ wa: parseWeight(r.wa), wd: parseWeight(r.wd) }))
      .filter(
        (entry): entry is { wa: number; wd: number } =>
          entry.wa !== null && entry.wd !== null && entry.wa > entry.wd,
      );
    if (valid.length === 0) return { wa: "—", wd: "—", friction: "—", balance: "—" };
    const avgWa = valid.reduce((s, e) => s + e.wa, 0) / valid.length;
    const avgWd = valid.reduce((s, e) => s + e.wd, 0) / valid.length;
    return {
      wa: avgWa.toFixed(1),
      wd: avgWd.toFixed(1),
      friction: ((avgWa - avgWd) / 2).toFixed(1),
      balance: ((avgWa + avgWd) / 2).toFixed(1),
    };
  };
  return {
    global: calc(rows),
    white: calc(rows.filter((_, i) => !isBlackIndex(i))),
    black: calc(rows.filter((_, i) => isBlackIndex(i))),
  };
}

function Resultats() {
  const topbar = useTopbarState();
  const [draft, setDraft] = useState<{ rows: Row[]; info: Info }>(() => ({
    rows: Array.from({ length: 88 }, () => ({ wa: "", wd: "" })),
    info: {},
  }));
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setDraft(readDraft());
  }, []);

  const { rows, info } = draft;
  const avg = useMemo(() => averages(rows), [rows]);

  const chartData = useMemo(
    () =>
      rows.map((r, i) => {
        const wa = parseWeight(r.wa);
        const wd = parseWeight(r.wd);
        return { key: i + 1, wa, wd };
      }),
    [rows],
  );

  const summary = useMemo(() => {
    const now = new Date();
    const dd = String(now.getDate()).padStart(2, "0");
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const hh = String(now.getHours()).padStart(2, "0");
    const mi = String(now.getMinutes()).padStart(2, "0");
    const brand = info["marque"] ?? "";
    const model = info["modele"] ?? "";
    const year = info["fabrication"]?.trim() || "—";
    const sn = `${info["sn_prefix"] ?? ""}${info["sn_num"] ?? ""}${info["sn_suffix"] ?? ""}`;
    return `${brand} ${model} (${year}) - SN ${sn} - Mesure ${dd}-${mm}-${now.getFullYear()} - ${hh}:${mi}`;
  }, [info]);

  const buildPiano = (): CurrentPiano => {
    const pays = info["pays"] ?? "";
    const saved = loadCurrentPiano();
    return buildCurrentPiano({
      brand: info["marque"] ?? "",
      model: info["modele"] ?? "",
      serial_number: `${info["sn_prefix"] ?? ""}${info["sn_num"] ?? ""}${info["sn_suffix"] ?? ""}`,
      type_piano: info["type_piano"] ?? "",
      manufacture_year: Number(info["fabrication"]) || null,
      climate_zone: saved?.climate_zone || fallbackZone(pays),
      maintenance_type: info["entretien"] ?? "",
      usage_level: info["usage_level"] ?? "",
      ville: info["ville"] ?? "",
      pays,
      remarques: info["remarques"] ?? "",
      wa: rows.map((r) => r.wa),
      wd: rows.map((r) => r.wd),
    });
  };

  const unlock = async () => {
    if (!consent || busy) return;
    setBusy(true);
    const toastId = toast.loading("Partage collaboratif en cours…");
    try {
      const piano = buildPiano();
      saveCurrentPiano(piano);
      // Double écriture synchrone : ligne pivot (is_buffer) puis archivage historique.
      const buffer = await upsertCurrentPianoBuffer(piano);
      if (!buffer.ok) {
        toast.error(`Écriture cloud impossible : ${buffer.error ?? "erreur réseau"}`, { id: toastId });
        return;
      }
      const historyId = await findHistoryProfileId(piano.serial_number);
      const history = await saveCurrentPianoToCloud(piano, historyId);
      if (!history.ok) {
        toast.error(`Archivage impossible : ${history.error ?? "erreur réseau"}`, { id: toastId });
        return;
      }
      toast.success("Mesures partagées : graphique et comparaison débloqués.", { id: toastId });
      setCompareUnlocked(true);
    } finally {
      setBusy(false);
    }
  };

  const unlocked = topbar.compareUnlocked;

  return (
    <main className="mx-auto max-w-[1400px] px-6 py-10">
      <h1 className="text-2xl font-bold !text-black">Diagnostic de votre instrument</h1>

      <section className="relative mt-6 rounded-md border-2 border-foreground bg-card p-4 pt-6">
        <h2 className="absolute -top-3.5 left-4 bg-card px-2 text-lg font-bold !text-black">
          Moyennes
        </h2>
        <p className="!text-black font-semibold">
          Piano actuel : <span className="font-normal">{summary}</span>
        </p>
        <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
          {(
            [
              { key: "wa", label: "Poids descendant (Wa)" },
              { key: "wd", label: "Poids ascendant (Wd)" },
              { key: "friction", label: "Friction mécanique" },
              { key: "balance", label: "Balance statique" },
            ] as const
          ).map(({ key, label }) => (
            <div key={key} className="rounded bg-muted px-2 py-2 text-center">
              <div className="text-[1.05rem] font-bold !text-black">{label}</div>
              <div className="mt-1 text-2xl font-semibold tabular-nums !text-black">
                {avg.global[key]}
                {avg.global[key] !== "—" && <span className="text-xs font-medium"> gr.</span>}
              </div>
              <div className="mt-0.5 flex justify-center gap-2 text-sm tabular-nums !text-black">
                <span>{avg.white[key]}</span>
                <span>/</span>
                <span>{avg.black[key]}</span>
              </div>
              <div className="flex justify-center gap-2 text-xs font-medium !text-black">
                <span>Blanches</span>
                <span className="invisible">/</span>
                <span>Noires</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="relative mt-8 rounded-md border-2 border-foreground bg-card p-4 pt-6">
        <h2 className="absolute -top-3.5 left-4 bg-card px-2 text-lg font-bold !text-black">
          Courbe d&apos;équilibre du clavier
        </h2>
        <div className={unlocked ? "" : "pointer-events-none select-none blur-md"}>
          <div className="h-[340px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 20, right: 20, bottom: 10, left: 0 }}>
                <CartesianGrid stroke="#e5e7eb" strokeDasharray="3 3" />
                <XAxis
                  dataKey="key"
                  type="number"
                  domain={[1, 88]}
                  ticks={C_KEYS}
                  allowDuplicatedCategory={false}
                  tick={{ fontSize: 11 }}
                />
                <YAxis domain={["auto", "auto"]} tick={{ fontSize: 11 }} width={40} />
                <Tooltip />
                {C_KEYS.map((k) => (
                  <ReferenceLine key={k} x={k} stroke="#d1d5db" />
                ))}
                <Line
                  type="monotone"
                  dataKey="wa"
                  name="Piano actuel"
                  stroke="#000000"
                  strokeWidth={2}
                  dot={false}
                  connectNulls
                  isAnimationActive={false}
                />
                <Line
                  type="monotone"
                  dataKey="wd"
                  name="Piano actuel (Wd)"
                  stroke="#000000"
                  strokeWidth={1.5}
                  strokeDasharray="4 3"
                  dot={false}
                  connectNulls
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {!unlocked && (
          <div className="absolute inset-0 flex items-center justify-center p-4">
            <div className="w-full max-w-3xl rounded-md border border-yellow-300 bg-[#fef08a] p-5 shadow-lg">
              <p className="text-base font-semibold !text-gray-950">
                📊 Débloquer l&apos;analyse graphique du clavier : Vos chiffres bruts sont calculés !
                Pour afficher la courbe d&apos;équilibre visuelle de ce piano et détecter les
                irrégularités touche par touche, validez le partage collaboratif.
              </p>
              <label className="mt-4 flex items-start gap-2 text-sm font-medium !text-gray-950">
                <input
                  type="checkbox"
                  checked={consent}
                  onChange={(e) => setConsent(e.target.checked)}
                  className="mt-1 h-4 w-4"
                />
                <span>
                  J&apos;accepte de partager anonymement ces mesures (Marque, Modèle, N° de série,
                  Friction) pour enrichir la base de données mondiale des techniciens.
                </span>
              </label>
              <button
                type="button"
                disabled={!consent || busy}
                onClick={() => void unlock()}
                className="mt-4 rounded-md border border-gray-950/40 bg-white px-5 py-2 text-sm font-bold !text-gray-950 transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Débloquer le graphique du piano
              </button>
            </div>
          </div>
        )}
      </section>

      <div className="mt-10">
        <CompareFaq />
      </div>
    </main>
  );
}
