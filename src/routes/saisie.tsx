import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  hasAnyMeasurement,
  incompleteOctaves,
  OCTAVE_RULE_MESSAGE,
  saisieGate,
} from "@/lib/required-keys";
import { SmartCombobox, type SmartComboboxHandle } from "@/components/SmartCombobox";
import { modelsFor, modelGroupsFor, inferTypeFromModel } from "@/data/pianoModels";
import {
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
import { buildCsv, buildExportFilename, downloadCsv } from "@/lib/export-csv";
import { parseDiagnosticCsv } from "@/lib/import-csv";
import { generateLandscapeReport } from "@/lib/pdf-report";
import { PdfComparisonChart, PdfInfoTable, type ChartPoint } from "@/components/PdfReportBlocks";

const INVALID_CSV_MESSAGE =
  "⚠️ Fichier non valide. Veuillez importer un fichier CSV généré par l'application Piano Touch Analyzer.";
import { getFingerprint } from "@/lib/fingerprint";
import {
  getOwnDiagnostics,
  insertDiagnostic,
  updateDiagnostic,
  type DiagnosticPayload,
  type DiagnosticHistoryRow,
} from "@/lib/diagnostics";
import { getTopbarState, setTopbarState, showTopbarAlert } from "@/lib/topbar-store";
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

// ---------------------------------------------------------------------------
// Constantes
// ---------------------------------------------------------------------------

const ALL_COUNTRIES = Array.from(new Set([...FREQUENT_COUNTRIES, ...SUGGESTED_COUNTRIES]));

const BLACK_KEYS = new Set([
  2, 5, 7, 10, 12, 14, 17, 19, 22, 24, 26, 29, 31, 34, 36, 38, 41, 43, 46, 48, 50, 53, 55, 58, 60,
  62, 65, 67, 70, 72, 74, 77, 79, 82, 84, 86,
]);

const NATURAL_KEY_BREAKS = new Set([3, 10, 15, 22, 27, 34, 39, 46, 51, 58, 63, 70, 75, 82, 87]);

const C_KEYS = new Set([4, 16, 28, 40, 52, 64, 76, 88]);

type Row = { wa: string; wd: string };

const EMPTY: Row[] = Array.from({ length: 88 }, () => ({ wa: "", wd: "" }));

const DRAFT_ROWS_KEY = "ptw_draft_rows";

const FORM_INCOMPLETE_MESSAGE =
  "⚠️ Complétez d'abord Marque, Modèle, N° de série, Type de piano, Pays, ville et Type d'entretien avant de sauver.";
const SAVE_UPDATE_MESSAGE =
  "⚠️ Diagnostic synchronisé avec succès dans la base de données de l'application (Cloud)";
const SAVE_NEW_MESSAGE =
  "⚠️ Nouvelle session de suivi chronologique créée avec succès. Cette fiche historique est archivée de manière étanche dans la base de données cloud pour vos futures comparaisons.";
const ORPHAN_MESSAGE =
  "⚠️ Mesure incomplète : Chaque touche mesurée doit obligatoirement posséder à la fois une valeur Wa et une valeur Wd.";
const COHERENCE_MESSAGE =
  "⚠️ Erreur de cohérence : Le poids descendant (Wa) doit toujours être supérieur au poids ascendant (Wd).";

function wrapTooltipText(text: string, maxChars: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    if (!current) current = word;
    else if ((current + " " + word).length <= maxChars) current += " " + word;
    else {
      lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines;
}

function SvgTooltip({ x, y, text }: { x: number; y: number; text: string }) {
  const maxChars = 42;
  const lines = wrapTooltipText(text, maxChars);
  const charWidth = 6.4;
  const lineHeight = 16;
  const padX = 10;
  const padY = 8;
  const width = Math.min(maxChars, Math.max(...lines.map((l) => l.length))) * charWidth + padX * 2;
  const height = lines.length * lineHeight + padY * 2;
  return (
    <svg
      role="alert"
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      style={{
        position: "fixed",
        left: x,
        top: y,
        zIndex: 99999,
        pointerEvents: "none",
        overflow: "visible",
      }}
    >
      <g>
        <rect
          x="0"
          y="0"
          width={width}
          height={height}
          rx="4"
          fill="#fef08a"
          opacity="1"
          stroke="#fde047"
        />
        {lines.map((line, i) => (
          <text
            key={i}
            x={padX}
            y={padY + lineHeight * (i + 1) - 4}
            fill="#000000"
            fontWeight="600"
            fontSize="12"
            fontFamily="ui-sans-serif, system-ui, Arial, sans-serif"
          >
            {line}
          </text>
        ))}
      </g>
    </svg>
  );
}

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

// ---------------------------------------------------------------------------
// Classes Tailwind partagées (source unique de vérité visuelle)
// ---------------------------------------------------------------------------

/** Cadre encadré avec titre à cheval sur la bordure supérieure. */
const FRAME_CLASS = "relative rounded-md border-2 border-foreground bg-card p-4 pt-5";
const FRAME_TITLE_CLASS = "absolute -top-3.5 left-4 bg-card px-2 text-lg font-bold text-black";
/** Champ texte standard du formulaire. */
const INPUT_CLASS =
  "mt-1 h-8 w-full rounded border border-foreground/60 bg-white px-2 text-sm text-foreground outline-none focus:border-ring focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground";
/** Label principal du cadre « Informations piano ». */
const FIELD_LABEL_CLASS = "text-lg font-semibold text-black";
/** Sous-label secondaire (numéro de série éclaté). */
const SUB_LABEL_CLASS = "text-sm font-normal italic text-black";
/** Colonne d'étiquettes à gauche des claviers. */
const SIDE_LABEL_CLASS = "min-w-[120px] w-32 text-right";

// ---------------------------------------------------------------------------
// Petits composants internes
// ---------------------------------------------------------------------------

/** Cadre borduré dont le titre chevauche la bordure supérieure (effet fieldset/legend). */
function Frame({
  title,
  className = "",
  innerRef,
  children,
}: {
  title: ReactNode;
  className?: string;
  innerRef?: (node: HTMLElement | null) => void;
  children: ReactNode;
}) {
  return (
    <section className={`${FRAME_CLASS} ${className}`} ref={innerRef}>
      <h2 className={FRAME_TITLE_CLASS}>{title}</h2>
      {children}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Grille clavier : calcul des colonnes alignées sur le pixel physique
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Route
// ---------------------------------------------------------------------------

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
        content: "Consignez Wa et Wd sur 88 touches et obtenez friction et balance instantanément.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

// ---------------------------------------------------------------------------
// Page Saisie
// ---------------------------------------------------------------------------

function Index() {
  const [rows, setRows] = useState<Row[]>(EMPTY);
  const [info, setInfo] = useState<Record<string, string>>({});
  const [isDirty, setIsDirty] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [blockMessage, setBlockMessage] = useState<string | null>(null);
  const [blockAnchor, setBlockAnchor] = useState<{ x: number; y: number; text?: string } | null>(null);
  const blockAnchorTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** Mode pesée : formulaire masqué, bandeau résumé affiché. */
  const [weighingMode, setWeighingMode] = useState(false);
  const weighingBtnRef = useRef<HTMLButtonElement | null>(null);
  const [coherenceIndex, setCoherenceIndex] = useState<number | null>(null);
  const [coherenceAnchor, setCoherenceAnchor] = useState<{ x: number; y: number } | null>(null);
  const remarquesRef = useRef<HTMLInputElement | null>(null);
  const modelComboRef = useRef<SmartComboboxHandle | null>(null);
  const blockTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const coherenceTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const inputs = useRef<Record<string, HTMLInputElement | null>>({});
  const snRef = useRef<Record<string, HTMLInputElement | null>>({});
  const fabricationTouched = useRef(false);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [climateZone, setClimateZone] = useState<ClimateZone | null>(null);
  const [honeypot, setHoneypot] = useState("");
  const [currentDbId, setCurrentDbId] = useState<string | null>(null);
  const [askUpdate, setAskUpdate] = useState(false);
  const [askCompare, setAskCompare] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const importInputRef = useRef<HTMLInputElement | null>(null);
  const pdfInfoRef = useRef<HTMLDivElement | null>(null);
  const pdfChartRef = useRef<HTMLDivElement | null>(null);
  const moyennesRef = useRef<HTMLElement | null>(null);
  const mesuresRef = useRef<HTMLElement | null>(null);
  const goCompareAfterSave = useRef(false);


  const navigate = useNavigate();
  const gridRef1 = useSnappedGrid(1, 44);
  const gridRef2 = useSnappedGrid(45, 88);

  // --- Persistance locale (filet de sécurité) -------------------------------

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

  // --- États dérivés ---------------------------------------------------------

  const rule = BRAND_RULES[(info["marque"] ?? "").trim().toUpperCase()] ?? DEFAULT_RULE;

  const canEnterWeights = useMemo(
    () =>
      Boolean(
        info["marque"]?.trim() &&
          info["modele"]?.trim() &&
          info["sn_num"]?.trim() &&
          info["type_piano"] &&
          info["pays"]?.trim() &&
          info["ville"]?.trim() &&
          info["entretien"],
      ),
    [info],
  );

  const requiredSheetFieldsComplete = useMemo(
    () =>
      Boolean(
        info["marque"]?.trim() &&
          info["modele"]?.trim() &&
          info["sn_num"]?.trim() &&
          info["type_piano"] &&
          info["pays"]?.trim() &&
          info["entretien"],
      ),
    [info],
  );

  const exportReady = useMemo(
    () => Boolean(info["marque"]?.trim() && info["sn_num"]?.trim()),
    [info],
  );

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

  const octaveGaps = useMemo(() => incompleteOctaves(rows), [rows]);

  /** Touches "orphelines" : Wa rempli sans Wd, ou l'inverse. */
  const orphanKeys = useMemo(
    () =>
      rows
        .map((r, i) => ({ r, i }))
        .filter(({ r }) => (r.wa.trim() !== "") !== (r.wd.trim() !== ""))
        .map(({ i }) => i),
    [rows],
  );

  /** Vrai dès qu'une erreur de cohérence Wa <= Wd est présente sur le clavier. */
  const hasConsistencyErrors = useMemo(
    () => Object.values(errors).some((m) => m === COHERENCE_MESSAGE),
    [errors],
  );

  /**
   * Validité du clavier — séquence stricte :
   * TEST 1 (prioritaire) : touche orpheline (cadre rouge) => stop, badge masqué.
   * TEST 2 (successif) : échantillonnage des octaves, uniquement si zéro cadre rouge.
   */
  const keyboardValid = useMemo(() => {
    if (orphanKeys.length > 0) return false; // TEST 1
    if (hasConsistencyErrors) return false;
    if (!hasAnyMeasurement(rows)) return false;
    if (octaveGaps.length > 0) return false; // TEST 2
    return true;
  }, [orphanKeys.length, hasConsistencyErrors, rows, octaveGaps.length]);

  /** Remarques obligatoires dès que des modifications importantes sont déclarées. */
  const remarquesRequired = info["entretien"] === "Modifications importantes";
  const remarquesInvalid = remarquesRequired && !(info["remarques"] ?? "").trim();

  /** Téléporte le curseur dans la première case Wa (Touche 1 / La0). */
  const focusFirstWeight = useCallback(() => {
    setTimeout(() => {
      inputs.current["0-wa"]?.focus({ preventScroll: true });
      inputs.current["0-wa"]?.select();
    }, 50);
  }, []);

  /** Validation consciente de la fiche : alerte si incomplète, sinon mode pesée. */
  const onValidateWeighing = useCallback(() => {
    if (!requiredSheetFieldsComplete) {
      if (blockAnchorTimeout.current) clearTimeout(blockAnchorTimeout.current);
      const r = weighingBtnRef.current?.getBoundingClientRect();
      setBlockAnchor(
        r ? { x: Math.max(8, r.left - 340), y: Math.max(8, r.top - 12), text: FORM_INCOMPLETE_MESSAGE } : { x: window.innerWidth / 2 - 144, y: 120, text: FORM_INCOMPLETE_MESSAGE },
      );
      blockAnchorTimeout.current = setTimeout(() => {
        setBlockAnchor(null);
        blockAnchorTimeout.current = null;
      }, 3000);
      return;
    }
    if (remarquesInvalid) {
      if (blockAnchorTimeout.current) clearTimeout(blockAnchorTimeout.current);
      const r = weighingBtnRef.current?.getBoundingClientRect();
      setBlockAnchor(
        r ? { x: Math.max(8, r.left - 340), y: Math.max(8, r.top - 12), text: "⚠️ Veuillez préciser la nature des modifications importantes dans le champ Remarques avant de valider." } : { x: window.innerWidth / 2 - 144, y: 120, text: "⚠️ Veuillez préciser la nature des modifications importantes dans le champ Remarques avant de valider." },
      );
      blockAnchorTimeout.current = setTimeout(() => {
        setBlockAnchor(null);
        blockAnchorTimeout.current = null;
      }, 3000);
      return;
    }
    setWeighingMode(true);
    focusFirstWeight();
  }, [requiredSheetFieldsComplete, remarquesInvalid, focusFirstWeight]);

  /** Confirmation de réinitialisation en cartouche jaune ("rows" = mesures, "info" = fiche). */
  const [confirmReset, setConfirmReset] = useState<null | "rows" | "info">(null);

  /** Réinitialise uniquement la fiche d'informations (les pesées restent intactes). */
  const resetInfo = () => {
    setInfo({});
    setClimateZone(null);
    setCurrentDbId(null);
    setErrors({});
    fabricationTouched.current = false;
    markDirty();
  };

  // --- Messages temporaires ---------------------------------------------------

  useEffect(() => {
    if (canEnterWeights) {
      if (blockTimeout.current) clearTimeout(blockTimeout.current);
      blockTimeout.current = null;
      setBlockMessage(null);
      setBlockAnchor(null);
    }
  }, [canEnterWeights]);

  useEffect(
    () => () => {
      if (blockTimeout.current) clearTimeout(blockTimeout.current);
    },
    [],
  );

  const showMessage = (text: string) => {
    if (blockTimeout.current) clearTimeout(blockTimeout.current);
    setBlockMessage(text);
    blockTimeout.current = setTimeout(() => {
      setBlockMessage(null);
      blockTimeout.current = null;
    }, 3000);
  };

  const showCoherencePopover = (index: number) => {
    if (coherenceTimeout.current) clearTimeout(coherenceTimeout.current);
    const el = inputs.current[`${index}-wd`];
    if (el) {
      const r = el.getBoundingClientRect();
      setCoherenceAnchor({ x: r.right + 8, y: r.top });
    }
    setCoherenceIndex(index);
    coherenceTimeout.current = setTimeout(() => {
      setCoherenceIndex(null);
      setCoherenceAnchor(null);
      coherenceTimeout.current = null;
    }, 3000);
  };

  useEffect(() => {
    const dismissCoherencePopover = () => {
      setCoherenceIndex(null);
      setCoherenceAnchor(null);
    };
    document.addEventListener("pointerdown", dismissCoherencePopover);
    return () => {
      document.removeEventListener("pointerdown", dismissCoherencePopover);
      if (coherenceTimeout.current) clearTimeout(coherenceTimeout.current);
    };
  }, []);

  /** Alerte ancrée sur la touche orpheline (Wa sans Wd ou inversement). */
  const showOrphanPopover = (index: number) => {
    if (blockAnchorTimeout.current) clearTimeout(blockAnchorTimeout.current);
    const el = inputs.current[`${index}-wa`] ?? inputs.current[`${index}-wd`];
    const r = el?.getBoundingClientRect();
    setBlockAnchor({
      x: r ? r.right + 8 : window.innerWidth / 2 - 144,
      y: r ? r.top : 120,
      text: ORPHAN_MESSAGE,
    });
    blockAnchorTimeout.current = setTimeout(() => {
      setBlockAnchor(null);
      blockAnchorTimeout.current = null;
    }, 3000);
  };

  /** Alerte ancrée sur la touche cliquée, près du curseur, quand la fiche est incomplète. */
  const showBlockMessage = (index: number, field: "wa" | "wd") => {
    if (blockAnchorTimeout.current) clearTimeout(blockAnchorTimeout.current);
    const el = inputs.current[`${index}-${field}`];
    const r = el?.getBoundingClientRect();
    setBlockAnchor(r ? { x: r.right + 8, y: r.top } : { x: window.innerWidth / 2 - 144, y: 120 });
    blockAnchorTimeout.current = setTimeout(() => {
      setBlockAnchor(null);
      blockAnchorTimeout.current = null;
    }, 3000);
  };

  // --- Saisie des informations générales ---------------------------------------

  const markDirty = () => {
    setIsDirty(true);
    setSavedAt(new Date().toISOString());
  };

  const normalizeCity = (raw: string) =>
    raw
      .toUpperCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^A-Z0-9\s'-]/g, "")
      .replace(/\s+/g, " ")
      .trim();

  const updateInfo = (key: string, value: string) => {
    setInfo((p) => ({ ...p, [key]: value }));
    markDirty();
  };

  const resolveCity = (raw: string) => {
    const city = normalizeCity(raw);
    const country = (info["pays"] ?? "").trim();
    if (!city || !country) return;
    setIsGeocoding(true);
    resolveClimateZone(city, country)
      .then((zone) => setClimateZone(zone))
      .catch(() => setClimateZone(fallbackZone(country)))
      .finally(() => setIsGeocoding(false));
  };

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

  // --- Saisie des poids ---------------------------------------------------------

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
      const valid = slice
        .map((r) => ({ wa: parseWeight(r.wa), wd: parseWeight(r.wd) }))
        .filter(
          (entry): entry is { wa: number; wd: number } =>
            entry.wa !== null && entry.wd !== null && entry.wa > entry.wd,
        );
      if (valid.length === 0) {
        return { wa: "—", wd: "—", friction: "—", balance: "—", count: 0 };
      }
      const avgWa = valid.reduce((s, entry) => s + entry.wa, 0) / valid.length;
      const avgWd = valid.reduce((s, entry) => s + entry.wd, 0) / valid.length;
      return {
        wa: avgWa.toFixed(1),
        wd: avgWd.toFixed(1),
        friction: ((avgWa - avgWd) / 2).toFixed(1),
        balance: ((avgWa + avgWd) / 2).toFixed(1),
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

  const onKeyDown = useCallback((e: React.KeyboardEvent, index: number, field: "wa" | "wd") => {
    if (e.shiftKey && e.key === "Tab") {
      const nextCKey = Array.from(C_KEYS).find((key) => key > index + 1);
      if (nextCKey !== undefined) {
        e.preventDefault();
        focusCell(nextCKey - 1, "wa");
      }
      return;
    }
    if (e.key !== "Enter") return;
    e.preventDefault();
    if (field === "wa") focusCell(index, "wd");
    else if (index < 87) focusCell(index + 1, "wa");
  }, []);

  /** Met à jour une cellule (Wa/Wd) et renvoie la ligne résultante. */
  const setRowField = (index: number, field: "wa" | "wd", value: string): Row => {
    const updated: Row = { ...rows[index]!, [field]: value };
    setRows((prev) => prev.map((r, i) => (i === index ? updated : r)));
    return updated;
  };

  const clearError = (key: string) =>
    setErrors((prev) => {
      if (!(key in prev)) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });

  const setValue = (index: number, field: "wa" | "wd", value: string) => {
    markDirty();
    clearError(`${index}-${field}`);
    setRows((prev) =>
      prev.map((r, i) => (i === index ? { ...r, [field]: cleanWeight(value) } : r)),
    );
  };

  const handleBlur = (index: number, field: "wa" | "wd", value: string) => {
    const key = `${index}-${field}`;
    const cleaned = cleanWeight(value);
    if (cleaned === "") {
      clearError(key);
      checkCoherence(index, setRowField(index, field, ""));
      return;
    }
    const num = parseWeight(cleaned);
    if (num === null) {
      setErrors((prev) => ({ ...prev, [key]: "Valeur invalide (5-99, nombre entier)" }));
      return;
    }
    clearError(key);
    checkCoherence(index, setRowField(index, field, num.toString()));
  };

  /** Applique (ou lève) l'alerte de cohérence Wa > Wd sur les deux cellules d'une touche. */
  const checkCoherence = (index: number, row: Row) => {
    const wa = parseWeight(row.wa);
    const wd = parseWeight(row.wd);
    const waKey = `${index}-wa`;
    const wdKey = `${index}-wd`;
    if (wa !== null && wd !== null && wa <= wd) {
      setErrors((prev) => ({ ...prev, [waKey]: COHERENCE_MESSAGE, [wdKey]: COHERENCE_MESSAGE }));
      showCoherencePopover(index);
      return;
    }
    if (coherenceIndex === index) setCoherenceIndex(null);
    setErrors((prev) => {
      const next = { ...prev };
      if (next[waKey] === COHERENCE_MESSAGE) delete next[waKey];
      if (next[wdKey] === COHERENCE_MESSAGE) delete next[wdKey];
      return next;
    });
  };

  const compute = (r: Row) => {
    const wa = parseWeight(r.wa);
    const wd = parseWeight(r.wd);
    if (wa === null || wd === null) return { friction: "", balance: "" };
    return {
      friction: ((wa - wd) / 2).toFixed(1),
      balance: ((wa + wd) / 2).toFixed(1),
    };
  };

  const formatAverageResult = (value: string) => {
    if (value === "—") return <span className="!text-2xl">—</span>;
    const [integer, decimal] = value.split(".");
    return (
      <>
        {integer}
        <span className="!text-2xl">.{decimal}</span>
      </>
    );
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

  // --- Gate global (navigation Comparer) ----------------------------------------

  useEffect(() => {
    saisieGate.hasData = () => hasAnyMeasurement(rows);
    return () => {
      saisieGate.hasData = null;
    };
  }, [rows]);

  // --- Export & sauvegarde cloud -------------------------------------------------

  const guardExport = (anchor: "save" | "export" = "save") => {
    // Contrôle anti-robot : échec silencieux, aucun message affiché.
    if (!passesBotChecks(honeypot)) return false;
    const formIncomplete =
      !canEnterWeights ||
      (info["entretien"] === "Modifications importantes" && !(info["remarques"] ?? "").trim());
    // PRIORITÉ 1 : fiche d'informations incomplète.
    if (formIncomplete) {
      showTopbarAlert(anchor, FORM_INCOMPLETE_MESSAGE);
      return false;
    }
    // PRIORITÉ 2 : paire Wa/Wd incomplète sur au moins une touche.
    if (orphanKeys.length > 0) {
      showOrphanPopover(orphanKeys[0]!);
      return false;
    }
    // PRIORITÉ 3 : règle d'octave non remplie (fiche complète uniquement).
    if (octaveGaps.length > 0) {
      showTopbarAlert(anchor, OCTAVE_RULE_MESSAGE);
      return false;
    }
    return true;
  };

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
    const filename = buildExportFilename(
      info["marque"],
      info["modele"],
      info["sn_num"],
      new Date(),
    );
    downloadCsv(filename, buildCsv(meta, rows));
  };

  // --- Rapport PDF Premium (A4 paysage, 2 pages) -----------------------------------

  const serialFull = `${info["sn_prefix"] ?? ""}${info["sn_num"] ?? ""}${info["sn_suffix"] ?? ""}`;

  const chartData = useMemo<ChartPoint[]>(
    () =>
      rows.map((r, i) => {
        const wa = parseWeight(r.wa);
        const wd = parseWeight(r.wd);
        const valid = wa !== null && wd !== null && wa > wd;
        return {
          key: i + 1,
          wa,
          wd,
          friction: valid ? Number(((wa - wd) / 2).toFixed(1)) : null,
          balance: valid ? Number(((wa + wd) / 2).toFixed(1)) : null,
        };
      }),
    [rows],
  );

  /** Compose et télécharge directement le rapport PDF (aucun panneau d'impression). */
  const exportPdfFile = async () => {
    const page1 = [pdfInfoRef.current, moyennesRef.current, mesuresRef.current].filter(
      (el): el is HTMLElement => el !== null,
    );
    const page2 = [moyennesRef.current, pdfChartRef.current].filter(
      (el): el is HTMLElement => el !== null,
    );
    if (page1.length === 0) return;
    const filename = buildExportFilename(
      info["marque"],
      info["modele"],
      info["sn_num"],
      new Date(),
      "pdf",
    );
    await generateLandscapeReport(page1, page2, filename);
  };

  // --- Import (CSV local / historique en ligne) -----------------------------------

  /** Applique un fichier CSV Touchweight au formulaire et aux 88 pesées. */
  const importCsvContent = (content: string) => {
    try {
      const { meta, rows: imported } = parseDiagnosticCsv(content);
      setRows(imported.map((r) => ({ wa: cleanWeight(r.wa), wd: cleanWeight(r.wd) })));
      setInfo((prev) => ({
        ...prev,
        marque: meta["Marque"] ?? prev["marque"] ?? "",
        type_piano: meta["Type de piano"] ?? prev["type_piano"] ?? "",
        modele: meta["Modèle"] ?? prev["modele"] ?? "",
        sn_prefix: meta["Préfixe lettre"] ?? prev["sn_prefix"] ?? "",
        sn_num: meta["Numéro de série"] ?? prev["sn_num"] ?? "",
        sn_suffix: meta["Suffixe lettre"] ?? prev["sn_suffix"] ?? "",
        fabrication: meta["Date de fabrication"] ?? prev["fabrication"] ?? "",
        pays: meta["Pays"] ?? prev["pays"] ?? "",
        ville: meta["Ville"] ?? prev["ville"] ?? "",
        entretien: meta["Type d'entretien"] ?? prev["entretien"] ?? "",
        remarques: meta["Remarques"] ?? prev["remarques"] ?? "",
      }));
      fabricationTouched.current = true;
      setCurrentDbId(null);
      markDirty();
      showTopbarAlert("import", "Fichier CSV importé.");
    } catch {
      showTopbarAlert("import", INVALID_CSV_MESSAGE);
    }
  };

  const onImportFile = (file: File | undefined) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => importCsvContent(String(reader.result ?? ""));
    reader.onerror = () => showMessage("⚠️ Lecture du fichier impossible.");
    reader.readAsText(file, "utf-8");
  };

  /** Recherche l'historique en ligne et peuple le sous-menu de la flèche [Importer ▼]. */
  const historyRowsRef = useRef<DiagnosticHistoryRow[]>([]);

  const formatHistoryLabel = (iso: string) => {
    const date = new Date(iso);
    const label = new Intl.DateTimeFormat("fr-FR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(date);
    return `Pesée du ${label.replace(/^(\d+ )(\w)/, (_m, d: string, m: string) => d + m.toUpperCase())}`;
  };

  const importFromHistory = async () => {
    const serial = (info["sn_num"] ?? "").trim();
    if (!serial) {
      showTopbarAlert(
        "import",
        "⚠️ Veuillez saisir d'abord le numéro de série du piano pour rechercher son historique en ligne.",
      );
      return;
    }
    try {
      const history = (await getOwnDiagnostics(getFingerprint(), serial))
        .slice()
        .sort((a, b) => b.date_heure_saisie.localeCompare(a.date_heure_saisie));
      if (history.length === 0) {
        setTopbarState({ historyRows: [] });
        historyRowsRef.current = [];
        showTopbarAlert("import", "Aucune fiche en ligne trouvée pour ce numéro de série.");
        return;
      }
      historyRowsRef.current = history;
      setTopbarState({
        historyRows: history.map((row) => ({ id: row.id, label: formatHistoryLabel(row.date_heure_saisie) })),
      });
    } catch {
      showTopbarAlert("import", "⚠️ La recherche dans l'historique en ligne a échoué.");
    }
  };

  /** Restaure la pesée choisie dans la liste chronologique de l'historique en ligne. */
  const restoreHistoryRow = (id: string) => {
    const row = historyRowsRef.current.find((entry) => entry.id === id);
    if (!row) return;
    const wa = Array.isArray(row.mesures_wa) ? (row.mesures_wa as unknown[]) : [];
    const wd = Array.isArray(row.mesures_wd) ? (row.mesures_wd as unknown[]) : [];
    setRows(
      Array.from({ length: 88 }, (_, i) => ({
        wa: cleanWeight(String(wa[i] ?? "")),
        wd: cleanWeight(String(wd[i] ?? "")),
      })),
    );
    setInfo((prev) => ({
      ...prev,
      marque: row.marque ?? "",
      type_piano: row.type_piano ?? "",
      modele: row.modele ?? "",
      sn_prefix: row.prefixe_lettre ?? "",
      sn_num: row.numero_central ?? prev["sn_num"] ?? "",
      sn_suffix: row.suffixe_lettre ?? "",
      fabrication: row.annee_fabrication ? String(row.annee_fabrication) : "",
      pays: row.pays ?? "",
      ville: row.ville ?? "",
      entretien: row.type_entretien ?? "",
      remarques: row.remarques ?? "",
    }));
    fabricationTouched.current = true;
    setCurrentDbId(row.id);
    setIsDirty(false);
    setTopbarState({ historyRows: [] });
    historyRowsRef.current = [];
    showTopbarAlert("import", "Fiche restaurée depuis l'historique en ligne.");
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
      showTopbarAlert("save", mode === "update" ? SAVE_UPDATE_MESSAGE : SAVE_NEW_MESSAGE);
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

  // --- Synchronisation avec la barre supérieure -----------------------------------

  useEffect(() => {
    setTopbarState({
      exportReady,
      measuresReady: requiredSheetFieldsComplete && keyboardValid,
      serialFilled: Boolean(info["sn_num"]?.trim()),
      isExporting,
      isDirty,
      hasSaved: Boolean(currentDbId),
      historyRows: info["sn_num"]?.trim() ? getTopbarState().historyRows : [],
    });
    return () => {
      setTopbarState({
        exportReady: false,
        measuresReady: false,
        serialFilled: false,
        isExporting: false,
        isDirty: false,
        hasSaved: false,
        historyRows: [],
      });
    };
  }, [exportReady, requiredSheetFieldsComplete, keyboardValid, info, isExporting, isDirty, currentDbId]);

  useEffect(() => {
    const exportCsvOnly = () => {
      if (!guardExport("export")) return;
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
    const onPdf = () => {
      if (!guardExport("export")) return;
      setIsExporting(true);
      void exportPdfFile()
        .catch(() => showTopbarAlert("export", "⚠️ La génération du rapport PDF a échoué."))
        .finally(() => setIsExporting(false));
      // Sauvegarde cloud simultanée (UPDATE ou INSERT selon l'état de la fiche).
      if (currentDbId && isDirty) {
        setAskUpdate(true);
        return;
      }
      void syncAndFinish(currentDbId ? "update" : "insert");
    };
    const onCompareGuard = () => setAskCompare(true);
    const onReset = () => setConfirmReset("rows");

    const handlers: Record<string, EventListener> = {
      "piano-export": onExport,
      "piano-export-csv": exportCsvOnly,
      "piano-export-pdf": onPdf,
      "piano-export-cloud": saveCloud,
      "piano-save-cloud": saveCloud,
      "piano-save": saveCloud,
      "piano-save-quick": quickSave,
      "piano-compare-guard": onCompareGuard,
      "piano-reset": onReset,
      "piano-import-csv": () => importInputRef.current?.click(),
      "piano-import-history": () => void importFromHistory(),
      "piano-import-history-row": (event: Event) =>
        restoreHistoryRow((event as CustomEvent<string>).detail),
    };

    Object.entries(handlers).forEach(([type, fn]) => window.addEventListener(type, fn));
    return () =>
      Object.entries(handlers).forEach(([type, fn]) => window.removeEventListener(type, fn));
  }, [rows, info, currentDbId, isDirty, honeypot, climateZone, profile]);

  // --- Rendu : champ de saisie d'un poids (Wa ou Wd) ------------------------------

  const renderWeightInput = (index: number, field: "wa" | "wd", isBlack: boolean) => (
    <div
      className={`weight-fields weight-fields-${field}`}
      onClick={() => {
        if (!canEnterWeights) showBlockMessage(index, field);
      }}
    >
      <input
        ref={(el) => {
          inputs.current[`${index}-${field}`] = el;
        }}
        value={rows[index]![field]}
        onChange={(e) => canEnterWeights && setValue(index, field, e.target.value)}
        onBlur={(e) => canEnterWeights && handleBlur(index, field, e.target.value)}
        onKeyDown={(e) => {
          if (!canEnterWeights) {
            e.preventDefault();
            showBlockMessage(index, field);
            return;
          }
          if (e.key === "Enter") {
            handleBlur(index, field, e.currentTarget.value);
          }
          onKeyDown(e, index, field);
        }}
        onBeforeInput={(e) => {
          if (!canEnterWeights) {
            e.preventDefault();
            showBlockMessage(index, field);
          }
        }}
        inputMode="numeric"
        aria-label={`${field === "wa" ? "Wa" : "Wd"} touche ${index + 1}`}
        title={errors[`${index}-${field}`] ?? undefined}
        onFocus={(e) => e.currentTarget.select()}
        className={`weight-input !font-sans font-semibold !text-black ${isBlack ? "" : "![background-color:#cbd5e1]"} ${orphanKeys.includes(index) ? "!border-red-500" : ""} ${errors[`${index}-${field}`] ? "error" : ""}`}
        style={isBlack ? { backgroundColor: "#cbd5e1" } : undefined}
      />
    </div>
  );

  // --- Rendu : une section de 44 touches -----------------------------------------

  const renderSection = (from: number, to: number, gridRef: (n: HTMLDivElement | null) => void) => (
    <section
      className="mt-2 flex w-full flex-col items-center"
      aria-label={`Touches ${from} à ${to}`}
    >
      <div className="technical-sheet">
        <div className={`technical-labels ${SIDE_LABEL_CLASS}`} aria-hidden="true">
          <div className="label-key" />
          <div className="label-wa" title="The minimum weight required to make the key move down.">
            Poids Desc. (Wa)
          </div>
          <div className="label-wd" title="The maximum weight the key can lift when returning up.">
            Poids Asc. (Wd)
          </div>
          <div
            className="label-wa-white"
            title="The minimum weight required to make the key move down."
          >
            Poids Desc. (Wa)
          </div>
          <div
            className="label-wd-white"
            title="The maximum weight the key can lift when returning up."
          >
            Poids Asc. (Wd)
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
                  {renderWeightInput(index, "wa", black)}
                  {renderWeightInput(index, "wd", black)}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      {(["friction", "balance"] as const).map((kind) => (
        <div className="result-sheet" key={kind}>
          <div className={`result-label ${SIDE_LABEL_CLASS}`}>
            {kind === "friction" ? "Friction" : "Balance"}
          </div>
          <div className="result-grid">
            {rows.slice(from - 1, to).map((row, offset) => {
              const index = from - 1 + offset;
              const black = BLACK_KEYS.has(index + 1);
              const value = compute(row)[kind];
              return (
                <div key={index} className={`result-col ${black ? "is-black" : "is-white"}`}>
                  <div className="result-strip">{black ? formatResult(value) : null}</div>
                  <div className={`result-value ${(kind === "balance" || kind === "friction") && !black ? "!overflow-visible" : ""}`}>
                    <span className={`rv-text !text-center !whitespace-nowrap !overflow-visible ${(kind === "balance" || kind === "friction") && !black ? "!w-[125%] !max-w-none !px-0" : "!w-full !px-0.5"}`}>
                      {black ? null : formatResult(value)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </section>
  );

  // --- Rendu : page ----------------------------------------------------------------

  return (
    <main className={`mx-auto max-w-[1400px] px-6 ${weighingMode ? "py-3" : "py-10"}`}>
      {!weighingMode && (
      <div
        data-dirty={isDirty}
        data-saved-at={savedAt ?? ""}
        data-climate-zone={climateZone ?? ""}
      >
        <Frame title="Informations piano" className="mt-10 [&_input]:border-foreground/60">
          <div className="absolute right-10 top-10 z-10">
            {confirmReset === "info" && (
              <div className="absolute bottom-full right-0 mb-2 flex min-w-max items-center gap-2 !rounded-md !border !border-yellow-300 !bg-[#fef08a] px-3 py-2 text-sm font-medium !text-gray-950 !shadow-lg">
                <span>Voulez-vous effacer toutes les infos piano saisies ?</span>
                <button type="button" className="rounded border border-gray-950/40 px-2 py-0.5 font-bold !text-gray-950" onClick={() => { resetInfo(); setConfirmReset(null); }}>Oui</button>
                <button type="button" className="rounded border border-gray-950/40 px-2 py-0.5 font-bold !text-gray-950" onClick={() => setConfirmReset(null)}>Non</button>
              </div>
            )}
            <button
              type="button"
              onClick={() => setConfirmReset("info")}
              title="Réinitialiser uniquement la fiche d'informations"
              className="rounded-md border border-input bg-background px-4 py-1.5 !text-[0.8rem] font-bold text-muted-foreground transition-colors hover:bg-accent"
            >
              Reset
            </button>
          </div>
          <div className="mt-3 grid gap-1.5 sm:grid-cols-2 md:grid-cols-[1fr_210px_1fr_1fr]">
            <label className={FIELD_LABEL_CLASS}>
              Marque<span className="!text-sm !font-bold !text-gray-950 !ml-1 inline-block">*</span>
              <SmartCombobox
                value={info["marque"] ?? ""}
                options={BRAND_SUGGESTIONS}
                placeholder="Saisissez une marque (ex: YAMAHA, PLEYEL...)"
                onTyping={markDirty}
                onCommit={(v) => {
                  updateInfo("marque", v);
                  if ((info["modele"] ?? "") !== "") updateInfo("modele", "");
                }}
              />
            </label>

            <fieldset className={FIELD_LABEL_CLASS} data-keep-model-open>
              <legend>Type de piano<span className="!text-sm !font-bold !text-gray-950 !ml-1 inline-block">*</span></legend>
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
                        modelComboRef.current?.open();
                      }}
                    />
                    {t}
                  </label>
                ))}
              </div>
            </fieldset>

            <label className={FIELD_LABEL_CLASS}>
              Modèle<span className="!text-sm !font-bold !text-gray-950 !ml-1 inline-block">*</span>
              <SmartCombobox
                ref={modelComboRef}
                value={info["modele"] ?? ""}
                options={modelsFor(info["marque"] ?? "", info["type_piano"])}
                groups={modelGroupsFor(info["marque"] ?? "", info["type_piano"])}
                disabled={!info["marque"]?.trim()}
                openOnFocus
                keepOpenSelector="[data-keep-model-open]"
                className="!bg-white"
                placeholder="Saisissez ou cherchez un modèle..."
                onTyping={markDirty}
                onCommit={(v) => {
                  updateInfo("modele", v);
                  const inferred = inferTypeFromModel(info["marque"] ?? "", v);
                  if (inferred) updateInfo("type_piano", inferred);
                }}
              />
            </label>

            <div className="text-xs text-muted-foreground sm:col-span-2 md:col-span-4" style={{ marginTop: "12px", paddingTop: "0px", display: "block" }}>
              <span className={FIELD_LABEL_CLASS}>Numéro de série<span className="!text-sm !font-bold !text-gray-950 !ml-1 inline-block">*</span></span>{" "}
              <span className="text-muted-foreground">
                (Reportez le numéro du cadre métallique - inclure les lettres si existantes).
              </span>
              <div className="mt-1 flex items-end justify-start gap-4">
                <div className="flex items-end gap-2">
                  <label className={`min-w-[80px] ${SUB_LABEL_CLASS}`}>
                     <span className="block whitespace-nowrap">Lettre</span>
                    <input
                      ref={(el) => {
                        snRef.current["sn_prefix"] = el;
                      }}
                      value={info["sn_prefix"] ?? ""}
                      onChange={(e) => onPrefixChange(e.target.value)}
                      disabled={!rule.prefix}
                      placeholder="ex: J, F"
                      className={`${INPUT_CLASS} max-w-[80px]`}
                    />
                  </label>
                  <label className={`min-w-[150px] ${SUB_LABEL_CLASS}`}>
                    <span className="block whitespace-nowrap">N° de série<span className="!text-sm !font-bold !text-gray-950 !ml-1 inline-block">*</span></span>
                    <input
                      ref={(el) => {
                        snRef.current["sn_num"] = el;
                      }}
                      value={info["sn_num"] ?? ""}
                      onChange={(e) => updateInfo("sn_num", e.target.value.replace(/[^0-9]/g, ""))}
                      required
                      inputMode="numeric"
                      placeholder="Chiffres"
                      className={`${INPUT_CLASS} max-w-[150px]`}
                    />
                  </label>
                  <label className={`min-w-[80px] ${SUB_LABEL_CLASS}`}>
                    <span className="block whitespace-nowrap">Lettre fin</span>
                    <input
                      value={info["sn_suffix"] ?? ""}
                      onChange={(e) =>
                        updateInfo("sn_suffix", e.target.value.toUpperCase().slice(0, 3))
                      }
                      disabled={!rule.suffix}
                      placeholder="ex: A, B"
                      className={`${INPUT_CLASS} max-w-[80px]`}
                    />
                  </label>
                </div>
                <label className={`min-w-[120px] ${SUB_LABEL_CLASS}`}>
                  <span className="block whitespace-nowrap">Date fabrication</span>
                  <input
                    value={info["fabrication"] ?? ""}
                    onChange={(e) => {
                      fabricationTouched.current = true;
                      updateInfo("fabrication", e.target.value);
                    }}
                    className={`${INPUT_CLASS} max-w-[120px]`}
                  />
                </label>
                <div className="flex h-8 items-end text-xs text-black">
                  <span>
                    Profil d&apos;usine : <span className="text-foreground">{profile.label}</span>
                    {profile.frictionTarget !== null &&
                      ` — friction cible ${profile.frictionTarget} g`}
                  </span>
                </div>
              </div>
              {!serialFormatValid && (
                <p className="mt-1 text-[0.7rem] leading-snug text-destructive">
                  {SERIAL_FORMAT_ERROR}
                </p>
              )}
            </div>

            <label className={`mt-4 ${FIELD_LABEL_CLASS}`}>
              Pays<span className="!text-sm !font-bold !text-gray-950 !ml-1 inline-block">*</span>
              <SmartCombobox
                value={info["pays"] ?? ""}
                options={ALL_COUNTRIES}
                groups={[
                  { label: "Suggestions fréquentes", options: FREQUENT_COUNTRIES },
                  { label: "Tous les pays", options: SUGGESTED_COUNTRIES },
                ]}
                onTyping={markDirty}
                onCommit={(v) => updateInfo("pays", v)}
              />
            </label>

            <label className={`mt-4 ${FIELD_LABEL_CLASS}`}>
              <span className="flex items-center gap-2">
                Ville<span className="!text-sm !font-bold !text-gray-950 !ml-1 inline-block">*</span>
                {isGeocoding && <span className="text-[0.65rem] italic">Vérification…</span>}
              </span>
              <input
                value={info["ville"] ?? ""}
                disabled={!info["pays"]?.trim()}
                onChange={(e) => updateInfo("ville", normalizeCity(e.target.value))}
                onBlur={(e) => {
                  const city = normalizeCity(e.target.value);
                  updateInfo("ville", city);
                  resolveCity(city);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    const city = normalizeCity((e.target as HTMLInputElement).value);
                    updateInfo("ville", city);
                    resolveCity(city);
                  }
                }}
                className={`${INPUT_CLASS} !bg-white disabled:!bg-white`}
              />
            </label>

            <div
              className={`!flex !flex-row !items-center !flex-nowrap !gap-6 !w-full mt-4 ${FIELD_LABEL_CLASS} sm:col-span-2 md:col-span-4`}
              style={{ display: "flex", flexDirection: "row", alignItems: "center", flexWrap: "nowrap", gap: "24px", width: "100%" }}
            >
              <span className="shrink-0">Type d'entretien<span className="!text-sm !font-bold !text-gray-950 !ml-1 inline-block">*</span></span>
              {MAINTENANCE_OPTIONS.map((t) => (
                <label key={t} className="flex shrink-0 items-center gap-1 text-sm text-foreground">
                  <input
                    type="radio"
                    name="entretien"
                    value={t}
                    required
                    checked={info["entretien"] === t}
                    onChange={() => {
                      updateInfo("entretien", t);
                      if (t === "Modifications importantes") {
                        setTimeout(() => remarquesRef.current?.focus(), 0);
                      }
                    }}
                  />
                  {t}
                </label>
              ))}
            </div>

            <label className={`mt-6 ${FIELD_LABEL_CLASS} sm:col-span-2 md:col-span-4`}>
              <span className="inline-flex items-center">
                Remarques
                {remarquesRequired && (
                  <span className="!text-sm !font-bold !text-gray-950 !ml-1 inline-block">*</span>
                )}
              </span>
              <input
                ref={remarquesRef}
                required={remarquesRequired}
                aria-invalid={remarquesInvalid}
                placeholder={
                  remarquesRequired ? "⚠️ Veuillez indiquer les modifications" : undefined
                }
                value={info["remarques"] ?? ""}
                onChange={(e) => updateInfo("remarques", e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") e.preventDefault();
                }}
                className={`${INPUT_CLASS} placeholder:text-foreground placeholder:font-medium ${
                  remarquesInvalid
                    ? "border-destructive placeholder:text-foreground focus:border-destructive focus:ring-destructive"
                    : ""
                }`}
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
              className="pointer-events-none absolute -z-10 h-0 w-0 opacity-0"
            />

            <input
              ref={importInputRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => {
                onImportFile(e.target.files?.[0]);
                e.target.value = "";
              }}
            />

            <div className="mt-2 flex justify-end sm:col-span-2 md:col-span-4">
              <button
                ref={weighingBtnRef}
                type="button"
                onClick={onValidateWeighing}
                className="rounded-md bg-gray-900 px-5 py-2 text-sm font-bold text-white transition-colors hover:bg-gray-700"
              >
                Données de pesée ➔
              </button>
            </div>

          </div>
        </Frame>
      </div>
      )}

      {blockMessage && (
        <div
          className="fixed left-1/2 top-24 w-[min(90vw,32rem)] -translate-x-1/2 rounded-md border border-yellow-300 px-4 py-3 text-sm font-medium text-gray-950 shadow-lg"
          style={{ zIndex: 99999, backgroundColor: "rgba(254, 240, 138, 0.7)" }}
        >
          {blockMessage}
        </div>
      )}

      {blockAnchor && (
        <SvgTooltip
          x={blockAnchor.x}
          y={blockAnchor.y}
          text={blockAnchor.text ?? FORM_INCOMPLETE_MESSAGE}
        />
      )}

      {coherenceIndex !== null && coherenceAnchor && (
        <SvgTooltip x={coherenceAnchor.x} y={coherenceAnchor.y} text={COHERENCE_MESSAGE} />
      )}

      <Frame
        title={
          <>
            Moyennes <span className="text-sm font-normal">(auto)</span>
          </>
        }
        className={weighingMode ? "mt-4 !p-3 !pt-4" : "mt-8 !hidden"}
        innerRef={(node) => {
          moyennesRef.current = node;
        }}
      >
        {weighingMode && (
          <span className="!absolute !-top-3.5 !left-1/2 !-translate-x-1/2 !flex !items-center !gap-x-4 !whitespace-nowrap !w-auto !min-w-max !overflow-visible !bg-card !px-2 !text-gray-950 !font-medium">
            <span className="!whitespace-nowrap !w-auto !min-w-max !overflow-visible" style={{ fontSize: "0.83rem" }}>
              {info["marque"]} {info["modele"]} ({info["fabrication"]?.trim() || "—"}) -  SN {info["sn_num"]}  /  Mesure {new Date().toISOString().slice(0, 10)}
            </span>
            <button
              type="button"
              data-pdf-hide
              onClick={() => setWeighingMode(false)}
              className="!whitespace-nowrap !w-auto !min-w-max !overflow-visible rounded-md border border-input bg-background px-2.5 py-0.5 !text-xs font-medium !text-gray-950 transition-colors hover:bg-accent"
            >
              Modifier infos piano
            </button>
          </span>
        )}
        <div className={`grid grid-cols-4 ${weighingMode ? "mt-0.5 !gap-2.5" : "mt-2 gap-3"}`}>
          {(
            [
              { key: "wa", label: "Poids descendant (Wa)" },
              { key: "wd", label: "Poids ascendant (Wd)" },
              { key: "friction", label: "Friction" },
              { key: "balance", label: "Balance" },
            ] as const
          ).map(({ key, label }) => (
            <div key={key} className="rounded bg-muted px-2 py-1.5 text-center">
              <div className="!text-[1.1rem] font-bold tracking-wide text-muted-foreground">
                {label}
              </div>
              <div className="mt-1 !text-2xl font-semibold tabular-nums">
                {formatAverageResult(sectionAverages.global[key])}
              </div>
              <div className="mt-0.5 flex justify-center gap-2 text-[0.65rem] text-muted-foreground tabular-nums">
                <span>{sectionAverages.first[key]}</span>
                <span className="text-muted-foreground">/</span>
                <span>{sectionAverages.second[key]}</span>
              </div>
              <div className="flex justify-center gap-2 text-[0.55rem] text-muted-foreground tabular-nums">
                <span className="!text-xs font-medium">1-44</span>
                <span className="invisible">/</span>
                <span className="!text-xs font-medium">45-88</span>
              </div>
            </div>
          ))}
        </div>
      </Frame>

      <Frame
        title={
          <>
            Mesures poids de touches{" "}
            <span className="text-sm font-normal normal-case">
              (minimum 1 blanche + 1 noire par octave. ex : tous les do et do#. shift+tab saute de do en do.)
            </span>
          </>
        }
        className={weighingMode ? "mt-4 pb-4" : "mt-8 pb-10 !hidden"}
        innerRef={(node) => {
          mesuresRef.current = node;
        }}
      >
        <div className="absolute left-[calc(1rem+4rem)] top-12 z-10 -translate-x-1/2 -translate-y-1/2">
          {confirmReset === "rows" && (
            <div className="absolute bottom-full left-1/2 mb-2 flex min-w-max -translate-x-1/2 items-center gap-2 !rounded-md !border !border-yellow-300 !bg-[#fef08a] px-3 py-2 text-sm font-medium !text-gray-950 !shadow-lg">
              <span>Voulez-vous effacer toutes les données de poids saisies ?</span>
              <button type="button" className="rounded border border-gray-950/40 px-2 py-0.5 font-bold !text-gray-950" onClick={() => { setRows(EMPTY); setConfirmReset(null); }}>Oui</button>
              <button type="button" className="rounded border border-gray-950/40 px-2 py-0.5 font-bold !text-gray-950" onClick={() => setConfirmReset(null)}>Non</button>
            </div>
          )}
          <button
            type="button"
            data-pdf-hide
            onClick={() => setConfirmReset("rows")}
            className="rounded-md border border-input bg-background px-4 py-1.5 !text-[0.8rem] font-bold text-muted-foreground transition-colors hover:bg-accent"
          >
            Reset
          </button>
        </div>
        {keyboardValid && (
          <div
            data-pdf-hide
            className="pointer-events-none absolute left-0 top-1/2 z-10 flex w-32 justify-center"
            style={{ transform: "translateY(calc(-50% + 30px))" }}
          >
            <div className="flex items-center !rounded-md !border !border-green-600 !bg-green-100 !px-2.5 !py-1 !shadow-sm">
              <span className="text-[10px] font-semibold !text-gray-950">Clavier valide</span>
            </div>
          </div>
        )}
        <div className="mx-auto flex w-full flex-col items-center">
          {renderSection(1, 44, gridRef1)}
          {renderSection(45, 88, gridRef2)}
        </div>
      </Frame>

      {/* Conteneur hors écran dédié à la capture PDF (largeur bornée à 1024 px). */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed left-[-10000px] top-0 -z-10 w-[1024px] max-w-[1024px] bg-white p-4"
      >
        <div ref={pdfInfoRef} className="bg-white">
          <PdfInfoTable
            info={{
              marque: info["marque"] ?? "",
              modele: info["modele"] ?? "",
              typePiano: info["type_piano"] ?? "",
              serial: serialFull,
              fabrication: info["fabrication"] ?? "",
              profil:
                profile.frictionTarget !== null
                  ? `${profile.label} — friction cible ${profile.frictionTarget} g`
                  : profile.label,
              pays: info["pays"] ?? "",
              ville: info["ville"] ?? "",
              entretien: info["entretien"] ?? "",
              remarques: info["remarques"] ?? "",
            }}
          />
        </div>
        <div ref={pdfChartRef} className="mt-4 bg-white">
          <PdfComparisonChart data={chartData} frictionTarget={profile.frictionTarget} />
        </div>
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
