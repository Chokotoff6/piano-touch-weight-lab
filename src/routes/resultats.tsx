import { createFileRoute } from "@tanstack/react-router";
import { useLang } from "@/data/translations";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  AverageRow,
  ComparisonChart,
  Frame,
  buildChartData,
  type KeyFilter,
  type RefProfile,
} from "@/routes/comparer";
import { setCompareUnlocked, setResultsVisited, useTopbarState } from "@/lib/topbar-store";
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
import { parseDiagnosticCsv } from "@/lib/import-csv";

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
  const lang = useLang();
  const en = lang === "en";
  const topbar = useTopbarState();
  const [draft, setDraft] = useState<{ rows: Row[]; info: Info }>(() => ({
    rows: Array.from({ length: 88 }, () => ({ wa: "", wd: "" })),
    info: {},
  }));
  const [consent, setConsent] = useState(false);
  // État initial imposé : touches blanches et noires affichées séparément.
  const [keyFilter, setKeyFilter] = useState<KeyFilter>("split");
  const [busy, setBusy] = useState(false);
  const averagesRef = useRef<HTMLDivElement>(null);
  const [averagesHeight, setAveragesHeight] = useState(0);
  const importInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setDraft(readDraft());
    // Jalon de parcours : la visite de cette page débloque « Comparer ».
    setResultsVisited(true);
  }, []);

  // Bouton « Importer » de la barre supérieure : ouvre le sélecteur de fichier
  // CSV du système, exactement comme sur la page Saisie.
  useEffect(() => {
    const open = () => importInputRef.current?.click();
    window.addEventListener("piano-import-csv", open);
    return () => window.removeEventListener("piano-import-csv", open);
  }, []);

  /** Applique un CSV Touchweight aux moyennes et graphiques de cette page. */
  const importCsvContent = (content: string) => {
    try {
      const { fields, rows: imported } = parseDiagnosticCsv(content);
      const nextRows: Row[] = imported.map((r) => ({ wa: r.wa, wd: r.wd }));
      const nextInfo: Info = {
        marque: fields["brand"] ?? "",
        modele: fields["model"] ?? "",
        type_piano: fields["type_piano"] ?? "",
        sn_num: fields["serial_number"] ?? "",
        fabrication: fields["manufacture_year"] ?? "",
        pays: fields["pays"] ?? "",
        ville: fields["ville"] ?? "",
        entretien: fields["maintenance_type"] ?? "",
        usage_level: fields["usage_level"] ?? "",
        remarques: fields["remarques"] ?? "",
      };
      try {
        window.localStorage.setItem(DRAFT_ROWS_KEY, JSON.stringify(nextRows));
        window.localStorage.setItem(DRAFT_INFO_KEY, JSON.stringify(nextInfo));
      } catch {
        /* stockage indisponible */
      }
      saveCurrentPiano(
        buildCurrentPiano({
          brand: nextInfo["marque"] ?? "",
          model: nextInfo["modele"] ?? "",
          serial_number: nextInfo["sn_num"] ?? "",
          type_piano: nextInfo["type_piano"] ?? "",
          manufacture_year: Number(nextInfo["fabrication"]) || null,
          climate_zone: String(loadCurrentPiano()?.climate_zone || fallbackZone(nextInfo["pays"] ?? "")),
          maintenance_type: nextInfo["entretien"] ?? "",
          usage_level: nextInfo["usage_level"] ?? "",
          ville: nextInfo["ville"] ?? "",
          pays: nextInfo["pays"] ?? "",
          remarques: nextInfo["remarques"] ?? "",
          wa: nextRows.map((r) => r.wa),
          wd: nextRows.map((r) => r.wd),
        }),
      );
      setDraft({ rows: nextRows, info: nextInfo });
      toast.success(en ? "CSV file imported." : "Fichier CSV importé.");
    } catch {
      toast.error(en ? "Invalid CSV file." : "Fichier CSV invalide.");
    }
  };

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
    const BLACK = new Set([2, 5, 7, 10, 0]);
    let white = 0;
    let black = 0;
    rows.forEach((row, index) => {
      const filled = String(row.wa ?? "").trim() !== "" || String(row.wd ?? "").trim() !== "";
      if (!filled) return;
      if (BLACK.has((index + 1) % 12)) black += 1;
      else white += 1;
    });
    return {
      main: `${brand} ${model} (${year}) - SN ${sn}`,
      time: `${en ? "Measurement" : "Mesure"} ${dd}-${mm}-${now.getFullYear()} - ${hh}:${mi}`,
      count: ` - ${white} ${en ? "Whites" : "Blanches"} / ${black} ${en ? "Blacks" : "Noires"}`,
    };
  }, [info, rows, en]);

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
    if (busy || unlocked) return;
    setConsent(true);
    setBusy(true);
    const toastId = toast.loading(en ? "Collaborative sharing in progress…" : "Partage collaboratif en cours…");
    try {
      const piano = buildPiano();
      saveCurrentPiano(piano);
      // Double écriture synchrone : ligne pivot (is_buffer) puis archivage historique.
      const buffer = await upsertCurrentPianoBuffer(piano);
      if (!buffer.ok) {
        toast.error(`${en ? "Cloud write failed:" : "Écriture cloud impossible :"} ${buffer.error ?? (en ? "network error" : "erreur réseau")}`, { id: toastId });
        return;
      }
      const historyId = await findHistoryProfileId(piano.serial_number);
      const history = await saveCurrentPianoToCloud(piano, historyId);
      if (!history.ok) {
        toast.error(`${en ? "Archiving failed:" : "Archivage impossible :"} ${history.error ?? (en ? "network error" : "erreur réseau")}`, { id: toastId });
        return;
      }
      toast.success(en ? "Measurements shared: chart and comparison unlocked." : "Mesures partagées : graphique et comparaison débloqués.", { id: toastId });
      setCompareUnlocked(true);
    } finally {
      setBusy(false);
    }
  };

  const unlocked = topbar.compareUnlocked;

  return (
    <main className="mx-auto w-full max-w-[1120px] px-6 py-8">
      <input
        ref={importInputRef}
        type="file"
        accept=".csv,text/csv"
        style={{ display: "none" }}
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (!file) return;
          const reader = new FileReader();
          reader.onload = () => importCsvContent(String(reader.result ?? ""));
          reader.onerror = () => toast.error(en ? "Unable to read the file." : "Lecture du fichier impossible.");
          reader.readAsText(file, "utf-8");
        }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-x-0 top-[77px] z-40 h-[50px] bg-white"
      />
      <div className="w-full">
        <div className="min-w-0">
          <div ref={averagesRef} className="sticky top-[127px] z-50 mb-[50px] w-full bg-white pb-2 relative">
              <Frame
                titleClassName="absolute -top-4 left-4 whitespace-nowrap bg-card px-2 text-lg font-bold text-foreground"
                title={
                  <span className="flex items-baseline gap-2">
                    <span>{en ? "Averages" : "Moyennes"}</span>
                    <span className="text-slate-400">-</span>
                    <span className="text-lg font-semibold !text-black">{summary.main}</span>
                    <span className="text-xs font-medium !text-black">{summary.time}</span>
                    <span className="text-xs font-medium !text-black">{summary.count}</span>
                  </span>
                }
                className="h-fit"
              >
                <AverageRow chartData={chartData} source="cur" hasData={hasData} />
              </Frame>
          </div>

          <div className="relative mx-auto w-full">
            <div className={unlocked ? "" : "pointer-events-none select-none blur-md"}>
              <ComparisonChart
                chartData={chartData}
                keyFilter={keyFilter}
                comparisonLabel=""
                comparisonShort=""
                currentBaseName=""
                autoDomain
                sideMargin={60}
                onCycleKeyFilter={() => setKeyFilter((value) => (value === "all" ? "split" : "all"))}
              />
            </div>



            {!unlocked && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/80 p-4">
                <div className="w-full max-w-3xl rounded-md border border-gray-300 bg-white p-5 shadow-lg">
                  <label className="flex items-start gap-2 text-sm font-medium !text-gray-900">
                    <input
                      type="checkbox"
                      checked={consent}
                      disabled={busy}
                      onChange={(e) => {
                        if (e.target.checked) void unlock();
                      }}
                      className="mt-1 h-4 w-4"
                    />
                    <span>
                      J&apos;accepte de partager anonymement ces mesures (Marque, Modèle, N° de série,
                      Friction) pour enrichir la base de données mondiale des techniciens.
                    </span>
                  </label>
                  {busy && (
                    <p className="mt-3 text-sm font-medium !text-gray-900">
                      Partage collaboratif en cours…
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
