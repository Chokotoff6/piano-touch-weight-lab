import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  REQUIRED_KEY_SET,
  missingRequiredKeys,
  missingRequiredMessage,
  requiredKeysGate,
} from "@/lib/required-keys";
import { SmartCombobox } from "@/components/SmartCombobox";
import {
  modelsFor,
  modelGroupsFor,
  inferTypeFromModel,
  BRAND_SUGGESTIONS,
  FREQUENT_COUNTRIES,
  SUGGESTED_COUNTRIES,
  type ClimateZone,
} from "@/lib/piano-constants";
import { fallbackZone, resolveClimateZone } from "@/lib/climate";
import {
  datePiano,
  factoryProfile,
  isSerialFormatValid,
  SERIAL_FORMAT_ERROR,
} from "@/lib/serial-dating";
import { HONEYPOT_NAME, markSubmission, passesBotChecks } from "@/lib/anti-bot";
import { buildCsv, downloadCsv } from "@/lib/export-csv";
import { getFingerprint } from "@/lib/fingerprint";
import { insertDiagnostic, updateDiagnostic, type DiagnosticPayload } from "@/lib/diagnostics";
import { setTopbarState } from "@/lib/topbar-store";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const ALL_COUNTRIES = Array.from(new Set([...FREQUENT_COUNTRIES, ...SUGGESTED_COUNTRIES]));


export const Route = createFileRoute("/saisie")({
  head: () => ({
    meta: [
      { title: "Saisie des mesures — Touchweight statique piano" },
      {
        name: "description",
        content:
          "Saisie des poids ascendant (Wa) et descendant (Wd) des 88 touches, avec calcul automatique de la friction et de la balance.",
      },
      { property: "og:title", content: "Saisie des mesures — Touchweight piano" },
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

const DRAFT_ROWS_KEY = "ptw_draft_rows";

type SerialRule = { prefix: boolean; suffix: boolean; autoPrefix?: string };

const BRAND_RULES: Record<string, SerialRule> = {
  YAMAHA: { prefix: true, suffix: false, autoPrefix: "J" },
  KAWAI: { prefix: true, suffix: true, autoPrefix: "F" },
  STEINWAY: { prefix: false, suffix: false },
  BECHSTEIN: { prefix: false, suffix: false },
  PLEYEL: { prefix: false, suffix: false },
};

const DEFAULT_RULE: SerialRule = { prefix: true, suffix: true };

const MAINTENANCE_OPTIONS = [
  "Entretien usuel uniquement",
  "Réglages personnalisés",
  "Modifications importantes",
] as const;

// Commutateur temporaire : désactive le contrôle des touches Do/Do# lors de l'export/sauvegarde.
// Passer à `false` pour réactiver la validation obligatoire.
const BYPASS_REQUIRED_KEYS_VALIDATION = true;

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
  const [isDirty, setIsDirty] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [blockMessage, setBlockMessage] = useState<string | null>(null);
  const blockTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const inputs = useRef<Record<string, HTMLInputElement | null>>({});
  const snRef = useRef<Record<string, HTMLInputElement | null>>({});
  const fabricationTouched = useRef(false);

  const navigate = useNavigate();
  const gridRef1 = useSnappedGrid(1, 44);
  const gridRef2 = useSnappedGrid(45, 88);

  // Filet de sécurité local : restauration puis sauvegarde silencieuse des pesées.
  const draftLoaded = useRef(false);
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(DRAFT_ROWS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Row[];
        if (Array.isArray(parsed) && parsed.length === 88) setRows(parsed);
      }
    } catch {
      /* stockage indisponible */
    }
    draftLoaded.current = true;
  }, []);

  useEffect(() => {
    if (!draftLoaded.current) return;
    try {
      window.localStorage.setItem(DRAFT_ROWS_KEY, JSON.stringify(rows));
    } catch {
      /* stockage indisponible */
    }
  }, [rows]);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [climateZone, setClimateZone] = useState<ClimateZone | null>(null);

  const rule = BRAND_RULES[(info["marque"] ?? "").trim().toUpperCase()] ?? DEFAULT_RULE;

  const canEnterWeights = useMemo(() => {
    return Boolean(
      info["marque"]?.trim() &&
        info["modele"]?.trim() &&
        info["sn_num"]?.trim() &&
        info["type_piano"] &&
        info["pays"]?.trim() &&
        info["ville"]?.trim() &&
        info["entretien"],
    );
  }, [info]);

  const exportReady = useMemo(() => {
    return Boolean(info["marque"]?.trim() && info["sn_num"]?.trim());
  }, [info]);

  useEffect(() => {
    if (canEnterWeights) {
      if (blockTimeout.current) clearTimeout(blockTimeout.current);
      blockTimeout.current = null;
      setBlockMessage(null);
    }
  }, [canEnterWeights]);

  useEffect(() => {
    return () => {
      if (blockTimeout.current) clearTimeout(blockTimeout.current);
    };
  }, []);

  const markDirty = () => {
    setIsDirty(true);
    setSavedAt(new Date().toISOString());
  };

  const updateInfo = (key: string, value: string) => {
    setInfo((p) => ({ ...p, [key]: value }));
    markDirty();
  };

  const resolveCity = (raw: string) => {
    const city = raw.trim();
    const country = (info["pays"] ?? "").trim();
    if (!city || !country) return;
    setIsGeocoding(true);
    resolveClimateZone(city, country)
      .then((zone) => setClimateZone(zone))
      .catch(() => setClimateZone(fallbackZone(country)))
      .finally(() => setIsGeocoding(false));
  };

  const serialFormatValid = useMemo(
    () =>
      isSerialFormatValid(
        info["marque"] ?? "",
        info["sn_prefix"] ?? "",
        info["sn_num"] ?? "",
        info["sn_suffix"] ?? "",
      ),
    [info],
  );

  const profile = useMemo(
    () =>
      factoryProfile(
        info["marque"] ?? "",
        info["sn_prefix"] ?? "",
        climateZone,
        info["type_piano"],
        info["sn_num"] ?? "",
      ),

    [info, climateZone],
  );

  // Pré-remplissage de la date de fabrication (reste modifiable manuellement).
  useEffect(() => {
    if (fabricationTouched.current) return;
    const year = datePiano(info["marque"] ?? "", info["sn_prefix"] ?? "", info["sn_num"] ?? "");
    const value = year === null ? "" : String(year);
    setInfo((p) => (p["fabrication"] === value ? p : { ...p, fabrication: value }));
  }, [info["marque"], info["sn_prefix"], info["sn_num"]]);


  const onPrefixChange = (value: string) => {
    updateInfo("sn_prefix", value.toUpperCase().slice(0, 3));
    if (rule.autoPrefix && value.length >= 1) snRef.current["sn_num"]?.focus();
  };

  const cleanWeight = (value: string) => value.replace(/[^0-9]/g, "");

  const parseWeight = (value: string): number | null => {
    const cleaned = cleanWeight(value);
    if (cleaned === "") return null;
    const num = parseInt(cleaned, 10);
    if (Number.isNaN(num) || !Number.isInteger(num) || num < 5 || num > 99) return null;
    return num;
  };

  const sectionAverages = useMemo(() => {
    const calc = (slice: Row[]) => {
      const valid = slice.filter((r) => parseWeight(r.wa) !== null && parseWeight(r.wd) !== null);
      if (valid.length === 0) {
        return { wa: "—", wd: "—", friction: "—", balance: "—", count: 0 };
      }
      const avgWa = valid.reduce((s, r) => s + parseWeight(r.wa)!, 0) / valid.length;
      const avgWd = valid.reduce((s, r) => s + parseWeight(r.wd)!, 0) / valid.length;
      return {
        wa: avgWa.toFixed(1),
        wd: avgWd.toFixed(1),
        friction: ((avgWd - avgWa) / 2).toFixed(1),
        balance: ((avgWd + avgWa) / 2).toFixed(1),
        count: valid.length,
      };
    };
    return {
      global: calc(rows),
      first: calc(rows.slice(0, 44)),
      second: calc(rows.slice(44, 88)),
    };
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

  const setValue = (index: number, field: "wa" | "wd", value: string) => {
    const cleaned = cleanWeight(value);
    markDirty();
    setErrors((prev) => {
      const next = { ...prev };
      delete next[`${index}-${field}`];
      return next;
    });
    setRows((prev) => prev.map((r, i) => (i === index ? { ...r, [field]: cleaned } : r)));
  };

  const handleBlur = (index: number, field: "wa" | "wd", value: string) => {
    const cleaned = cleanWeight(value);
    const key = `${index}-${field}`;
    if (cleaned === "") {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
      setRows((prev) => prev.map((r, i) => (i === index ? { ...r, [field]: "" } : r)));
      return;
    }
    const num = parseWeight(value);
    if (num === null) {
      setErrors((prev) => ({ ...prev, [key]: "Valeur invalide (5-99, nombre entier)" }));
      return;
    }
    setErrors((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
    setRows((prev) => prev.map((r, i) => (i === index ? { ...r, [field]: num.toString() } : r)));
  };

  const compute = (r: Row) => {
    const wa = parseWeight(r.wa);
    const wd = parseWeight(r.wd);
    if (wa === null || wd === null) return { friction: "", balance: "" };
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

  const showMessage = (text: string) => {
    if (blockTimeout.current) clearTimeout(blockTimeout.current);
    setBlockMessage(text);
    blockTimeout.current = setTimeout(() => {
      setBlockMessage(null);
      blockTimeout.current = null;
    }, 5000);
  };

  const showBlockMessage = () => {
    showMessage(
      "Complétez d'abord Marque, Modèle, N° de série, Type de piano, Pays, ville et Type d'entretien avant de saisir les mesures.",
    );
  };

  const [honeypot, setHoneypot] = useState("");

  const missingRequired = useMemo(() => missingRequiredKeys(rows), [rows]);


  useEffect(() => {
    requiredKeysGate.getMissing = () => missingRequiredKeys(rows);
    return () => {
      requiredKeysGate.getMissing = null;
    };
  }, [rows]);

  useEffect(() => {
    const onBlocked = (e: Event) => {
      const detail = (e as CustomEvent<{ message: string }>).detail;
      if (detail?.message) showMessage(detail.message);
    };
    window.addEventListener("required-keys-blocked", onBlocked);
    return () => window.removeEventListener("required-keys-blocked", onBlocked);
  }, []);


  const guardExport = () => {
    // Contrôle anti-robot : échec silencieux, aucun message affiché.
    if (!passesBotChecks(honeypot)) return false;
    // Vérification minimale : une marque et un numéro de série sont requis pour exporter.
    if (!exportReady) {
      showMessage(
        "⚠️ Veuillez renseigner au moins une marque et un numéro de série pour pouvoir exporter et sauvegarder votre diagnostic.",
      );
      return false;
    }
    // Validation Do/Do# temporairement désactivée via BYPASS_REQUIRED_KEYS_VALIDATION.
    if (!BYPASS_REQUIRED_KEYS_VALIDATION && missingRequired.length > 0) {
      showMessage(missingRequiredMessage(missingRequired));
      return false;
    }
    return true;
  };

  const [currentDbId, setCurrentDbId] = useState<string | null>(null);
  const [askUpdate, setAskUpdate] = useState(false);
  const [askCompare, setAskCompare] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const goCompareAfterSave = useRef(false);

  const buildPayload = (): DiagnosticPayload => {
    const year = Number((info["fabrication"] ?? "").match(/\d{4}/)?.[0]);
    return {
      user_fingerprint: getFingerprint(),
      marque: info["marque"] ?? "",
      type_piano: info["type_piano"] ?? "",
      modele: info["modele"] ?? "",
      prefixe_lettre: info["sn_prefix"] ?? "",
      numero_central: info["sn_num"] ?? "",
      suffixe_lettre: info["sn_suffix"] ?? "",
      annee_fabrication: Number.isFinite(year) ? year : null,
      pays: info["pays"] ?? "",
      ville: info["ville"] ?? "",
      zone_climatique: climateZone !== null ? String(climateZone) : "",
      type_entretien: info["entretien"] ?? "",
      remarques: info["remarques"] ?? "",
      mesures_wa: rows.map((r) => r.wa),
      mesures_wd: rows.map((r) => r.wd),
    };
  };

  const exportCsvFile = () => {
    const meta: Record<string, string> = {
      Marque: info["marque"] ?? "",
      "Type de piano": info["type_piano"] ?? "",
      Modèle: info["modele"] ?? "",
      "Préfixe lettre": info["sn_prefix"] ?? "",
      "Numéro de série": info["sn_num"] ?? "",
      "Suffixe lettre": info["sn_suffix"] ?? "",
      "Date de fabrication": info["fabrication"] ?? "",
      Pays: info["pays"] ?? "",
      Ville: info["ville"] ?? "",
      "Zone climatique": climateZone !== null ? String(climateZone) : "",
      "Profil d'usine": profile.label,
      "Type d'entretien": info["entretien"] ?? "",
      Remarques: info["remarques"] ?? "",
      "Date et heure de saisie": new Date().toISOString(),
    };
    const sn = (info["sn_num"] ?? "piano").replace(/[^\w-]/g, "");
    downloadCsv(`touchweight_${sn}_${Date.now()}.csv`, buildCsv(meta, rows));
  };

  const syncAndFinish = async (mode: "insert" | "update") => {
    setIsExporting(true);
    try {
      const payload = buildPayload();
      if (mode === "update" && currentDbId) {
        await updateDiagnostic(currentDbId, payload);
      } else {
        const id = await insertDiagnostic(payload);
        setCurrentDbId(id);
      }
      markSubmission();
      setIsDirty(false);
      toast.success("Diagnostic synchronisé avec succès");
      if (goCompareAfterSave.current) {
        goCompareAfterSave.current = false;
        void navigate({ to: "/resultats" });
      }
    } catch {
      goCompareAfterSave.current = false;
      showMessage("La synchronisation cloud a échoué. Les données restent enregistrées localement.");
    } finally {
      setIsExporting(false);
    }
  };
  useEffect(() => {
    setTopbarState({ exportReady, isExporting, isDirty });
    return () => {
      setTopbarState({ exportReady: false, isExporting: false, isDirty: false });
    };
  }, [exportReady, isExporting, isDirty]);

  useEffect(() => {
    const exportCsvOnly = () => {
      if (!guardExport()) return;
      exportCsvFile();
    };
    const saveCloud = () => {
      if (!guardExport()) return;
      if (currentDbId && isDirty) {
        setAskUpdate(true);
        return;
      }
      void syncAndFinish(currentDbId ? "update" : "insert");
    };
    const quickSave = () => {
      if (!guardExport()) return;
      void syncAndFinish(currentDbId ? "update" : "insert");
    };
    const onExport = () => {
      exportCsvOnly();
      saveCloud();
    };
    const onPdf = () => window.print();
    const onCompareGuard = () => setAskCompare(true);
    const onReset = () => setRows(EMPTY);

    const handlers: Record<string, EventListener> = {
      "piano-export": onExport as EventListener,
      "piano-export-csv": exportCsvOnly as EventListener,
      "piano-export-pdf": onPdf as EventListener,
      "piano-export-cloud": saveCloud as EventListener,
      "piano-save-cloud": saveCloud as EventListener,
      "piano-save": saveCloud as EventListener,
      "piano-save-quick": quickSave as EventListener,
      "piano-compare-guard": onCompareGuard as EventListener,
      "piano-reset": onReset as EventListener,
    };

    Object.entries(handlers).forEach(([type, fn]) => window.addEventListener(type, fn));
    return () => Object.entries(handlers).forEach(([type, fn]) => window.removeEventListener(type, fn));
  }, [rows, info, currentDbId, isDirty, honeypot, climateZone, profile]);


  const renderSection = (from: number, to: number, gridRef: (n: HTMLDivElement | null) => void) => (
    <section className="mt-8 flex w-full flex-col items-center" aria-label={`Touches ${from} à ${to}`}>
      <div className="technical-sheet">
        <div className="technical-labels min-w-[170px] w-44" aria-hidden="true">
          <div className="label-key" />
          <div className="label-wa" title="The minimum weight required to make the key move down.">
            Downweight (Wa)
          </div>
          <div className="label-wd" title="The maximum weight the key can lift when returning up.">
            Upweight (Wd)
          </div>
          <div
            className="label-wa-white"
            title="The minimum weight required to make the key move down."
          >
            Downweight (Wa)
          </div>
          <div
            className="label-wd-white"
            title="The maximum weight the key can lift when returning up."
          >
            Upweight (Wd)
          </div>

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
                  <div
                    className={`weight-fields weight-fields-wa ${!canEnterWeights ? "opacity-40" : ""}`}
                    onClick={() => {
                      if (!canEnterWeights) showBlockMessage();
                    }}
                  >
                    <input
                      ref={(el) => {
                        inputs.current[`${index}-wa`] = el;
                      }}
                      value={row.wa}
                      onChange={(e) => canEnterWeights && setValue(index, "wa", e.target.value)}
                      onBlur={(e) => canEnterWeights && handleBlur(index, "wa", e.target.value)}
                      onKeyDown={(e) => {
                        if (!canEnterWeights) {
                          e.preventDefault();
                          showBlockMessage();
                          return;
                        }
                        if (e.key === "Enter") {
                          handleBlur(index, "wa", e.currentTarget.value);
                        }
                        onKeyDown(e, index, "wa");
                      }}
                      onBeforeInput={(e) => {
                        if (!canEnterWeights) {
                          e.preventDefault();
                          showBlockMessage();
                        }
                      }}
                      inputMode="numeric"
                      min={5}
                      max={99}
                      step={1}
                      aria-label={`Wa touche ${index + 1}`}
                      title={errors[`${index}-wa`] ?? undefined}
                      className={`weight-input ${REQUIRED_KEY_SET.has(index + 1) ? "is-required" : ""} ${errors[`${index}-wa`] ? "error" : ""}`}
                    />
                  </div>
                  <div
                    className={`weight-fields weight-fields-wd ${!canEnterWeights ? "opacity-40" : ""}`}
                    onClick={() => {
                      if (!canEnterWeights) showBlockMessage();
                    }}
                  >
                    <input
                      ref={(el) => {
                        inputs.current[`${index}-wd`] = el;
                      }}
                      value={row.wd}
                      onChange={(e) => canEnterWeights && setValue(index, "wd", e.target.value)}
                      onBlur={(e) => canEnterWeights && handleBlur(index, "wd", e.target.value)}
                      onKeyDown={(e) => {
                        if (!canEnterWeights) {
                          e.preventDefault();
                          showBlockMessage();
                          return;
                        }
                        if (e.key === "Enter") {
                          handleBlur(index, "wd", e.currentTarget.value);
                        }
                        onKeyDown(e, index, "wd");
                      }}
                      onBeforeInput={(e) => {
                        if (!canEnterWeights) {
                          e.preventDefault();
                          showBlockMessage();
                        }
                      }}
                      inputMode="numeric"
                      min={5}
                      max={99}
                      step={1}
                      aria-label={`Wd touche ${index + 1}`}
                      title={errors[`${index}-wd`] ?? undefined}
                      className={`weight-input ${REQUIRED_KEY_SET.has(index + 1) ? "is-required" : ""} ${errors[`${index}-wd`] ? "error" : ""}`}
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
          <div className="result-label min-w-[170px] w-44">{kind === "friction" ? "Friction" : "Balance"}</div>
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
      <section
        className="mt-8 rounded-md border-2 border-foreground bg-card p-4 [&_input]:border-foreground/60"
        data-dirty={isDirty}
        data-saved-at={savedAt ?? ""}
        data-climate-zone={climateZone ?? ""}
      >
        <h2 className="text-lg font-bold text-black">Informations piano</h2>
        <div className="mt-3 grid gap-1.5 sm:grid-cols-2 md:grid-cols-4">
          <label className="text-lg font-semibold text-black">
            Marque
            <SmartCombobox
              value={info["marque"] ?? ""}
              options={BRAND_SUGGESTIONS}
              placeholder="Saisissez une marque (ex: YAMAHA, PLEYEL...)"
              onCommit={(v) => {
                updateInfo("marque", v);
                if ((info["modele"] ?? "") !== "") updateInfo("modele", "");
              }}
            />
          </label>

          <fieldset className="text-lg font-semibold text-black">
            <legend>Type piano</legend>
            <div className="mt-1 flex h-8 items-center gap-4 rounded border border-foreground/60 bg-white px-2">
              {["Droit", "à Queue"].map((t) => (
                <label key={t} className="flex items-center gap-1 text-sm text-foreground">
                  <input
                    type="radio"
                    name="type_piano"
                    value={t}
                    checked={info["type_piano"] === t}
                    onChange={() => {
                      updateInfo("type_piano", t);
                      const m = info["modele"] ?? "";
                      if (m && !modelsFor(info["marque"] ?? "", t).includes(m)) {
                        updateInfo("modele", "");
                      }
                    }}
                  />
                  {t}
                </label>
              ))}
            </div>
          </fieldset>



          <label className="text-lg font-semibold text-black">
            Modèle
            <SmartCombobox
              value={info["modele"] ?? ""}
              options={modelsFor(info["marque"] ?? "", info["type_piano"])}
              groups={modelGroupsFor(info["marque"] ?? "", info["type_piano"])}
              disabled={!info["marque"]?.trim()}
              openOnFocus
              className="!bg-white"
              placeholder="Saisissez ou cherchez un modèle..."
              onCommit={(v) => {
                updateInfo("modele", v);
                const inferred = inferTypeFromModel(info["marque"] ?? "", v);
                if (inferred) updateInfo("type_piano", inferred);
              }}
            />
          </label>

          <div className="mt-10 text-xs text-muted-foreground sm:col-span-2 md:col-span-4">
            <span className="text-lg font-semibold text-black">Numéro de série</span>{" "}
            <span className="text-muted-foreground">
              (Reportez le numéro du cadre métallique - inclure les lettres si existantes).
            </span>
            <div className="mt-1 flex items-end justify-start gap-4">
              <label className="min-w-[80px] text-sm font-normal italic text-black">
                <span className="block whitespace-nowrap">Lettres avant</span>
                <input
                  ref={(el) => {
                    snRef.current["sn_prefix"] = el;
                  }}
                  value={info["sn_prefix"] ?? ""}
                  onChange={(e) => onPrefixChange(e.target.value)}
                  disabled={!rule.prefix}
                  placeholder="ex: J, F"
                  className="mt-1 h-8 w-full max-w-[80px] rounded border border-foreground/60 bg-white px-2 text-sm text-foreground outline-none focus:border-ring focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground"
                />
              </label>
              <label className="min-w-[150px] text-sm font-normal italic text-black">
                <span className="block whitespace-nowrap">N° de série</span>
                <input
                  ref={(el) => {
                    snRef.current["sn_num"] = el;
                  }}
                  value={info["sn_num"] ?? ""}
                  onChange={(e) => updateInfo("sn_num", e.target.value.replace(/[^0-9]/g, ""))}
                  required
                  inputMode="numeric"
                  placeholder="Chiffres"
                  className="mt-1 h-8 w-full max-w-[150px] rounded border border-foreground/60 bg-white px-2 text-sm text-foreground outline-none focus:border-ring focus:ring-1 focus:ring-ring"
                />
              </label>
              <label className="min-w-[80px] text-sm font-normal italic text-black">
                <span className="block whitespace-nowrap">Lettre fin</span>
                <input
                  value={info["sn_suffix"] ?? ""}
                  onChange={(e) => updateInfo("sn_suffix", e.target.value.toUpperCase().slice(0, 3))}
                  disabled={!rule.suffix}
                  placeholder="ex: A, B"
                  className="mt-1 h-8 w-full max-w-[80px] rounded border border-foreground/60 bg-white px-2 text-sm text-foreground outline-none focus:border-ring focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground"
                />
              </label>
              <label className="min-w-[120px] text-sm font-normal italic text-black">
                <span className="block whitespace-nowrap">Date de fabrication</span>
                <input
                  value={info["fabrication"] ?? ""}
                  onChange={(e) => {
                    fabricationTouched.current = true;
                    updateInfo("fabrication", e.target.value);
                  }}
                  className="mt-1 h-8 w-full max-w-[120px] rounded border border-foreground/60 bg-white px-2 text-sm text-foreground outline-none focus:border-ring focus:ring-1 focus:ring-ring"
                />
              </label>
              <div className="flex h-8 items-end text-xs text-black">
                <span>
                  Profil d&apos;usine :{" "}
                  <span className="text-foreground">{profile.label}</span>
                  {profile.frictionTarget !== null && ` — friction cible ${profile.frictionTarget} g`}
                </span>
              </div>
            </div>
            {!serialFormatValid && (
              <p className="mt-1 text-[0.7rem] leading-snug text-destructive">
                {SERIAL_FORMAT_ERROR}
              </p>
            )}
          </div>

          <label className="mt-4 text-lg font-semibold text-black">
            Pays
            <SmartCombobox
              value={info["pays"] ?? ""}
              options={ALL_COUNTRIES}
              groups={[
                { label: "Suggestions fréquentes", options: FREQUENT_COUNTRIES },
                { label: "Tous les pays", options: SUGGESTED_COUNTRIES },
              ]}
              onCommit={(v) => updateInfo("pays", v)}
            />
          </label>

          <label className="mt-4 text-lg font-semibold text-black">
            <span className="flex items-center gap-2">
              Ville
              {isGeocoding && <span className="text-[0.65rem] italic">Vérification…</span>}
            </span>
            <input
              value={info["ville"] ?? ""}
              disabled={!info["pays"]?.trim()}
              onChange={(e) => updateInfo("ville", e.target.value)}
              onBlur={(e) => resolveCity(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  resolveCity((e.target as HTMLInputElement).value);
                }
              }}
              className="mt-1 h-8 w-full rounded border border-foreground/60 bg-white px-2 text-sm text-foreground outline-none focus:border-ring focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground"
            />
          </label>


          <fieldset className="mt-4 text-lg font-semibold text-black sm:col-span-2 md:col-span-4">
            <legend>Type d'entretien</legend>
            <div className="mt-1 flex flex-wrap items-center gap-4">
              {MAINTENANCE_OPTIONS.map((t) => (
                <label key={t} className="flex items-center gap-1 text-sm text-foreground">
                  <input
                    type="radio"
                    name="entretien"
                    value={t}
                    required
                    checked={info["entretien"] === t}
                    onChange={() => updateInfo("entretien", t)}
                  />
                  {t}
                </label>
              ))}
            </div>
          </fieldset>

          <label className="mt-6 text-lg font-semibold text-black sm:col-span-2 md:col-span-4">
            Remarques
            <input
              value={info["remarques"] ?? ""}
              onChange={(e) => updateInfo("remarques", e.target.value)}
              className="mt-1 h-8 w-full rounded border border-foreground/60 bg-white px-2 text-sm text-foreground outline-none focus:border-ring focus:ring-1 focus:ring-ring"
            />
          </label>

          <input
            type="text"
            name={HONEYPOT_NAME}
            value={honeypot}
            onChange={(e) => setHoneypot(e.target.value)}
            tabIndex={-1}
            autoComplete="off"
            aria-hidden="true"
            className="absolute h-0 w-0 opacity-0 pointer-events-none -z-10"
          />

        </div>
      </section>

      {blockMessage && (
        <div className="mt-6 rounded-md border border-amber-500/50 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:bg-amber-950/30 dark:text-amber-100">
          {blockMessage}
        </div>
      )}

      <section className="mt-4 rounded-md border-2 border-foreground bg-card p-4">
        <h2 className="text-lg font-bold text-black">Moyennes mesurées</h2>
        <div className="mt-2 grid grid-cols-4 gap-3">
          {([
            { key: "wa", label: "Downweight (Wa)" },
            { key: "wd", label: "Upweight (Wd)" },
            { key: "friction", label: "Friction" },
            { key: "balance", label: "Balance" },
          ] as const).map(({ key, label }) => (
            <div key={key} className="rounded bg-muted px-2 py-1.5 text-center">
              <div className="text-[0.8125rem] font-bold uppercase tracking-wide text-muted-foreground">
                {label}
              </div>
              <div className="mt-1 text-lg font-semibold tabular-nums">
                {sectionAverages.global[key]}
              </div>
              <div className="mt-0.5 flex justify-center gap-2 text-[0.65rem] text-muted-foreground tabular-nums">
                <span>{sectionAverages.first[key]}</span>
                <span className="text-muted-foreground">/</span>
                <span>{sectionAverages.second[key]}</span>
              </div>
              <div className="flex justify-center gap-2 text-[0.55rem] text-muted-foreground tabular-nums">
                <span>1-44</span>
                <span className="invisible">/</span>
                <span>45-88</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto mt-4 w-fit rounded-md border-2 border-foreground bg-card p-4">
        <h2 className="text-lg font-bold text-black">Mesures poids de touches</h2>
        <div className="mx-auto mt-1 flex w-fit max-w-full flex-col items-center justify-center">
          {renderSection(1, 44, gridRef1)}
          {renderSection(45, 88, gridRef2)}
        </div>
      </section>

      <div className="mt-2 flex justify-start">
        <button
          type="button"
          onClick={() => setRows(EMPTY)}
          className="rounded-md border border-input bg-background px-3 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent"
        >
          Reset
        </button>
      </div>

      <AlertDialog open={askCompare} onOpenChange={setAskCompare}>
        <AlertDialogContent className="w-full max-w-xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Modifications non sauvegardées</AlertDialogTitle>
            <AlertDialogDescription>
              ⚠️ Vos modifications actuelles ne sont pas sauvegardées. Pour intégrer ces mesures
              dans vos graphiques, une sauvegarde est nécessaire.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Continuer la saisie</AlertDialogCancel>
            <AlertDialogAction onClick={() => void navigate({ to: "/resultats" })}>
              Ignorer et accéder aux graphiques
            </AlertDialogAction>
            <AlertDialogAction
              onClick={() => {
                if (!guardExport()) return;
                goCompareAfterSave.current = true;
                if (currentDbId && isDirty) {
                  setAskUpdate(true);
                  return;
                }
                void syncAndFinish(currentDbId ? "update" : "insert");
              }}
            >
              Sauvegarder d'abord
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>


      <AlertDialog open={askUpdate} onOpenChange={setAskUpdate}>
        <AlertDialogContent className="w-full max-w-xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Un diagnostic existe déjà pour cette session</AlertDialogTitle>
            <AlertDialogDescription>
              Souhaitez-vous corriger le diagnostic enregistré ou créer un nouveau point
              d'historique ?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={() => void syncAndFinish("update")}>
              Mettre à jour le diagnostic existant
            </AlertDialogAction>
            <AlertDialogAction
              onClick={() => {
                setCurrentDbId(null);
                void syncAndFinish("insert");
              }}
            >
              Créer un nouveau point d'historique (Nouvelle pesée)
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}
