import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Redo2, RefreshCw, Undo2 } from "lucide-react";
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
import { buildCsv, buildExportFilename, downloadCsv, formatLocalDateTime } from "@/lib/export-csv";
import { parseDiagnosticCsv } from "@/lib/import-csv";
import { getLang, useLang } from "@/data/translations";
import { buildReportPdf, captureReportPages, rawPdfMirror } from "@/lib/pdf-report";
import { generateBlankFormPdf, generateBlankKeyboardPdf } from "@/lib/pdf-blank-form";

import { PdfComparisonChart, PdfInfoTable, type ChartPoint } from "@/components/PdfReportBlocks";
import { ComparisonChart, buildChartData, type RefProfile } from "@/routes/comparer";

import { buildCurrentPiano, loadCurrentPiano, saveCurrentPiano, saveCurrentPianoToCloud, upsertCurrentPianoBuffer, findHistoryProfileId, CURRENT_PIANO_KEY } from "@/lib/current-piano";

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
import { getTopbarState, setGateReady, setTopbarState, showTopbarAlert } from "@/lib/topbar-store";
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

/** Do# de chaque octave : échantillonnage minimal exigé avec les Do. */
const C_SHARP_KEYS = new Set([5, 17, 29, 41, 53, 65, 77]);

const PD_RANGE_MESSAGE =
  "⚠️ Valeur hors fourchette : Les pesées doivent être comprises entre 10 grammes et 90 grammes pour être conformes.";
const PEDAL_MESSAGE_FR =
  "⚠️ Attention : Valeur élevée détectée. Assurez-vous que la pédale de sustain (forte) est bien enfoncée à fond durant la mesure pour libérer les étouffoirs.";
const PEDAL_MESSAGE_EN =
  "⚠️ Warning: high value detected. Make sure the sustain pedal is fully pressed during the measurement to release the dampers.";
const PEDAL_HIDE_KEY = "ptw_hide_pedal_alert";
/** Profondeur de l'historique Undo / Redo (20 manipulations). */
const UNDO_LIMIT = 20;


type Row = { wa: string; wd: string };

const EMPTY: Row[] = Array.from({ length: 88 }, () => ({ wa: "", wd: "" }));

const DRAFT_ROWS_KEY = "ptw_draft_rows";
const DRAFT_INFO_KEY = "ptw_draft_info";

const FORM_INCOMPLETE_MESSAGE =
  "⚠️ Complétez d'abord Marque, Modèle, N° de série, Type de piano, Pays, ville et Type d'entretien avant de sauver.";
const SAVE_UPDATE_MESSAGE =
  "⚠️ Diagnostic synchronisé avec succès dans la base de données de l'application (Cloud)";
const SAVE_NEW_MESSAGE =
  "⚠️ Nouvelle session de suivi chronologique créée avec succès. Cette fiche historique est archivée de manière étanche dans la base de données cloud pour vos futures comparaisons.";
const ORPHAN_MESSAGE =
  "⚠️ Saisie incomplète : Le Poids Descendant et le Poids Remontant doivent être tous les deux renseignés pour cette touche.";
const COHERENCE_MESSAGE =
  "⚠️ Erreur mécanique : Le Poids Descendant (PD) doit être strictement supérieur au Poids Remontant (PR) pour calculer la Friction.";

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
          fill="#ffffff"
          opacity="1"
          stroke="#d1d5db"
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

const USAGE_OPTIONS = ["Low", "Medium", "Intensive"] as const;

/** Traduction d'affichage des options d'entretien (valeurs stockées en FR). */
const MAINTENANCE_LABELS_EN: Record<string, string> = {
  "Entretien usuel uniquement": "Routine maintenance only",
  "Réglages personnalisés": "Custom regulations",
  "Modifications importantes": "Major modifications",
};

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
      { title: "KeyWeight" },
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
  /** Ancre le message FF de fourchette sous la case fautive (persistant). */
  const [rangeAnchor, setRangeAnchor] = useState<{ x: number; y: number } | null>(null);
  const rangeTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** Clés dont le message FF est déjà consommé : interdiction de réapparition. */
  const rangeDismissed = useRef<Set<string>>(new Set());
  const rangeKeyRef = useRef<string | null>(null);
  const coherenceDismissed = useRef<Set<number>>(new Set());
  /** Mode pesée : formulaire masqué, bandeau résumé affiché. */
  const [weighingMode, setWeighingMode] = useState(false);
  /** Filtrage visuel cyclique des touches affichées à l'écran. */
  const [viewFilter, setViewFilter] = useState<"all" | "white" | "black">("all");

  /** Retour depuis Résultats / Comparer : on rouvre directement l'écran clavier. */
  useEffect(() => {
    try {
      if (window.sessionStorage.getItem("ptw_weighing_mode") === "1") setWeighingMode(true);
    } catch {
      /* stockage indisponible */
    }
  }, []);
  useEffect(() => {
    try {
      window.sessionStorage.setItem("ptw_weighing_mode", weighingMode ? "1" : "0");
    } catch {
      /* stockage indisponible */
    }
  }, [weighingMode]);
  const weighingBtnRef = useRef<HTMLButtonElement | null>(null);
  const [coherenceIndex, setCoherenceIndex] = useState<number | null>(null);
  const [coherenceAnchor, setCoherenceAnchor] = useState<{ x: number; y: number } | null>(null);
  const remarquesRef = useRef<HTMLInputElement | null>(null);
  const modelComboRef = useRef<SmartComboboxHandle | null>(null);
  const blockTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const coherenceTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  /** Miroir des erreurs : permet de verrouiller le curseur dans une case fautive. */
  const errorsRef = useRef<Record<string, string>>({});
  errorsRef.current = errors;
  /** Miroir des binômes incomplets (une seule case remplie sur la touche). */
  const orphanRef = useRef<number[]>([]);
  /** Binômes déclarés incomplets À LA SORTIE de la touche (cadre rouge). */
  const [incompletePairs, setIncompletePairs] = useState<number[]>([]);
  const incompleteRef = useRef<number[]>([]);
  incompleteRef.current = incompletePairs;
  /** Binôme actuellement verrouillé : interdiction absolue d'en sortir. */
  const lockedPairRef = useRef<number | null>(null);

  /** Badge vert retardé : ne s'allume qu'après 0,5 s sans cadre rouge ni erreur. */
  const [badgeVisible, setBadgeVisible] = useState(false);
  const badgeTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputs = useRef<Record<string, HTMLInputElement | null>>({});
  /** Miroir toujours à jour des 88 touches (évite les closures périmées). */
  const rowsRef = useRef<Row[]>(EMPTY);
  /** Miroir du mode pesée, lisible depuis les setTimeout. */
  const weighingModeRef = useRef(false);
  const snRef = useRef<Record<string, HTMLInputElement | null>>({});
  const fabricationTouched = useRef(false);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [climateZone, setClimateZone] = useState<ClimateZone | null>(null);
  const [honeypot, setHoneypot] = useState("");
  const [currentDbId, setCurrentDbId] = useState<string | null>(null);
  const [askUpdate, setAskUpdate] = useState(false);
  // Export demandé en attente de la décision cloud (modale INSERT/UPSERT).
  const pendingExport = useRef<"csv" | "pdf" | null>(null);
  // Navigation "Comparer" en attente de la décision cloud (modale INSERT/UPSERT).
  const pendingCompare = useRef(false);
  // Numéro de série effectivement enregistré : sert au CRITÈRE 1 (série inconnue → INSERT).
  const savedSerialRef = useRef<string>("");
  // Le consentement RGPD est confiné à la page Résultats (/resultats) : aucune
  // case à cocher ni alerte de partage n'existe sur la page Saisie.
  // Photographie des 88 touches et du jour du dernier envoi cloud (seuil des 5 touches).
  const savedRowsRef = useRef<Row[]>([]);
  const savedDateRef = useRef<string>("");
  const CLOUD_SESSION_STATE_KEY = "ptw_cloud_session_state";

  const [isExporting, setIsExporting] = useState(false);
  const importInputRef = useRef<HTMLInputElement | null>(null);
  const pdfInfoRef = useRef<HTMLDivElement | null>(null);
  const pdfChartRef = useRef<HTMLDivElement | null>(null);
  // Conteneur des 4 cadres web (mode N/B séparé) capturés tels quels pour les pages 2 et 3.
  const pdfFramesRef = useRef<HTMLDivElement | null>(null);

  const moyennesRef = useRef<HTMLElement | null>(null);
  const mesuresRef = useRef<HTMLElement | null>(null);
  const pdfMesuresRef = useRef<HTMLElement | null>(null);

  const navigate = useNavigate();
  const lang = useLang();
  const en = lang === "en";
  const gridRef1 = useSnappedGrid(1, 44);
  const gridRef2 = useSnappedGrid(45, 88);
  const pdfGridRef1 = useSnappedGrid(1, 44);
  const pdfGridRef2 = useSnappedGrid(45, 88);
  /** Alerte pédale de sustain (PD > 60) et son option « ne plus afficher ». */
  const [pedalAlert, setPedalAlert] = useState(false);
  const [undoStack, setUndoStack] = useState<Row[][]>([]);
  const [redoStack, setRedoStack] = useState<Row[][]>([]);
  const pedalCount = useRef(0);
  const pedalOrigin = useRef<{ index: number; field: "wa" | "wd" } | null>(null);

  const [hidePedalAlert, setHidePedalAlert] = useState(false);
  /** Valeur mémorisée avant effacement automatique au clic dans une case. */
  const prevWeight = useRef<Record<string, string>>({});

  // --- Persistance locale (filet de sécurité) -------------------------------

  const draftLoaded = useRef(false);
  useEffect(() => {
    // Hydratation au démarrage : le brouillon local prime, sinon current_piano.
    const saved = loadCurrentPiano();
    try {
      const raw = window.localStorage.getItem(DRAFT_ROWS_KEY);
      const parsed = raw ? (JSON.parse(raw) as Row[]) : null;
      if (Array.isArray(parsed) && parsed.length === 88 && parsed.some((r) => r.wa || r.wd)) {
        setRows(parsed);
      } else if (saved && Array.isArray(saved.wa_values) && saved.wa_values.length === 88) {
        setRows(
          saved.wa_values.map((wa, i) => ({
            wa: Number.isFinite(wa) ? String(wa) : "",
            wd: Number.isFinite(saved.wd_values?.[i]) ? String(saved.wd_values[i]) : "",
          })),
        );
      }
    } catch {
      /* stockage indisponible */
    }
    try {
      const rawInfo = window.localStorage.getItem(DRAFT_INFO_KEY);
      const parsedInfo = rawInfo ? (JSON.parse(rawInfo) as Record<string, string>) : null;
      if (parsedInfo && typeof parsedInfo === "object" && Object.keys(parsedInfo).length > 0) {
        setInfo(parsedInfo);
      } else if (saved) {
        setInfo({
          marque: saved.brand ?? "",
          modele: saved.model ?? "",
          type_piano: saved.type_piano ?? "",
          sn_num: saved.serial_number ?? "",
          fabrication: saved.manufacture_year ? String(saved.manufacture_year) : "",
          pays: saved.pays ?? "",
          ville: saved.ville ?? "",
          entretien: saved.maintenance_type ?? "",
          usage_level: saved.usage_level ?? "",
          remarques: saved.remarques ?? "",
        });
      }
    } catch {
      /* stockage indisponible */
    }
    // Le consentement n'est jamais restauré. Seul l'état technique de l'envoi
    // du numéro courant est conservé pour appliquer le seuil lors d'un retour depuis Comparer.
    try {
      const rawCloudState = window.sessionStorage.getItem(CLOUD_SESSION_STATE_KEY);
      const cloudState = rawCloudState
        ? (JSON.parse(rawCloudState) as { id?: string; serial?: string; date?: string; rows?: Row[] })
        : null;
      if (cloudState?.id && cloudState.serial) {
        setCurrentDbId(cloudState.id);
        savedSerialRef.current = cloudState.serial;
        savedDateRef.current = cloudState.date ?? "";
        savedRowsRef.current = Array.isArray(cloudState.rows) ? cloudState.rows : [];
      }
    } catch {
      /* stockage indisponible */
    }
    draftLoaded.current = true;
  }, []);

  // Maintien des miroirs réactifs (rows / mode pesée) pour les lectures différées.
  useEffect(() => {
    rowsRef.current = rows;
  }, [rows]);
  useEffect(() => {
    weighingModeRef.current = weighingMode;
  }, [weighingMode]);

  useEffect(() => {
    if (!draftLoaded.current) return;
    try {
      window.localStorage.setItem(DRAFT_ROWS_KEY, JSON.stringify(rows));
    } catch {
      /* stockage indisponible */
    }
  }, [rows]);

  // Miroir continu des métadonnées : chaque frappe est persistée immédiatement.
  useEffect(() => {
    if (!draftLoaded.current) return;
    try {
      window.localStorage.setItem(DRAFT_INFO_KEY, JSON.stringify(info));
    } catch {
      /* stockage indisponible */
    }
  }, [info]);

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

  /** Liste dynamique des champs obligatoires encore vides de la fiche piano. */
  const missingSheetFields = useMemo(() => {
    const checks: Array<[string, string]> = [
      ["marque", en ? "Brand" : "Marque"],
      ["modele", en ? "Model" : "Modèle"],
      ["sn_num", en ? "Serial number" : "N° de série"],
      ["type_piano", en ? "Type" : "Type"],
      ["pays", en ? "Country" : "Pays"],
      ["entretien", en ? "Maintenance" : "Entretien"],
    ];
    return checks.filter(([key]) => !String(info[key] ?? "").trim()).map(([, label]) => label);
  }, [info, en]);


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
  orphanRef.current = orphanKeys;

  /** Une touche est en anomalie : erreur mécanique, hors fourchette ou binôme
   *  déclaré incomplet À LA SORTIE de la touche (jamais pendant la frappe). */
  const pairHasError = (index: number) =>
    !!errorsRef.current[`${index}-wa`] ||
    !!errorsRef.current[`${index}-wd`] ||
    incompleteRef.current.includes(index);

  /** Case fautive du binôme sur laquelle le curseur doit rester capturé. */
  const pairErrorField = (index: number): "wa" | "wd" => {
    if (errorsRef.current[`${index}-wa`]) return "wa";
    if (errorsRef.current[`${index}-wd`]) return "wd";
    const row = rowsRef.current?.[index];
    if (row && row.wa.trim() === "") return "wa";
    return "wd";
  };




  /**
   * Validité instantanée du clavier (calcul brut, recalculé à chaque frappe) :
   * porte logique AND stricte.
   * TEST 1 (prioritaire) : touche orpheline (cadre rouge) ou erreur Wa<=Wd => faux.
   * TEST 2 (successif) : échantillonnage des octaves, uniquement si zéro cadre rouge.
   * Les carrés rouges s'affichent instantanément ; le badge vert, lui, est retardé
   * (voir badgeVisible) : il ne s'allume qu'après 0,5 s sans aucun cadre rouge.
   */
  const keyboardValid = useMemo(() => {
    const clean = (raw: unknown): string => String(raw ?? "").trim();
    const num = (raw: unknown): number | null => {
      const cleaned = clean(raw).replace(",", ".");
      if (!cleaned) return null;
      const n = Number(cleaned);
      return Number.isFinite(n) ? n : null;
    };

    const parsedRows = rows.map((row) => ({
      pd: num(row.wa),
      pr: num(row.wd),
      hasPd: Boolean(clean(row.wa)),
      hasPr: Boolean(clean(row.wd)),
    }));

    // CONDITION 1 : chaque mesure présente forme un binôme PD/PR.
    const cond1 = parsedRows.every((row) => row.hasPd === row.hasPr);

    // CONDITION 2 : tous les Do et Do# requis sont renseignés.
    const sampled = [...C_KEYS, ...C_SHARP_KEYS].filter((k) => k !== 88).sort((a, b) => a - b);
    const cond2 = sampled.every((key) => {
      const row = parsedRows[key - 1];
      return Boolean(row?.hasPd && row.hasPr);
    });

    const measuredRows = parsedRows.filter((row) => row.hasPd || row.hasPr);

    // CONDITION 3 : toutes les valeurs présentes sont numériques et PD est dans la plage 10–90.
    const cond3 = measuredRows.every(
      (row) => row.pd !== null && row.pr !== null && row.pd >= 10 && row.pd <= 90,
    );

    // CONDITION 4 : comparaison exclusivement numérique, jamais lexicographique.
    const cond4 = measuredRows.every(
      (row) => row.pd !== null && row.pr !== null && Number(row.pd) > Number(row.pr),
    );

    // CONDITION 5 : le profil contient au moins une mesure exploitable.
    const cond5 = measuredRows.length > 0;
    const complete88 =
      parsedRows.length === 88 &&
      parsedRows.every((row) => row.hasPd && row.hasPr && row.pd !== null && row.pr !== null);

    console.log("ÉTAT DE VALIDATION :", { cond1, cond2, cond3, cond4, cond5 });
    if (complete88) {
      console.log("[Saisie conforme] Profil complet : 88 touches numériques validées.");
      return true;
    }

    return cond1 && cond2 && cond3 && cond4 && cond5;
  }, [rows]);

  /**
   * Badge vert retardé : extinction instantanée dès qu'un cadre rouge apparaît,
   * allumage uniquement après un délai de sécurité de 500 ms pendant lequel
   * le clavier reste strictement valide (octaves complètes + zéro cadre rouge).
   */
  useEffect(() => {
    if (!keyboardValid) {
      if (badgeTimeout.current) {
        clearTimeout(badgeTimeout.current);
        badgeTimeout.current = null;
      }
      setBadgeVisible(false);
      return;
    }
    if (badgeTimeout.current) clearTimeout(badgeTimeout.current);
    badgeTimeout.current = setTimeout(() => {
      setBadgeVisible(true);
    }, 500);
    return () => {
      if (badgeTimeout.current) {
        clearTimeout(badgeTimeout.current);
        badgeTimeout.current = null;
      }
    };
  }, [keyboardValid]);

  /** Remarques obligatoires dès que des modifications importantes sont déclarées. */
  const remarquesRequired = info["entretien"] === "Modifications importantes";
  const remarquesInvalid = remarquesRequired && !(info["remarques"] ?? "").trim();

  /**
   * Téléporte le curseur dans la première case PD (Touche 1 / La0).
   * SÉCURITÉ ABSOLUE : la lecture se fait sur rowsRef (données réellement
   * chargées) et le focus est INTERDIT si la moindre touche est déjà saisie —
   * le curseur ne se place que sur un piano intégralement vierge.
   */
  const focusFirstWeight = useCallback(() => {
    setTimeout(() => {
      const current = rowsRef.current;
      if (hasAnyMeasurement(current)) return; // profil chargé ou en cours : on ne touche à rien
      if ((current[0]?.wa ?? "").trim() !== "") return;
      inputs.current["0-wa"]?.focus({ preventScroll: true });
      inputs.current["0-wa"]?.select();
    }, 100);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * Au chargement de la page en mode pesée, le curseur se place sur le PD du La 0,
   * uniquement après la fin de l'hydratation (setTimeout 150 ms) et uniquement
   * si le piano chargé est intégralement vierge.
   */
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!draftLoaded.current) return; // hydratation non terminée : interdit
      if (!weighingModeRef.current) return;
      focusFirstWeight();
    }, 150);
    try {
      if (window.sessionStorage.getItem(PEDAL_HIDE_KEY) === "1") setHidePedalAlert(true);
    } catch {
      /* stockage indisponible */
    }
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** Message « Complétez : ... » affiché uniquement au clic sur le bouton. */
  const [missingFlash, setMissingFlash] = useState(false);
  const missingFlashTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);



  /** Validation consciente de la fiche : alerte si incomplète, sinon mode pesée. */
  const onValidateWeighing = useCallback(() => {
    if (!requiredSheetFieldsComplete) {
      setMissingFlash(true);
      if (missingFlashTimeout.current) clearTimeout(missingFlashTimeout.current);
      missingFlashTimeout.current = setTimeout(() => {
        setMissingFlash(false);
        missingFlashTimeout.current = null;
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
    try {
      window.localStorage.removeItem(DRAFT_INFO_KEY);
      window.sessionStorage.setItem("ptw_weighing_mode", "0");
    } catch {
      /* stockage indisponible */
    }
    setInfo({});
    setClimateZone(null);
    setCurrentDbId(null);
    setErrors({});
    fabricationTouched.current = false;
    // Verrou de sécurité : le bouton « Mesures clavier » redevient neutre et inactif.
    setWeighingMode(false);
    setGateReady(false);
    setTopbarState({ measuresReady: false, exportReady: false });
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
    // Aucune réapparition automatique : une alerte déjà consommée reste fermée
    // tant que l'artisan n'a pas retapé un chiffre sur cette touche.
    if (coherenceDismissed.current.has(index)) return;
    if (coherenceTimeout.current) clearTimeout(coherenceTimeout.current);
    const el = inputs.current[`${index}-wd`];
    if (el) {
      const r = el.getBoundingClientRect();
      setCoherenceAnchor({ x: r.right + 8, y: r.top });
    }
    setCoherenceIndex(index);
    coherenceTimeout.current = setTimeout(() => {
      coherenceDismissed.current.add(index);
      setCoherenceIndex(null);
      setCoherenceAnchor(null);
      coherenceTimeout.current = null;
    }, 5000);
  };

  useEffect(() => {
    const dismissCoherencePopover = () => {
      setCoherenceIndex((prev) => {
        if (prev !== null) coherenceDismissed.current.add(prev);
        return null;
      });
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

  /** Message FF de fourchette : ancré juste en dessous de la case fautive,
   *  effacé automatiquement après 5 secondes maximum. Une fois estompé ou
   *  fermé, il ne peut PLUS réapparaître tant que l'artisan n'a pas tapé une
   *  nouvelle valeur dans la case (aucune réapparition cyclique). */
  const showRangeMessage = (index: number, field: "wa" | "wd") => {
    const key = `${index}-${field}`;
    if (rangeDismissed.current.has(key)) return;
    if (rangeTimeout.current) clearTimeout(rangeTimeout.current);
    rangeKeyRef.current = key;
    const el = inputs.current[key];
    const r = el?.getBoundingClientRect();
    if (r) {
      setRangeAnchor({ x: Math.min(r.left, window.innerWidth - 290), y: r.bottom + 6 });
    } else {
      setRangeAnchor({ x: window.innerWidth / 2 - 200, y: 160 });
    }
    // Sélection automatique des 2 chiffres : l'artisan retape directement.
    setTimeout(() => {
      const input = inputs.current[key];
      if (input && document.activeElement === input) input.select();
    }, 0);
    rangeTimeout.current = setTimeout(() => {
      if (rangeKeyRef.current) rangeDismissed.current.add(rangeKeyRef.current);
      setRangeAnchor(null);
      rangeTimeout.current = null;
    }, 5000);
  };

  /** Efface instantanément le message FF de fourchette (clic, correction…). */
  const hideRangeMessage = (permanent = false) => {
    if (rangeTimeout.current) {
      clearTimeout(rangeTimeout.current);
      rangeTimeout.current = null;
    }
    if (permanent && rangeKeyRef.current) rangeDismissed.current.add(rangeKeyRef.current);
    setRangeAnchor(null);
  };

  // Un clic n'importe où sur la page efface définitivement le message de fourchette.
  useEffect(() => {
    const dismiss = () => hideRangeMessage(true);
    document.addEventListener("pointerdown", dismiss);
    return () => {
      document.removeEventListener("pointerdown", dismiss);
      if (rangeTimeout.current) clearTimeout(rangeTimeout.current);
    };
  }, []);

  // Clic en dehors des zones de saisie du clavier alors qu'un binôme reste en
  // anomalie (hors fourchette ou incohérence mécanique) : le message FF est
  // effacé, le blocage levé, les DEUX cases du binôme sont vidées et le focus
  // revient automatiquement sur le Poids Descendant du binôme nettoyé.
  useEffect(() => {
    const onOutsidePointerDown = (e: PointerEvent) => {
      const target = e.target as HTMLElement | null;
      if (target?.closest(".weight-input")) return;
      const locked = lockedPairRef.current;
      if (locked === null) return;
      const hasCellError =
        !!errorsRef.current[`${locked}-wa`] || !!errorsRef.current[`${locked}-wd`];
      if (!hasCellError) return;
      // Erreur mécanique (PR >= PD) : on ferme seulement le message FF et on
      // pré-sélectionne les 2 chiffres du Poids Remontant (case du bas) pour
      // une re-saisie directe. Les valeurs ne sont JAMAIS effacées.
      const mechanical = errorsRef.current[`${locked}-wd`] === COHERENCE_MESSAGE;
      if (mechanical) {
        e.preventDefault();
        setCoherenceIndex(null);
        setCoherenceAnchor(null);
        hideRangeMessage(true);
        setTimeout(() => {
          const input = inputs.current[`${locked}-wd`];
          if (!input) return;
          input.focus();
          input.select();
        }, 0);
        return;
      }
      lockedPairRef.current = null;
      hideRangeMessage(true);
      setCoherenceIndex(null);
      setCoherenceAnchor(null);
      setErrors((prev) => {
        const next = { ...prev };
        delete next[`${locked}-wa`];
        delete next[`${locked}-wd`];
        return next;
      });
      setRows((prev) => prev.map((r, i) => (i === locked ? { wa: "", wd: "" } : r)));
      setTimeout(() => focusCell(locked, "wa"), 0);
    };
    document.addEventListener("pointerdown", onOutsidePointerDown);
    return () => document.removeEventListener("pointerdown", onOutsidePointerDown);
  }, []);


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

  /** Conserve les dixièmes présents dans les CSV et dans la saisie clavier. */
  // CONDITION 5 : bridage strict à 2 chiffres, aucune décimale acceptée.
  const cleanWeight = (value: string) => value.replace(/[^0-9]/g, "").slice(0, 2);

  const parseWeight = (value: string): number | null => {
    const cleaned = cleanWeight(value);
    if (cleaned === "" || cleaned === ".") return null;
    const num = Number(cleaned);
    if (!Number.isFinite(num) || num < 5 || num > 99) return null;
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
    // Séparation stricte par couleur de touche sur l'intégralité des 88 notes.
    const blackModulos = new Set([2, 5, 7, 10, 0]);
    const isBlack = (index: number) => blackModulos.has((index + 1) % 12);
    return {
      global: calc(rows),
      first: calc(rows.filter((_, index) => !isBlack(index))),
      second: calc(rows.filter((_, index) => isBlack(index))),
    };
  }, [rows]);

  const focusCell = (index: number, field: "wa" | "wd") => {
    inputs.current[`${index}-${field}`]?.focus();
    inputs.current[`${index}-${field}`]?.select();
  };

  /** Une touche est-elle visible avec le filtre courant ? */
  const isVisibleKey = (index: number) => {
    if (viewFilter === "white") return !BLACK_KEYS.has(index + 1);
    if (viewFilter === "black") return BLACK_KEYS.has(index + 1);
    return true;

  };

  /** Prochaine touche visible dans la direction demandée (ou null). */
  const nextVisibleKey = (index: number, direction: 1 | -1): number | null => {
    for (let i = index + direction; i >= 0 && i <= 87; i += direction) {
      if (isVisibleKey(i)) return i;
    }
    return null;
  };

  /** Déplacement fluide : Wa → Wd → touche visible suivante (et inverse). */
  const moveFocus = (index: number, field: "wa" | "wd", direction: 1 | -1) => {
    if (direction === 1) {
      if (field === "wa") {
        focusCell(index, "wd");
        return;
      }
      const next = nextVisibleKey(index, 1);
      if (next !== null) focusCell(next, "wa");
      return;
    }
    if (field === "wd") {
      focusCell(index, "wa");
      return;
    }
    const prev = nextVisibleKey(index, -1);
    if (prev !== null) focusCell(prev, "wd");
  };

  const onKeyDown = (e: React.KeyboardEvent, index: number, field: "wa" | "wd") => {
    // Verrou absolu du binôme : erreur mécanique, hors fourchette ou binôme
    // incomplet. Seuls les déplacements INTERNES au binôme restent permis.
    if (pairHasError(index) && (e.key === "Tab" || e.key === "Enter")) {
      e.preventDefault();
      const other = field === "wa" ? "wd" : "wa";
      if (errorsRef.current[`${index}-${field}`]) focusCell(index, field);
      else focusCell(index, other);
      return;
    }

    // ALT + TAB (Option + TAB sur Mac) : saute directement au DO suivant
    // (ou au DO# suivant lorsque seules les touches noires sont affichées).
    if (e.altKey && e.key === "Tab") {
      const octaveKeys = viewFilter === "black" ? C_SHARP_KEYS : C_KEYS;
      const nextKey = Array.from(octaveKeys)
        .sort((a, b) => a - b)
        .find((key) => key > index + 1);
      if (nextKey !== undefined) {
        e.preventDefault();
        focusCell(nextKey - 1, "wa");
      }
      return;
    }
    // TAB : avance d'une zone ; Shift + TAB : recule d'une zone.
    if (e.key === "Tab") {
      e.preventDefault();
      moveFocus(index, field, e.shiftKey ? -1 : 1);
      return;
    }
    if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
      e.preventDefault();
      moveFocus(index, field, e.key === "ArrowRight" ? 1 : -1);
      return;
    }
    if (e.key !== "Enter") return;
    e.preventDefault();
    moveFocus(index, field, 1);
  };



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
    // Nouvelle frappe : l'état figé est levé, les alertes redeviennent autorisées.
    rangeDismissed.current.delete(`${index}-${field}`);
    coherenceDismissed.current.delete(index);
    // Pile d'annulation : 20 retours en arrière maximum.
    setUndoStack((prev) => [...prev, rows].slice(-UNDO_LIMIT));
    setRedoStack([]);
    const cleaned = cleanWeight(value);
    const nextRow: Row = { ...rows[index]!, [field]: cleaned };
    setRows((prev) => prev.map((r, i) => (i === index ? nextRow : r)));
    // AUCUNE erreur mécanique tant que la case ne contient pas 2 chiffres :
    // l'artisan doit pouvoir taper librement son binôme.
    if (cleaned.length < 2) {
      clearError(`${index}-wa`);
      clearError(`${index}-wd`);
      if (coherenceIndex === index) setCoherenceIndex(null);
      hideRangeMessage();
      return;
    }
    // Binôme complété pendant la frappe : le cadre rouge « incomplet » tombe.
    if (cleanWeight(nextRow.wa).length === 2 && cleanWeight(nextRow.wd).length === 2) {
      setIncompletePairs((prev) => prev.filter((i) => i !== index));
    }
    // Feedback Flash : PD > PR obligatoire (valeur complète uniquement).
    checkCoherence(index, nextRow);
    const num = parseWeight(cleaned);
    // Priorité absolue à l'erreur mécanique (PR >= PD) : elle masque le FF de fourchette.
    const rowWa = parseWeight(nextRow.wa);
    const rowWd = parseWeight(nextRow.wd);
    const mechanicalError = rowWa !== null && rowWd !== null && rowWa <= rowWd;
    // Hors fourchette (<10 ou >90) : cadre rouge IMMÉDIAT + message FF en
    // dessous de la case, sans aucun message sustain. Le verrouillage du focus
    // n'agit qu'à la tentative de sortie (blur/Tab/Enter).
    if (num !== null && (num < 10 || num > 90)) {
      setErrors((prev) => ({ ...prev, [`${index}-${field}`]: PD_RANGE_MESSAGE }));
      if (mechanicalError) hideRangeMessage();
      else showRangeMessage(index, field);
      return;
    }
    // Valeur redevenue conforme : nettoyage instantané du cadre rouge et du FF.
    if (!mechanicalError) clearError(`${index}-${field}`);
    hideRangeMessage();
    // Alerte sustain : toute valeur conforme strictement supérieure à 75 g.
    if (num !== null && num > 75 && !hidePedalAlert) {
      pedalCount.current += 1;
      pedalOrigin.current = { index, field };
      setPedalAlert(true);
    }
  };

  /** Restaure l'état de mesures précédent (jusqu'à 20 fois de suite). */
  const undoRows = () => {
    setUndoStack((prev) => {
      if (prev.length === 0) return prev;
      const last = prev[prev.length - 1]!;
      setRedoStack((r) => [...r, rows].slice(-UNDO_LIMIT));
      setRows(last);
      setErrors({});
      setCoherenceIndex(null);
      return prev.slice(0, -1);
    });
  };

  /** Rétablit un état annulé (jusqu'à 20 fois de suite). */
  const redoRows = () => {
    setRedoStack((prev) => {
      if (prev.length === 0) return prev;
      const last = prev[prev.length - 1]!;
      setUndoStack((u) => [...u, rows].slice(-UNDO_LIMIT));
      setRows(last);
      setErrors({});
      setCoherenceIndex(null);
      return prev.slice(0, -1);
    });
  };

  /** Ferme l'alerte sustain et saute automatiquement à la case suivante. */
  const closePedalAlert = () => {
    setPedalAlert(false);
    const origin = pedalOrigin.current;
    pedalOrigin.current = null;
    if (!origin) return;
    setTimeout(() => {
      if (origin.field === "wa") focusCell(origin.index, "wd");
      else if (origin.index < 87) focusCell(origin.index + 1, "wa");
    }, 0);
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
      focusCell(index, field);
      return;
    }
    // Fourchette mécanique 10-90 g : hors plage, aucun message sustain,
    // cadre rouge, message FF en dessous et focus verrouillé dans la case.
    if (num < 10 || num > 90) {
      setErrors((prev) => ({ ...prev, [key]: PD_RANGE_MESSAGE }));
      const updated = setRowField(index, field, num.toString());
      const rowWa = parseWeight(updated.wa);
      const rowWd = parseWeight(updated.wd);
      if (rowWa !== null && rowWd !== null && rowWa <= rowWd) hideRangeMessage();
      else showRangeMessage(index, field);
      setTimeout(() => focusCell(index, field), 0);
      return;
    }
    if (num > 75 && !hidePedalAlert) {
      pedalCount.current += 1;
      pedalOrigin.current = { index, field };
      setPedalAlert(true);
    }

    clearError(key);
    hideRangeMessage();
    const finalRow = setRowField(index, field, num.toString());
    checkCoherence(index, finalRow);
    // Le contrôle « Saisie incomplète » n'intervient QUE si l'artisan quitte
    // complètement le binôme (jamais à la validation de la seule case du haut).
    checkPairLeave(index, finalRow);
  };

  /** Contrôle de sortie du binôme : cadre rouge + FF uniquement si l'artisan
   *  quitte la touche alors qu'une des deux cases n'a pas ses 2 chiffres. */
  const checkPairLeave = (index: number, row: Row) => {
    setTimeout(() => {
      const active = document.activeElement;
      const stillInPair =
        active === inputs.current[`${index}-wa`] || active === inputs.current[`${index}-wd`];
      if (stillInPair) return;
      const waFull = cleanWeight(row.wa).length === 2;
      const wdFull = cleanWeight(row.wd).length === 2;
      const bothEmpty = row.wa.trim() === "" && row.wd.trim() === "";
      if ((waFull && wdFull) || bothEmpty) {
        setIncompletePairs((prev) => prev.filter((i) => i !== index));
        return;
      }
      setIncompletePairs((prev) => (prev.includes(index) ? prev : [...prev, index]));
      showOrphanPopover(index);
    }, 0);
  };

  /** Erreur mécanique PR >= PD : cadre rouge STRICTEMENT sur la case du bas
   *  (Poids Remontant), dont les 2 chiffres sont sélectionnés automatiquement. */
  const checkCoherence = (index: number, row: Row) => {
    const wa = parseWeight(row.wa);
    const wd = parseWeight(row.wd);
    const waKey = `${index}-wa`;
    const wdKey = `${index}-wd`;
    if (wa !== null && wd !== null && wa <= wd) {
      setErrors((prev) => {
        const next = { ...prev, [wdKey]: COHERENCE_MESSAGE };
        if (next[waKey] === COHERENCE_MESSAGE) delete next[waKey];
        return next;
      });
      showCoherencePopover(index);
      setTimeout(() => {
        const input = inputs.current[wdKey];
        const active = document.activeElement;
        const inPair = active === inputs.current[waKey] || active === input;
        if (!input || !inPair) return;
        input.focus();
        input.select();
      }, 0);
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

  // CRITÈRE 1 : un numéro de série inconnu pour la session force un INSERT propre.
  useEffect(() => {
    const serial = (info["sn_num"] ?? "").trim();
    if (currentDbId && serial && serial !== savedSerialRef.current) {
      setCurrentDbId(null);
    }
  }, [info, currentDbId]);

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
    if (formIncomplete) {
      showTopbarAlert(anchor, FORM_INCOMPLETE_MESSAGE);
      return false;
    }
    if (orphanKeys.length > 0) {
      showOrphanPopover(orphanKeys[0]!);
      return false;
    }
    if (octaveGaps.length > 0) {
      showTopbarAlert(anchor, OCTAVE_RULE_MESSAGE);
      return false;
    }
    // Le consentement RGPD n'est plus contrôlé ici : il est demandé exclusivement
    // sur la page Résultats, au moment de lever le voile des graphiques.
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
    // Clés d'en-tête adaptées strictement à la langue active du site (FR/EN).
    const en = getLang() === "en";
    const meta: Record<string, string> = {
      [en ? "Brand" : "Marque"]: info["marque"] ?? "",
      "Type de piano": info["type_piano"] ?? "",
      [en ? "Model" : "Modèle"]: info["modele"] ?? "",
      // Numéro de série complet sur une seule paire stricte (« Numéro de série;XXXX » / « Serial number;XXXX »).
      [en ? "Serial number" : "Numéro de série"]:
        `${info["sn_prefix"] ?? ""}${info["sn_num"] ?? ""}${info["sn_suffix"] ?? ""}`.trim(),
      "Date de fabrication": info["fabrication"] ?? "",
      Pays: info["pays"] ?? "",
      Ville: info["ville"] ?? "",
      "Zone climatique": climateZone !== null ? String(climateZone) : "",
      
      "Type d'entretien": info["entretien"] ?? "",
      usage_level: info["usage_level"] ?? "",
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

  // Données au format de la page Résultats : les pages 2 et 3 du PDF capturent
  // les cadres web eux-mêmes (mode Noir & Blanc, courbes blanches/noires séparées).
  const webChartData = useMemo(() => {
    const profile: RefProfile = { wa: [], wd: [], friction: [], balance: [] };
    rows.forEach((row) => {
      const a = parseWeight(row.wa);
      const d = parseWeight(row.wd);
      const valid = a !== null && d !== null && a > d;
      profile.wa.push(valid ? a : Number.NaN);
      profile.wd.push(valid ? d : Number.NaN);
      profile.friction.push(valid ? (a - d) / 2 : Number.NaN);
      profile.balance.push(valid ? (a + d) / 2 : Number.NaN);
    });
    const hasData = profile.wa.some((value) => Number.isFinite(value));
    return buildChartData(hasData ? profile : null, null, null);
  }, [rows]);


  /** Identification du piano reprise en en-tête des pages 2 et 3 du PDF. */
  const pdfSummary = useMemo(() => {
    const now = new Date();
    const p = (n: number) => String(n).padStart(2, "0");
    const year = info["fabrication"]?.trim() || "—";
    const BLACK_MOD = new Set([2, 5, 7, 10, 0]);
    let white = 0;
    let black = 0;
    rows.forEach((row, index) => {
      const filled = String(row.wa ?? "").trim() !== "" || String(row.wd ?? "").trim() !== "";
      if (!filled) return;
      if (BLACK_MOD.has((index + 1) % 12)) black += 1;
      else white += 1;
    });
    return {
      main: `${info["marque"] ?? ""} ${info["modele"] ?? ""} (${year}) - SN ${serialFull}`.trim(),
      time: `Mesure ${p(now.getDate())}-${p(now.getMonth() + 1)}-${now.getFullYear()} - ${p(now.getHours())}:${p(now.getMinutes())}`,
      count: `- ${white} Blanches / ${black} Noires`,
    };
  }, [info, rows, serialFull]);


  /**
   * Blocs DOM composant le rapport.
   * Page 1 : bloc « Moyennes » + cadre complet « Mesures poids statiques ».
   * Page 2 : Poids descendant + Poids remontant. Page 3 : Poids d'équilibre + Friction.
   */
  const collectPdfPages = (): HTMLElement[][] => {
    const keep = (list: Array<HTMLElement | null>) =>
      list.filter((el): el is HTMLElement => el !== null);
    const frame = (id: string) =>
      pdfFramesRef.current?.querySelector<HTMLElement>(`[data-frame="${id}"]`) ?? null;
    return [
      keep([moyennesRef.current, rawPdfMirror() ?? pdfMesuresRef.current]),
      keep([frame("wa"), frame("wd")]),
      keep([frame("bal"), frame("fric")]),
    ];
  };

  /** Compose et télécharge directement le rapport PDF (aucun panneau d'impression). */
  const exportPdfFile = async () => {
    // Une seule frame d'attente : « Export en cours... » (10 px sous Sauver)
    // est peint avant le premier calcul, sans ajouter de délai artificiel.
    await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));
    const pages = collectPdfPages();
    if (pages.every((page) => page.length === 0)) return;

    const filename = buildExportFilename(
      info["marque"],
      info["modele"],
      info["sn_num"],
      new Date(),
      "pdf",
    );
    const header = [pdfSummary.main, pdfSummary.time, pdfSummary.count];
    // Aucune capture en arrière-plan : html2canvas ne tourne QU'ICI, au clic.
    // L'indicateur « Export en cours... » s'affiche à côté du bouton Sauver.
    const started = performance.now();
    const shots = await captureReportPages(pages);
    const assembly = performance.now();
    await buildReportPdf(shots, filename, header);
    console.info(
      `[pdf] captures ${Math.round(assembly - started)} ms + assemblage ${Math.round(performance.now() - assembly)} ms`,
    );
  };




  // --- Import (CSV local / historique en ligne) -----------------------------------

  /** Applique un fichier CSV Touchweight au formulaire et aux 88 pesées. */
  const importCsvContent = (content: string) => {
    try {
      const parsed = parseDiagnosticCsv(content);
      const { fields, rows: imported } = parsed;
      const brand = fields["brand"] ?? "";
      const model = fields["model"] ?? "";
      const serial = fields["serial_number"] ?? "";
      const typePiano = fields["type_piano"] ?? "";
      const manufactureYear = Number(fields["manufacture_year"]);
      const piano = buildCurrentPiano({
        brand,
        model,
        serial_number: serial,
        type_piano: typePiano,
        manufacture_year: Number.isInteger(manufactureYear) ? manufactureYear : null,
        climate_zone: fields["climate_zone"] ?? "",
        maintenance_type: fields["maintenance_type"] ?? "",
        usage_level: fields["usage_level"] ?? "",
        ville: fields["ville"] ?? "",
        pays: fields["pays"] ?? "",
        remarques: fields["remarques"] ?? "",
        wa: imported.map((row) => row.wa),
        wd: imported.map((row) => row.wd),
      });
      saveCurrentPiano(piano);
      setRows(imported.map((r) => ({ wa: cleanWeight(r.wa), wd: cleanWeight(r.wd) })));
      setInfo((prev) => ({
        ...prev,
        marque: brand || prev["marque"] || "",
        type_piano: typePiano || prev["type_piano"] || "",
        modele: model || prev["modele"] || "",
        sn_prefix: prev["sn_prefix"] ?? "",
        sn_num: serial || prev["sn_num"] || "",
        sn_suffix: prev["sn_suffix"] ?? "",
        fabrication: fields["manufacture_year"] ?? prev["fabrication"] ?? "",
        pays: fields["pays"] ?? prev["pays"] ?? "",
        ville: fields["ville"] ?? prev["ville"] ?? "",
        entretien: fields["maintenance_type"] ?? prev["entretien"] ?? "",
        usage_level: fields["usage_level"] ?? prev["usage_level"] ?? "",
        remarques: fields["remarques"] ?? prev["remarques"] ?? "",
      }));
      fabricationTouched.current = true;
      setCurrentDbId(null);
      markDirty();
      // Importation silencieuse : aucun message de confirmation à l'écran.
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

  /** Génère et télécharge le fichier local demandé (après l'action cloud). */
  const runLocalExport = (kind: "csv" | "pdf") => {
    pendingExport.current = null;
    if (kind === "csv") {
      exportCsvFile();
      return;
    }
    setIsExporting(true);
    void exportPdfFile()
      // Export 100 % local : aucune erreur n'est remontée à l'artisan.
      .catch((error) => console.warn("[pdf] export", error))
      .finally(() => setIsExporting(false));
  };


  const syncAndFinish = async (mode: "insert" | "update"): Promise<boolean> => {
    setIsExporting(true);
    const payload = buildPayload();
    const year = payload.annee_fabrication;
    const currentPiano = buildCurrentPiano({
      brand: payload.marque,
      model: payload.modele,
      serial_number: payload.numero_central,
      type_piano: payload.type_piano,
      manufacture_year: year,
      climate_zone: payload.zone_climatique,
      maintenance_type: payload.type_entretien,
      usage_level: info["usage_level"] ?? "",
      ville: payload.ville,
      pays: payload.pays,
      remarques: payload.remarques,
      wa: payload.mesures_wa,
      wd: payload.mesures_wd,
    });
    // La copie locale est disponible immédiatement, même si le réseau est indisponible.
    saveCurrentPiano(currentPiano);
    const toastId = toast.loading("Enregistrement en cours dans Supabase…");
    try {
      // Étape 1 — Buffer unique : écrasement de la ligne is_buffer=true. Tout échec bloque la suite.
      const bufferResult = await upsertCurrentPianoBuffer(currentPiano);
      if (!bufferResult.ok) {
        toast.error(`Erreur de base de données (buffer) : ${bufferResult.error ?? "erreur réseau"}`, {
          id: toastId,
          duration: 12000,
        });
        showMessage(`Erreur de base de données (PIANO_ACTUEL) : ${bufferResult.error ?? "erreur réseau"}`);
        return false;
      }
      // Étape 2 — Historique : fiche is_buffer=false, avec son propre ID (update si déjà archivée).
      const historyId =
        mode === "update" ? await findHistoryProfileId(currentPiano.serial_number) : null;
      const cloudResult = await saveCurrentPianoToCloud(currentPiano, historyId);
      if (!cloudResult.ok) {
        toast.error(`Erreur de base de données : ${cloudResult.error ?? "erreur réseau"}`, {
          id: toastId,
          duration: 12000,
        });
        showMessage(`Erreur de base de données : ${cloudResult.error ?? "erreur réseau"}`);
        return false;
      }
      toast.success(
        historyId
          ? "Profil mis à jour dans piano_profiles."
          : "Nouveau profil inséré dans piano_profiles.",
        { id: toastId },
      );
      if (mode === "update" && currentDbId) {
        await updateDiagnostic(currentDbId, payload);
      } else {
        const id = await insertDiagnostic(payload);
        setCurrentDbId(id);
      }
      savedSerialRef.current = payload.numero_central ?? "";
      savedDateRef.current = currentPiano.mesure_date;
      savedRowsRef.current = rows.map((row) => ({ ...row }));
      try {
        window.sessionStorage.setItem(
          CLOUD_SESSION_STATE_KEY,
          JSON.stringify({
            id: mode === "update" ? currentDbId : getFingerprint(),
            serial: savedSerialRef.current,
            date: savedDateRef.current,
            rows: savedRowsRef.current,
          }),
        );
      } catch {
        /* stockage indisponible */
      }
      markSubmission();
      setIsDirty(false);
      showTopbarAlert("save", mode === "update" ? SAVE_UPDATE_MESSAGE : SAVE_NEW_MESSAGE);
      return true;
    } catch (error) {
      // Détail complet en console pour diagnostiquer l'échec (contrainte, RLS, réseau…).
      console.error("[Sync cloud] échec de l'enregistrement :", error);
      const detail =
        error && typeof error === "object" && "message" in error
          ? String((error as { message?: unknown }).message ?? "")
          : String(error ?? "");
      toast.error(`La synchronisation cloud a échoué${detail ? ` : ${detail}` : ""}.`, {
        id: toastId,
        duration: 12000,
      });
      showMessage(
        `La synchronisation cloud a échoué${detail ? ` : ${detail}` : ""}. Les données locales restent disponibles dans Comparer.`,
      );
      return false;
    } finally {
      setIsExporting(false);
    }
  };


  // --- Synchronisation avec la barre supérieure -----------------------------------

  useEffect(() => {
    setTopbarState({
      exportReady,
      measuresReady: requiredSheetFieldsComplete && badgeVisible,
      serialFilled: Boolean(info["sn_num"]?.trim()),
      isExporting,
      isDirty,
      hasSaved: Boolean(currentDbId),
      historyRows: info["sn_num"]?.trim() ? getTopbarState().historyRows : [],
    });
    // Jalon persistant : le seuil minimal de pesée débloque le bouton "Résultats".
    setGateReady(badgeVisible);
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
  }, [exportReady, requiredSheetFieldsComplete, badgeVisible, info, isExporting, isDirty, currentDbId]);

  useEffect(() => {
    // Comparer et Exporter partagent exactement la même décision cloud.
    const alreadySent = () => {
      const serial = (info["sn_num"] ?? "").trim();
      return Boolean(currentDbId) && serial.length > 0 && serial === savedSerialRef.current;
    };
    const changedWeightCount = () => {
      if (savedRowsRef.current.length !== 88) return 88;
      return rows.reduce((count, row, index) => {
        const saved = savedRowsRef.current[index];
        if (!saved) return count + 1;
        const waChanged = parseWeight(row.wa) !== parseWeight(saved.wa);
        const wdChanged = parseWeight(row.wd) !== parseWeight(saved.wd);
        return count + (waChanged || wdChanged ? 1 : 0);
      }, 0);
    };
    const requiresChoice = () => {
      if (!alreadySent()) return false;
      const today = new Date().toISOString().slice(0, 10);
      // Hors du même jour, on ne peut pas assimiler l'envoi à une simple correction.
      return savedDateRef.current !== today || changedWeightCount() >= 5;
    };
    const startAction = (kind: "csv" | "pdf" | "compare") => {
      // Exports CSV et PDF : fonctionnalités 100 % locales. Aucun consentement,
      // aucune validation bloquante, aucune synchronisation cloud ne peut les
      // retarder ni les faire échouer (aucune alerte de synchronisation).
      if (kind === "csv" || kind === "pdf") {
        try {
          runLocalExport(kind);
        } catch (error) {
          console.error("[Export local] échec :", error);
        }
        return;
      }
      if (!guardExport("export")) return;
      if (requiresChoice()) {
        pendingExport.current = kind === "compare" ? null : kind;
        pendingCompare.current = kind === "compare";
        setAskUpdate(true);
        return;
      }
      const mode = alreadySent() ? "update" : "insert";
      // Navigation verrouillée : on n'exporte / ne navigue QUE si les deux
      // écritures cloud (buffer + historique) ont abouti.
      void syncAndFinish(mode).then((ok) => {
        if (ok) void navigate({ to: "/comparer" });
      });
    };
    const onExport = () => startAction("csv");
    const onPdf = () => startAction("pdf");
    const onCompareGuard = () => startAction("compare");
    const exportCsvOnly = () => startAction("csv");



    const onReset = () => setConfirmReset("rows");

    const blankMeta = () => ({
      marque: info["marque"] ?? "",
      modele: info["modele"] ?? "",
      serial: (info["sn_prefix"] ?? "") + (info["sn_num"] ?? "") + (info["sn_suffix"] ?? ""),
      typePiano: info["type_piano"] ?? "",
      pays: info["pays"] ?? "",
      ville: info["ville"] ?? "",
      entretien: info["entretien"] ?? "",
      usage: info["usage_level"] ?? "",
      modifications: info["remarques"] ?? "",
      zone: climateZone !== null ? String(climateZone) : "",
      annee: info["fabrication"] ?? "",
    });

    const onBlankPdf = () => {
      const lang = getLang();
      generateBlankFormPdf(
        lang === "en" ? "BLANK_ENTRY_FORM.pdf" : "FORMULAIRE_SAISIE_VIERGE.pdf",
        lang,
        blankMeta(),
      );
    };

    const onBlankKeyboardPdf = () => {
      const lang = getLang();
      generateBlankKeyboardPdf(
        lang === "en" ? "BLANK_KEYBOARD_FORM.pdf" : "FORMULAIRE_CLAVIER_VIERGE.pdf",
        lang,
        blankMeta(),
      );
    };

    const handlers: Record<string, EventListener> = {
      "piano-export": onExport,
      "piano-export-csv": exportCsvOnly,
      "piano-export-pdf": onPdf,
      "piano-export-blank-pdf": onBlankPdf,
      "piano-export-blank-keyboard-pdf": onBlankKeyboardPdf,


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

  const renderWeightInput = (
    index: number,
    field: "wa" | "wd",
    isBlack: boolean,
    pdfMirror = false,
    hidden = false,
  ) => (
    <div
      className={`weight-fields weight-fields-${field}`}
      style={hidden ? { visibility: "hidden" } : undefined}
      onClick={() => {
        if (!canEnterWeights) showBlockMessage(index, field);
      }}
    >
      {pdfMirror ? (
        // Miroir PDF : aucune saisie n'est nécessaire, on remplace l'<input>
        // (dont les marges internes décalaient le chiffre à droite dans
        // html2canvas) par un <span> statique mathématiquement centré.
        <span
          className={`weight-input !font-sans ${isBlack ? "" : "![background-color:#cbd5e1]"}`}
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
          {rows[index]![field]}
        </span>
      ) : (
      <input

        ref={pdfMirror ? undefined : (el) => {
          inputs.current[`${index}-${field}`] = el;
        }}
        value={rows[index]![field]}
        readOnly={pdfMirror}
        maxLength={2}
        placeholder=""
        onChange={pdfMirror ? undefined : (e) => canEnterWeights && setValue(index, field, e.target.value)}
        onBlur={(e) => {
          if (!canEnterWeights) return;
          const key = `${index}-${field}`;
          const restored = e.target.value === "" ? (prevWeight.current[key] ?? "") : e.target.value;
          delete prevWeight.current[key];
          handleBlur(index, field, restored);
        }}
        onKeyDown={(e) => {
          if (!canEnterWeights) {
            e.preventDefault();
            showBlockMessage(index, field);
            return;
          }
          // Saisie expéditive : si la case est en anomalie (FF mécanique ou
          // hors fourchette), la première frappe numérique écrase la valeur.
          if (
            /^[0-9]$/.test(e.key) &&
            !e.altKey &&
            !e.ctrlKey &&
            !e.metaKey &&
            errorsRef.current[`${index}-${field}`] &&
            e.currentTarget.selectionStart === e.currentTarget.selectionEnd
          ) {
            e.preventDefault();
            setValue(index, field, e.key);
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
        aria-label={`${field === "wa" ? (en ? "DW" : "PD") : en ? "UW" : "PR"} touche ${index + 1}`}
        title={errors[`${index}-${field}`] ?? undefined}
        onFocus={(e) => {
          // Verrou du binôme : impossible de rejoindre une autre touche tant
          // que le binôme précédent est en anomalie (mécanique, fourchette,
          // ou binôme incomplet).
          const locked = lockedPairRef.current;
          if (locked !== null && locked !== index && pairHasError(locked)) {
            const target = pairErrorField(locked);
            setTimeout(() => focusCell(locked, target), 0);
            return;
          }
          lockedPairRef.current = index;
          // Sélection intégrale des 2 chiffres (fourchette OU erreur mécanique) :
          // l'artisan retape immédiatement sa nouvelle valeur.
          const input = e.currentTarget;
          input.select();
          setTimeout(() => input.select(), 0);
          // Le message FF de fourchette s'efface définitivement dès le clic dans la case.
          hideRangeMessage(true);
        }}
        // Aucune coloration rouge : les cases restent d'apparence normale même
        // en anomalie. Seuls les messages FF et le blocage du focus subsistent.
        className={`weight-input !font-sans font-semibold !text-black focus:!border-2 focus:!border-black focus:!ring-0 focus:!outline-none ${isBlack ? "" : "![background-color:#cbd5e1]"}`}

        style={isBlack ? { backgroundColor: "#cbd5e1" } : undefined}
      />
      )}
    </div>
  );


  // --- Rendu : une section de 44 touches -----------------------------------------

  const renderSection = (from: number, to: number, gridRef: (n: HTMLDivElement | null) => void, pdfMirror = false) => (
    <section
      className="mt-2 flex w-full flex-col items-center"
      aria-label={`Touches ${from} à ${to}`}
    >
      <div className="technical-sheet">
        <div className={`technical-labels ${SIDE_LABEL_CLASS}`} aria-hidden="true">
          <div className="label-key" />
          <div className="label-wa">{en ? "Downweight" : "Poids descendant"}</div>
          <div className="label-wd">{en ? "Upweight" : "Poids remontant"}</div>
          <div className="label-wa-white">{en ? "Downweight" : "Poids descendant"}</div>
          <div className="label-wd-white">{en ? "Upweight" : "Poids remontant"}</div>
        </div>
        <div className="piano-grid" ref={gridRef}>
          {rows.slice(from - 1, to).map((row, offset) => {
            const index = from - 1 + offset;
            const black = BLACK_KEYS.has(index + 1);
            const leftBlack = !black && BLACK_KEYS.has(index);
            const rightBlack = !black && BLACK_KEYS.has(index + 2);
            const shift = leftBlack === rightBlack ? "" : leftBlack ? "shift-left" : "shift-right";
            const hiddenByView =
              !pdfMirror &&
              ((viewFilter === "white" && black) || (viewFilter === "black" && !black));
            return (
              <div
                key={index}
                className={`piano-measure-column ${black ? "is-black" : "is-white"} ${shift} ${NATURAL_KEY_BREAKS.has(index + 1) ? "natural-key-break" : ""} ${index + 1 === to ? "is-last-key" : ""}`}
              >
                <div className={`key-number ${C_KEYS.has(index + 1) ? "is-c-key" : ""}`}>
                  {index + 1}
                </div>
                {/* Le dessin de la touche reste toujours intact : seules les
                    cases de saisie se masquent selon le filtre « Touches ». */}
                <div className="key-body">
                  {renderWeightInput(index, "wa", black, pdfMirror, hiddenByView)}
                  {renderWeightInput(index, "wd", black, pdfMirror, hiddenByView)}
                </div>
              </div>
            );
          })}

        </div>
      </div>
      <div data-pdf-result-frame className={pdfMirror ? "w-full h-auto max-h-none overflow-visible opacity-100 pointer-events-none" : "w-full h-0 max-h-0 overflow-hidden opacity-0 pointer-events-none"}>
      {(["friction", "balance"] as const).map((kind) => (
        <div className="result-sheet" key={kind}>
          <div className={`result-label ${SIDE_LABEL_CLASS}`}>
            {kind === "friction" ? "Friction" : en ? "Balance Weight" : "Poids d'équilibre"}
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
      </div>
    </section>
  );

  // --- Rendu : page ----------------------------------------------------------------

  return (
    <main className={`mx-auto max-w-[1400px] px-6 ${weighingMode ? "py-3" : "py-10"}`}>
      <input
        ref={importInputRef}
        type="file"
        accept=".csv,text/csv"
        style={{ display: "none" }}
        onChange={(e) => {
          onImportFile(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      {!weighingMode && (
      <div
        data-dirty={isDirty}
        data-saved-at={savedAt ?? ""}
        data-climate-zone={climateZone ?? ""}
      >
        <Frame title={en ? "Piano information" : "Informations piano"} className="mt-10 [&_input]:border-foreground/60">
          <div className="mt-3 grid gap-1.5 sm:grid-cols-2 md:grid-cols-[1fr_210px_1fr_1fr]">
            <label className={FIELD_LABEL_CLASS}>
              {en ? "Brand" : "Marque"}
              <SmartCombobox
                value={info["marque"] ?? ""}
                options={BRAND_SUGGESTIONS}
                placeholder={en ? "Type a brand (e.g. YAMAHA, PLEYEL...)" : "Saisissez une marque (ex: YAMAHA, PLEYEL...)"}
                onTyping={markDirty}
                onCommit={(v) => {
                  updateInfo("marque", v);
                  if ((info["modele"] ?? "") !== "") updateInfo("modele", "");
                }}
              />
            </label>

            <fieldset className={FIELD_LABEL_CLASS} data-keep-model-open>
              <legend>{en ? "Piano type" : "Type de piano"}</legend>
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
                    {en ? (t === "Droit" ? "Upright" : "Grand") : t}
                  </label>
                ))}
              </div>
            </fieldset>

            <label className={FIELD_LABEL_CLASS}>
              {en ? "Model" : "Modèle"}
              <SmartCombobox
                ref={modelComboRef}
                value={info["modele"] ?? ""}
                options={modelsFor(info["marque"] ?? "", info["type_piano"])}
                groups={modelGroupsFor(info["marque"] ?? "", info["type_piano"])}
                disabled={!info["marque"]?.trim()}
                openOnFocus
                keepOpenSelector="[data-keep-model-open]"
                className="!bg-white"
                placeholder={en ? "Type or search a model..." : "Saisissez ou cherchez un modèle..."}
                onTyping={markDirty}
                onCommit={(v) => {
                  updateInfo("modele", v);
                  const inferred = inferTypeFromModel(info["marque"] ?? "", v);
                  if (inferred) updateInfo("type_piano", inferred);
                }}
              />
            </label>

            <div className="text-xs text-muted-foreground sm:col-span-2 md:col-span-4" style={{ marginTop: "12px", paddingTop: "0px", display: "block" }}>
              <span className={FIELD_LABEL_CLASS}>{en ? "Serial number" : "Numéro de série"}</span>{" "}
              <span className="text-muted-foreground">
                {en ? "(Locate the number on the metal frame - include letters if any)." : "(Reportez le numéro du cadre métallique - inclure les lettres si existantes)."}
              </span>
              <div className="mt-1 flex items-end justify-start gap-4">
                <div className="flex items-end gap-2">
                  <label className={`min-w-[80px] ${SUB_LABEL_CLASS}`}>
                     <span className="block whitespace-nowrap">{en ? "Letter" : "Lettre"}</span>
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
                    <span className="block whitespace-nowrap">{en ? "Serial N°" : "N° de série"}</span>
                    <input
                      ref={(el) => {
                        snRef.current["sn_num"] = el;
                      }}
                      value={info["sn_num"] ?? ""}
                      onChange={(e) => updateInfo("sn_num", e.target.value.replace(/[^0-9]/g, ""))}
                      required
                      inputMode="numeric"
                      placeholder={en ? "Digits" : "Chiffres"}
                      className={`${INPUT_CLASS} max-w-[150px]`}
                    />
                  </label>
                  <label className={`min-w-[80px] ${SUB_LABEL_CLASS}`}>
                    <span className="block whitespace-nowrap">{en ? "End letter" : "Lettre fin"}</span>
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
                  <span className="block whitespace-nowrap">{en ? "Manufacturing date" : "Date fabrication"}</span>
                  <input
                    value={info["fabrication"] ?? ""}
                    onChange={(e) => {
                      fabricationTouched.current = true;
                      updateInfo("fabrication", e.target.value);
                    }}
                    className={`${INPUT_CLASS} max-w-[120px]`}
                  />
                </label>
                <div className="flex h-8 items-end gap-1 text-xs text-black" />

              </div>
              {!serialFormatValid && (
                <p className="mt-1 text-[0.7rem] leading-snug text-destructive">
                  {SERIAL_FORMAT_ERROR}
                </p>
              )}
            </div>

            <label className={`mt-4 ${FIELD_LABEL_CLASS}`}>
              {en ? "Country" : "Pays"}
              <SmartCombobox
                value={info["pays"] ?? ""}
                options={ALL_COUNTRIES}
                groups={[
                  { label: en ? "Frequent suggestions" : "Suggestions fréquentes", options: FREQUENT_COUNTRIES },
                  { label: en ? "All countries" : "Tous les pays", options: SUGGESTED_COUNTRIES },
                ]}
                onTyping={markDirty}
                onCommit={(v) => updateInfo("pays", v)}
              />
            </label>

            <label className={`mt-4 ${FIELD_LABEL_CLASS}`}>
              <span className="flex items-center gap-2">
                {en ? "City" : "Ville"}
                {isGeocoding && <span className="text-[0.65rem] italic">{en ? "Checking…" : "Vérification…"}</span>}
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

            <div className="mt-4 grid grid-cols-1 gap-6 sm:grid-cols-2 sm:col-span-2 md:col-span-4">
              <div className={FIELD_LABEL_CLASS}>
                <span className="block">{en ? "Maintenance type" : "Type d'entretien"}</span>
                <div className="mt-2 flex flex-col gap-1.5">
                  {MAINTENANCE_OPTIONS.map((option) => {
                    const checked = maintenanceList.includes(option);
                    return (
                      <label key={option} className="flex items-center gap-2 font-normal">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => {
                            const next = e.target.checked
                              ? [...MAINTENANCE_OPTIONS].filter(
                                  (o) => o === option || maintenanceList.includes(o),
                                )
                              : maintenanceList.filter((o) => o !== option);
                            updateInfo("entretien", next.join(", "));
                            if (e.target.checked && option === "Modifications importantes") {
                              setTimeout(() => remarquesRef.current?.focus(), 0);
                            }
                          }}
                          className="h-4 w-4 shrink-0 accent-foreground"
                        />
                        <span>{en ? MAINTENANCE_LABELS_EN[option] : MAINTENANCE_LABELS_FR[option]}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <label className={FIELD_LABEL_CLASS}>
                <span className="block">{en ? "Usage level" : "Niveau d'usage"}</span>
                <select
                  value={info["usage_level"] ?? ""}
                  onChange={(e) => updateInfo("usage_level", e.target.value)}
                  className={`${INPUT_CLASS} !bg-white !block !w-auto !max-w-[300px] mt-2`}
                >
                  <option value="">{en ? "— Select —" : "— Sélectionner —"}</option>
                  {USAGE_OPTIONS.map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </label>
            </div>


            <label className={`mt-6 ${FIELD_LABEL_CLASS} sm:col-span-2 md:col-span-4`}>
              <span className="inline-flex items-center">
                {en ? "Remarks" : "Remarques"}
              </span>
              <input
                ref={remarquesRef}
                required={remarquesRequired}
                aria-invalid={remarquesInvalid}
                placeholder={
                  remarquesRequired ? (en ? "⚠️ Please describe the modifications" : "⚠️ Veuillez indiquer les modifications") : undefined
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

          </div>
        </Frame>
        {/* Sous le cadre : Reset centré, bouton de navigation à droite. */}
        <div className="mt-3 grid w-full grid-cols-[1fr_auto_1fr] items-center gap-4 pl-2 pr-2">
          <div />

          <div className="relative flex items-center justify-center">
            {confirmReset === "info" && (
              <div
                className="absolute left-1/2 flex min-w-max -translate-x-1/2 items-center gap-2 !rounded-md !border !border-gray-300 !bg-white px-3 py-2 text-sm font-medium !text-gray-950 !shadow-lg"
                style={{ bottom: "100%", marginBottom: "8px", zIndex: 50 }}
              >
                <span>{en ? "Do you want to erase all entered piano information?" : "Voulez-vous effacer toutes les infos piano saisies ?"}</span>
                <button type="button" className="rounded border border-gray-950/40 px-2 py-0.5 font-bold !text-gray-950" onClick={() => { resetInfo(); setConfirmReset(null); }}>Oui</button>
                <button type="button" className="rounded border border-gray-950/40 px-2 py-0.5 font-bold !text-gray-950" onClick={() => setConfirmReset(null)}>Non</button>
              </div>
            )}
            <button
              type="button"
              onClick={() => setConfirmReset("info")}
              title={en ? "Reset the information sheet only" : "Réinitialiser uniquement la fiche d'informations"}
              className="relative z-10 rounded-md border border-input bg-background px-4 py-1.5 !text-[0.96rem] font-bold text-muted-foreground transition-colors hover:bg-accent"
            >
              Reset
            </button>
          </div>

          <div className="flex items-center justify-end gap-4">
            {missingFlash && (
              <span className="text-sm font-semibold !text-gray-600">
                {en ? "Complete: " : "Complétez : "}
                {missingSheetFields.length > 0
                  ? missingSheetFields.join(", ")
                  : en
                    ? "Measurements"
                    : "Pesées"}
              </span>
            )}
            <button
              ref={weighingBtnRef}
              type="button"
              onClick={onValidateWeighing}
              // Toujours activable : noir par défaut, vert dès que la fiche est complète.
              className={`rounded-md border-2 px-4 py-1.5 text-[0.9rem] font-bold !text-black transition-colors ${requiredSheetFieldsComplete ? "!border-green-600 !bg-green-100" : "border-black bg-white hover:bg-gray-100"}`}
            >
              {en ? "Key measurements >" : "Mesures clavier >"}
            </button>
          </div>
        </div>

      </div>

      )}

      {blockMessage && (
        <div
          className="fixed left-1/2 top-24 w-[min(90vw,32rem)] -translate-x-1/2 rounded-md border border-gray-300 px-4 py-3 text-sm font-medium text-gray-950 shadow-lg"
          style={{ zIndex: 99999, backgroundColor: "#ffffff" }}
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

      {rangeAnchor && (
        <SvgTooltip x={rangeAnchor.x} y={rangeAnchor.y} text={PD_RANGE_MESSAGE} />
      )}

      <Frame
        title={
          <>
            {en ? "Static touch weight measurements" : "Mesures poids statiques"}{" "}
            <span data-pdf-hide className="group relative inline-flex items-center align-middle">
              <span className="flex h-4 w-4 items-center justify-center rounded-full border border-black text-[10px] font-bold normal-case !text-black">
                i
              </span>
              <span
                className="pointer-events-none absolute left-5 top-1/2 hidden w-max max-w-none -translate-y-1/2 whitespace-nowrap rounded-md border border-gray-300 px-3 py-2 text-left text-[13px] font-medium normal-case text-gray-950 shadow-lg group-hover:block"
                style={{ zIndex: 99999, backgroundColor: "#ffffff" }}
              >
                <span className="block whitespace-nowrap">
                  {en
                    ? "Enter at least the values for every C and C# to access the results."
                    : "Saisir au minimum les valeurs pour tous les Do et Do# pour accéder aux résultats."}
                </span>
                <span className="block whitespace-nowrap">

                  {en ? "• TAB: move forward one input field" : "• TAB : avance d'une zone de saisie"}
                </span>
                <span className="block whitespace-nowrap">
                  {en ? "• Shift + TAB: move back one input field" : "• Shift + TAB : recule d'une zone de saisie"}
                </span>
                <span className="block whitespace-nowrap">
                  {en
                    ? "• ALT + TAB (Option ⌥ on Mac): jump straight to the next C"
                    : "• ALT + TAB (Option ⌥ sur Mac) : saute directement au DO suivant"}
                </span>

              </span>

            </span>
          </>
        }
        // Hors mode pesée (page Infopiano), le cadre n'est PAS retiré du DOM :
        // il est déporté hors écran (jamais `hidden`), de sorte que l'export PDF
        // puisse toujours le rendre et le capturer, quelle que soit la page.
        className={
          weighingMode
            ? "!mt-[100px] pb-4"
            : "mt-8 pb-10 !absolute !-left-[9999px] !top-0 !w-[1100px] !opacity-0 pointer-events-none"
        }

        innerRef={(node) => {
          mesuresRef.current = node;
        }}
      >
        {/* Undo / Redo déplacés dans la barre d'outils centrale du bas. */}

        {badgeVisible && (
          <div
            data-pdf-hide
            className="pointer-events-none absolute left-0 top-1/2 z-10 flex w-32 justify-center"
            style={{ transform: "translateY(calc(-50% + 30px))" }}
          >
            <div className="flex items-center !rounded-md !border !border-green-600 !bg-green-100 !px-2.5 !py-1 !shadow-sm">
              <span className="text-[10px] font-semibold !text-gray-950">
                {en ? "Compliant input" : "Saisie conforme"}
              </span>
            </div>
          </div>
        )}
        <div className="mx-auto flex w-full flex-col items-center justify-center">
          {renderSection(1, 44, gridRef1)}
          {renderSection(45, 88, gridRef2)}
        </div>
      </Frame>

      {/* Miroir non responsive exclusivement réservé à la Page 1 et au PNG de
          diagnostic. Il reste peint hors écran et expose toujours les quatre
          lignes d'expertise sous chacun des deux demi-claviers. */}
      <div className="absolute -left-[9999px] top-0 pointer-events-none">
        <div className="!w-[1250px] !min-w-[1250px] !max-w-[1250px] overflow-visible bg-white">
          <Frame
            title={en ? "Static touch weight measurements" : "Mesures poids statiques"}
            className="!w-[1250px] !min-w-[1250px] !max-w-[1250px] overflow-visible bg-white pb-4"
            innerRef={(node) => {
              pdfMesuresRef.current = node;
              node?.setAttribute("data-pdf-compact", "");
            }}
          >
            <div className="mx-auto flex w-full flex-col items-center justify-center overflow-visible">
              {renderSection(1, 44, pdfGridRef1, true)}
              {renderSection(45, 88, pdfGridRef2, true)}
            </div>
          </Frame>
        </div>
      </div>

      {/* Bouton de navigation officiel : placé sous le cadre « Mesures poids
          statiques » (et non plus à l'intérieur), donc jamais capturé au PDF. */}
      {weighingMode && (
        <div className="mt-3 flex w-full items-center justify-between pl-2 pr-2">
          {/* Retour à la fiche piano : bordure grise standard. */}
          <button
            type="button"
            data-pdf-hide
            onClick={() => setWeighingMode(false)}
            className="rounded-md border border-input bg-background px-4 py-1.5 text-[0.9rem] font-bold !text-black transition-colors hover:bg-accent"

          >
            {en ? "< Edit piano information" : "< Modifier informations piano"}
          </button>

          {/* Barre d'outils d'atelier centrée : undo, redo, touches, reset. */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              data-pdf-hide
              disabled={undoStack.length === 0}
              onClick={undoRows}
              aria-label="Annuler"
              title={en ? "Undo the last entry (20 max)" : "Annuler la dernière saisie (20 maximum)"}
              className={`flex h-[34px] w-9 items-center justify-center rounded-md border border-input bg-background p-0 transition-colors hover:bg-accent ${undoStack.length === 0 ? "!text-gray-400 cursor-not-allowed" : "text-muted-foreground"}`}
            >
              <Undo2 className="h-4 w-4" />
            </button>
            <button
              type="button"
              data-pdf-hide
              disabled={redoStack.length === 0}
              onClick={redoRows}
              aria-label="Rétablir"
              title={en ? "Redo the cancelled entry (20 max)" : "Rétablir la saisie annulée (20 maximum)"}
              className={`flex h-[34px] w-9 items-center justify-center rounded-md border border-input bg-background p-0 transition-colors hover:bg-accent ${redoStack.length === 0 ? "!text-gray-400 cursor-not-allowed" : "text-muted-foreground"}`}
            >
              <Redo2 className="h-4 w-4" />
            </button>

            <button
              type="button"
              data-pdf-hide
              onClick={() =>
                setViewFilter((current) =>
                  current === "all" ? "white" : current === "white" ? "black" : "all",
                )
              }
              className="flex items-center gap-2 rounded-md border border-input bg-background px-3 py-1.5 !text-[0.84rem] font-bold text-muted-foreground transition-colors hover:bg-accent"
            >
              <RefreshCw size={14} strokeWidth={2.5} className="shrink-0" />
              <span>
                {en
                  ? viewFilter === "all"
                    ? "Keys: All"
                    : viewFilter === "white"
                      ? "Keys: Whites"
                      : "Keys: Blacks"
                  : viewFilter === "all"
                    ? "Touches : Toutes"
                    : viewFilter === "white"
                      ? "Touches : Blanches"
                      : "Touches : Noires"}
              </span>
            </button>

            <div className="relative flex items-center">
              {confirmReset === "rows" && (
                <div
                  className="absolute left-1/2 flex min-w-max -translate-x-1/2 items-center gap-2 !rounded-md !border !border-gray-300 !bg-white px-3 py-2 text-sm font-medium !text-gray-950 !shadow-lg"
                  style={{ bottom: "100%", marginBottom: "8px", zIndex: 50 }}
                >
                  <span>{en ? "Do you want to erase all entered weight data?" : "Voulez-vous effacer toutes les données de poids saisies ?"}</span>
                  <button type="button" className="rounded border border-gray-950/40 px-2 py-0.5 font-bold !text-gray-950" onClick={() => { try { window.localStorage.removeItem(CURRENT_PIANO_KEY); } catch { /* stockage indisponible */ } setRows(EMPTY); setErrors({}); setCoherenceIndex(null); setCoherenceAnchor(null); setPedalAlert(false); setRangeAnchor(null); setBlockAnchor(null); rangeDismissed.current.clear(); coherenceDismissed.current.clear(); setIncompletePairs([]); lockedPairRef.current = null; setUndoStack([]); setRedoStack([]); setConfirmReset(null); rowsRef.current = EMPTY; focusFirstWeight(); }}>Oui</button>
                  <button type="button" className="rounded border border-gray-950/40 px-2 py-0.5 font-bold !text-gray-950" onClick={() => setConfirmReset(null)}>Non</button>
                </div>
              )}
              <button
                type="button"
                data-pdf-hide
                onClick={() => setConfirmReset("rows")}
                className="relative z-10 rounded-md border border-input bg-background px-4 py-1.5 !text-[0.96rem] font-bold text-muted-foreground transition-colors hover:bg-accent"
              >
                Reset
              </button>
            </div>
          </div>


          <button
            type="button"
            data-pdf-hide
            // Accès hermétiquement bloqué tant que « Saisie conforme » n'est
            // pas au vert intense.
            disabled={!badgeVisible}
            onClick={() => {
              if (!badgeVisible) return;
              navigate({ to: "/resultats" });
            }}
            className={`rounded-md border-2 px-4 py-1.5 text-[0.9rem] font-bold transition-colors ${badgeVisible ? "!border-green-600 !bg-green-100 !text-black" : "cursor-not-allowed border-input bg-background !text-gray-400 opacity-60"}`}
            style={
              badgeVisible
                ? {
                    backgroundColor: "#dcfce7",
                    borderColor: "#16a34a",
                    color: "#000000",
                    fontWeight: "bold",
                  }
                : undefined
            }
          >
            {en ? "Results & Charts >" : "Résultats & Graphiques >"}
          </button>
        </div>
      )}


      {/* Conteneur dédié à la capture PDF : hauteur nulle + overflow masqué,
           donc totalement invisible à l'écran (0 px de haut, opacité 0,
           non survolable), mais le DOM reste intact pour html2canvas. Le
           script de capture force temporairement la visibilité de ce cadre
           (`data-pdf-capture-frame`) dans le clone pour éviter une Page 2
           blanche. À l'impression, les utilitaires `print:*` restaurent
           hauteur et opacité. */}
      <div
        aria-hidden="true"
        data-pdf-capture-frame
        className="w-[1024px] max-w-[1024px] h-0 max-h-0 overflow-hidden opacity-0 pointer-events-none bg-white print:h-auto print:max-h-none print:opacity-100"
      >
        <div className="p-4">
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
              usage: info["usage_level"] ?? "",
              zone: climateZone !== null ? String(climateZone) : "",
              dateMesure: formatLocalDateTime(new Date()),
            }}
          />
        </div>
      <Frame
        title={
          <>
Moyennes{" "}
            <span
              data-pdf-hide
              className="!print:hidden font-normal"
              style={{ fontFamily: "Arial, sans-serif", fontStyle: "italic", fontSize: "0.7em", color: "#4b5563" }}
            >
              (auto)
            </span>
          </>
        }
        className="!p-3 !pt-4 bg-white"
        innerRef={(node) => {
          moyennesRef.current = node;
        }}
      >
        <span className="!absolute !-top-3.5 !left-1/2 !-translate-x-1/2 !whitespace-nowrap !bg-card !px-2 !text-gray-950 !font-medium" style={{ fontSize: "0.83rem" }}>
          {pdfSummary.main} / {pdfSummary.time} {pdfSummary.count}
        </span>

        <div className="grid grid-cols-4 mt-0.5 !gap-2.5">
          {(
            [
              { key: "wa", label: en ? "Downweight" : "Poids descendant" },
              { key: "wd", label: en ? "Upweight" : "Poids remontant" },
              { key: "friction", label: "Friction" },
              { key: "balance", label: en ? "Balance Weight" : "Poids d'équilibre" },
            ] as const
          ).map(({ key, label }) => (
            <div key={key} className="rounded bg-muted px-2 py-1.5 text-center">
              <div className="!text-[1.1rem] font-bold tracking-wide text-muted-foreground">
                {label}
              </div>
              <div className="mt-1 !text-2xl font-semibold tabular-nums">
                {formatAverageResult(sectionAverages.global[key])}
                {sectionAverages.global[key] !== "—" && (
                  <span className="!text-xs !font-medium"> gr.</span>
                )}
              </div>
              <div className="mt-0.5 flex justify-center gap-2 text-[0.65rem] text-muted-foreground tabular-nums">
                <span>
                  {sectionAverages.first[key]}
                  {sectionAverages.first[key] !== "—" && (
                    <span className="text-muted-foreground"> gr.</span>
                  )}
                </span>
                <span className="text-muted-foreground">/</span>
                <span>
                  {sectionAverages.second[key]}
                  {sectionAverages.second[key] !== "—" && (
                    <span className="text-muted-foreground"> gr.</span>
                  )}
                </span>
              </div>
              <div className="flex justify-center gap-2 text-[0.55rem] text-muted-foreground tabular-nums">
                <span className="!text-xs font-medium">{en ? "Whites" : "Blanches"}</span>
                <span className="invisible">/</span>
                <span className="!text-xs font-medium">{en ? "Blacks" : "Noires"}</span>

              </div>
            </div>
          ))}
        </div>
      </Frame>
        <div ref={pdfChartRef} className="mt-4 bg-white">
          <PdfComparisonChart data={chartData} frictionTarget={profile.frictionTarget} />
        </div>
        {/* Pages 2 et 3 du PDF : les quatre cadres de la page Résultats rendus
             tels quels, en mode Noir & Blanc et courbes séparées (blanches /
             noires), puis capturés un par un via leur attribut data-frame. */}
        <div ref={pdfFramesRef} className="mt-4 w-full bg-white">
          <ComparisonChart
            chartData={webChartData}
            keyFilter="split"
            comparisonLabel=""
            comparisonShort=""
            currentBaseName=""
            autoDomain
            sideMargin={60}
          />
        </div>


        </div>
      </div>




      <AlertDialog
        open={askUpdate}
        onOpenChange={(open) => {
          setAskUpdate(open);
          if (!open) {
            pendingExport.current = null;
            pendingCompare.current = false;
          }
        }}
      >
        <AlertDialogContent className="w-full max-w-xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Un envoi existe déjà pour ce numéro de série</AlertDialogTitle>
            <AlertDialogDescription>
              Option A : Écraser la fiche actuelle (Correction de saisie).
              Option B : Valider comme un nouvel état mécanique (Pensez à exporter votre CSV local).
            </AlertDialogDescription>

          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                const kind = pendingExport.current;
                const compare = pendingCompare.current;
                pendingCompare.current = false;
                void syncAndFinish("update").then((ok) => {
                  if (kind) runLocalExport(kind);
                  if (ok && compare) void navigate({ to: "/comparer" });
                });
              }}
            >
              Option A : Écraser la fiche actuelle (Correction de saisie)
            </AlertDialogAction>
            <AlertDialogAction
              onClick={() => {
                const kind = pendingExport.current;
                const compare = pendingCompare.current;
                pendingCompare.current = false;
                setCurrentDbId(null);
                void syncAndFinish("insert").then((ok) => {
                  if (kind) runLocalExport(kind);
                  if (ok && compare) void navigate({ to: "/comparer" });
                });
              }}
            >
              Option B : Valider comme un nouvel état mécanique (Pensez à exporter votre CSV local)
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>

      </AlertDialog>

      {pedalAlert && (
        <div
          className="fixed left-1/2 top-24 w-[min(90vw,34rem)] -translate-x-1/2 rounded-md border border-gray-300 px-4 py-3 text-sm font-medium text-gray-950 shadow-lg"
          style={{ zIndex: 99999, backgroundColor: "#ffffff" }}
        >
          <div>{en ? PEDAL_MESSAGE_EN : PEDAL_MESSAGE_FR}</div>
          {/* Case toujours visible, mémorisée pour la session. */}
            <label className="mt-2 flex items-center gap-2 text-xs font-normal">
              <input
                type="checkbox"
                onChange={(e) => {
                  setHidePedalAlert(e.target.checked);
                  try {
                    if (e.target.checked) window.sessionStorage.setItem(PEDAL_HIDE_KEY, "1");
                    else window.sessionStorage.removeItem(PEDAL_HIDE_KEY);
                  } catch {
                    /* stockage indisponible */
                  }
                  // Fermeture immédiate + saut à la case suivante.
                  if (e.target.checked) closePedalAlert();
                }}
              />
              {en ? "Do not show this message again" : "Ne plus afficher ce message"}
            </label>
          <div className="mt-2 flex justify-end">
            <button
              type="button"
              className="rounded border border-gray-950/40 px-2 py-0.5 text-xs font-bold !text-gray-950"
              onClick={closePedalAlert}
            >
              OK
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
