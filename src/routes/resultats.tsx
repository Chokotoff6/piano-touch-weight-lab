import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  AverageRow,
  ComparisonChart,
  Frame,
  buildChartData,
  type KeyFilter,
  type RefProfile,
} from "@/routes/comparer";
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

/** Construit le profil 88 touches du piano actuel à partir du brouillon de saisie. */
function profileFromRows(rows: Row[]): RefProfile {
  const wa: number[] = [];
  const wd: number[] = [];
  const friction: number[] = [];
  const balance: number[] = [];
  rows.forEach((row) => {
    const a = parseWeight(row.wa);
    const d = parseWeight(row.wd);
    const valid = a !== null && d !== null && a > d;
    wa.push(valid ? a : Number.NaN);
    wd.push(valid ? d : Number.NaN);
    friction.push(valid ? (a - d) / 2 : Number.NaN);
    balance.push(valid ? (a + d) / 2 : Number.NaN);
  });
  return { wa, wd, friction, balance };
}

const hasAnyValue = (profile: RefProfile) => profile.wa.some((value) => Number.isFinite(value));

function Resultats() {
  const topbar = useTopbarState();
  const [draft, setDraft] = useState<{ rows: Row[]; info: Info }>(() => ({
    rows: Array.from({ length: 88 }, () => ({ wa: "", wd: "" })),
    info: {},
  }));
  const [consent, setConsent] = useState(false);
  const [keyFilter, setKeyFilter] = useState<KeyFilter>("all");
  const [busy, setBusy] = useState(false);
  const averagesRef = useRef<HTMLDivElement>(null);
  const [averagesHeight, setAveragesHeight] = useState(0);

  useEffect(() => {
    setDraft(readDraft());
  }, []);

  useEffect(() => {
    const node = averagesRef.current;
    if (!node) return;
    const update = () => setAveragesHeight(node.offsetHeight);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  // Scroll lock identique à la page Comparer : arrêt du défilement quand le cadre
  // « Friction mécanique » atteint la bordure basse du cadre sticky « Moyennes ».
  useEffect(() => {
    const clamp = () => {
      const frame = document.querySelector('[data-frame="fric"]');
      if (!frame) return;
      const frameTop = frame.getBoundingClientRect().top + window.scrollY;
      const limit = Math.max(0, Math.round(frameTop - (127 + averagesHeight) - 5));
      if (window.scrollY > limit) window.scrollTo(0, limit);
    };
    clamp();
    window.addEventListener("scroll", clamp, { passive: true });
    window.addEventListener("resize", clamp);
    return () => {
      window.removeEventListener("scroll", clamp);
      window.removeEventListener("resize", clamp);
    };
  }, [averagesHeight]);

  const { rows, info } = draft;
  const mine = useMemo(() => profileFromRows(rows), [rows]);
  const hasData = hasAnyValue(mine);
  // Épuration : ni Cloud (orange) ni Usine (vert) sur cette page.
  const chartData = useMemo(() => buildChartData(hasData ? mine : null, null, null), [mine, hasData]);

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
      climate_zone: String(saved?.climate_zone || fallbackZone(pays)),
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
    <main className="mx-auto w-full max-w-[1400px] px-6 py-8">
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-x-0 top-[77px] z-40 h-[50px] bg-white"
      />
      <div className="w-full">
        <div className="min-w-0">
          <div ref={averagesRef} className="sticky top-[127px] z-40 mb-[50px] w-full bg-background pb-2">
            <Frame
              titleClassName="absolute -top-3.5 left-4 whitespace-nowrap bg-card px-2 text-lg font-bold text-foreground"
              title={<span>Moyennes</span>}
              className="h-fit"
            >
              <div className="mb-3">
                <div className="mb-1.5 px-1 text-[0.7rem] font-semibold uppercase tracking-wide !text-black">
                  Piano actuel : <span className="normal-case">{summary}</span>
                </div>
                <AverageRow chartData={chartData} source="cur" hasData={hasData} />
              </div>
              <div className="flex justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setKeyFilter((value) => (value === "all" ? "split" : "all"))}
                  className="h-8 rounded-full border-2 border-black bg-white px-3 text-xs !text-black hover:bg-gray-100"
                >
                  Touches blanches/noires :{" "}
                  <span className="ml-1 font-semibold !text-black">
                    {keyFilter === "all" ? "groupées" : "séparées"}
                  </span>
                </Button>
              </div>
            </Frame>
          </div>

          <div className="relative">
            <div className={unlocked ? "" : "pointer-events-none select-none blur-md"}>
              <ComparisonChart
                chartData={chartData}
                keyFilter={keyFilter}
                comparisonLabel=""
                comparisonShort=""
              />
            </div>

            {!unlocked && (
              <div className="absolute inset-x-0 top-0 flex justify-center p-4">
                <div className="w-full max-w-3xl rounded-md border border-gray-300 bg-white p-5 shadow-lg">
                  <p className="text-base font-semibold !text-gray-900">
                    📊 Débloquer l&apos;analyse graphique du clavier : Vos chiffres bruts sont calculés !
                    Pour afficher la courbe d&apos;équilibre visuelle de ce piano et détecter les
                    irrégularités touche par touche, validez le partage collaboratif.
                  </p>
                  <label className="mt-4 flex items-start gap-2 text-sm font-medium !text-gray-900">
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
                    className="mt-4 rounded-md border border-gray-900/40 bg-white px-5 py-2 text-sm font-bold !text-gray-900 transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Débloquer le graphique du piano
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
