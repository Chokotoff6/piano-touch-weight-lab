import { useEffect, useState } from "react";
import { Check } from "lucide-react";
import {
  AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useInterventions, interventionLabel, INITIAL_DIAGNOSTIC_ID, ANTECEDENT_GROUPS, ANTECEDENT_ITEMS, ANTECEDENT_KEYWORDS } from "@/lib/interventions";

type Props = {
  open: boolean;
  en: boolean;
  /** "first" = premier point ; "propose" = nouveau point suggéré ; "name" = nommer un nouveau point déjà décidé. */
  mode: "first" | "propose" | "name";
  boxClassName: string;
  btnClassName: string;
  onCancel: () => void;
  /** Mise à jour du point actif (mode "propose" uniquement). */
  onUpdateCurrent: () => void;
  onCreate: (name: string) => void;
};

/** Choix multiple des interventions + « Autre » libre, pour nommer un point d'historique. */
export function HistoryPointDialog({ open, en, mode, boxClassName, btnClassName, onCancel, onUpdateCurrent, onCreate }: Props) {
  const shortList = useInterventions();
  // Catalogue unifié : liste d'atelier + catalogue complet (mêmes familles que l'historique instrument).
  const shortIds = new Set(shortList.map((i) => i.id));
  const items = [...shortList, ...ANTECEDENT_ITEMS.filter((i) => !shortIds.has(i.id))];
  const [picked, setPicked] = useState<string[]>([]);
  const [details, setDetails] = useState<Record<string, string>>({});
  const [other, setOther] = useState(false);
  const [otherText, setOtherText] = useState("");
  const [query, setQuery] = useState("");
  const [openGroup, setOpenGroup] = useState<string | null>(null);
  const fold = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const q = fold(query.trim());
  const matchItem = (it: { id: string; fr: string; en: string }) =>
    !q || fold(`${it.fr} ${it.en} ${ANTECEDENT_KEYWORDS[it.id] ?? ""}`).includes(q);

  useEffect(() => {
    if (!open) return;
    setPicked(mode === "first" && shortList.some((i) => i.id === INITIAL_DIAGNOSTIC_ID) ? [INITIAL_DIAGNOSTIC_ID] : []);
    setDetails({});
    setOther(false);
    setOtherText("");
    setQuery("");
    setOpenGroup(null);
  }, [open, mode, shortList]);

  const toggle = (id: string) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  const name = [
    ...items.filter((i) => picked.includes(i.id)).map((i) => {
      const d = (details[i.id] ?? "").trim();
      return `${interventionLabel(i, en)}${d ? ` (${d})` : ""}`;
    }),
    ...(other && otherText.trim() ? [otherText.trim()] : []),
  ].join(" + ");

  const chip = (active: boolean) =>
    `list-chip ${active ? "list-chip-active" : ""}`;

  return (
    <AlertDialog open={open} onOpenChange={(o) => { if (!o) onCancel(); }}>
      <AlertDialogContent className={boxClassName}>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {mode === "propose"
              ? (en ? "Measurements have been modified. What would you like to do?" : "Des mesures ont été modifiées. Que souhaitez-vous faire ?")
              : (en ? "History point" : "Point d'historique")}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-gray-700">
            {mode === "first"
              ? (en ? "Select the work carried out for this first history point:" : "Sélectionnez les interventions de ce premier point d'historique :")
              : (en ? "To create a new history point, select the work carried out:" : "Pour créer un nouveau point d'historique, sélectionnez les interventions :")}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="flex flex-wrap gap-2">
          {shortList.filter((i) => matchItem(i)).map((i) => (
            <button key={i.id} type="button" aria-pressed={picked.includes(i.id)} className={chip(picked.includes(i.id))} onClick={() => toggle(i.id)}>
              {picked.includes(i.id) && <Check className="h-3.5 w-3.5" />}{interventionLabel(i, en)}
            </button>
          ))}
          <button type="button" aria-pressed={other} className={chip(other)} onClick={() => setOther((o) => !o)}>
            {other && <Check className="h-3.5 w-3.5" />}{en ? "+ Add" : "+ Ajouter"}
          </button>
        </div>
        <div className="relative">
          <input value={query} onChange={(e) => setQuery(e.target.value)} className="list-input w-full pr-7"
            placeholder={en ? "Search an intervention (e.g. hammers, bushings, pinblock)" : "Rechercher une intervention (ex : marteaux, mortaises, sommier)"} />
          {query && (
            <button type="button" className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground" aria-label={en ? "Clear" : "Effacer"} onClick={() => setQuery("")}>✕</button>
          )}
        </div>
        <div className="max-h-[40vh] space-y-1 overflow-y-auto pr-1">
          {ANTECEDENT_GROUPS.map((g) => {
            const visible = g.items.filter((it) => !shortIds.has(it.id) && matchItem(it));
            if (visible.length === 0) return null;
            const count = visible.filter((it) => picked.includes(it.id)).length;
            const isOpen = q !== "" || openGroup === g.id;
            return (
              <div key={g.id} className="rounded border border-border">
                <button type="button" className="flex w-full px-2 py-1 text-left text-sm font-semibold" onClick={() => setOpenGroup(openGroup === g.id ? null : g.id)}>
                  {isOpen ? "▾" : "▸"} {en ? g.en : g.fr}{count > 0 && ` (${count})`}
                </button>
                {isOpen && (
                  <div className="flex flex-wrap gap-1.5 px-2 pb-2">
                    {visible.map((i) => (
                      <button key={i.id} type="button" aria-pressed={picked.includes(i.id)} className={chip(picked.includes(i.id))} onClick={() => { toggle(i.id); if (q) { setOpenGroup(g.id); setQuery(""); } }}>
                        {picked.includes(i.id) && <Check className="h-3.5 w-3.5" />}{interventionLabel(i, en)}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        {items.filter((i) => picked.includes(i.id) && i.id !== INITIAL_DIAGNOSTIC_ID).map((i) => (
          <div key={`d${i.id}`} className="flex items-center gap-2">
            <span className="shrink-0 text-sm font-semibold">{interventionLabel(i, en)} :</span>
            <input value={details[i.id] ?? ""} onChange={(e) => setDetails((d) => ({ ...d, [i.id]: e.target.value }))} maxLength={80}
              placeholder={en ? "Optional detail: e.g. 10 keys, treble..." : "Détail optionnel : ex. 10 touches, médium..."}
              className="list-input min-w-0 flex-1" />
          </div>
        ))}
        {other && (
          <input autoFocus value={otherText} onChange={(e) => setOtherText(e.target.value)} maxLength={120}
            placeholder={en ? "Describe the intervention..." : "Décrivez l'intervention..."}
            className="list-input" />
        )}
        <AlertDialogFooter className="flex-wrap gap-2 sm:justify-end">
          <button type="button" className={btnClassName} onClick={onCancel}>{en ? "Cancel" : "Annuler"}</button>
          {mode === "propose" && (
            <button
              type="button"
              className={btnClassName}
              title={en
                ? "If action regulation changes (excluding tuning) were made, create a new history point instead."
                : "Si des modifications de régulation mécanique (hors accord) ont été faites, créez plutôt un nouveau point d'historique."}
              onClick={onUpdateCurrent}
            >
              {en ? "Update current history point" : "Actualiser le point d'historique actuel"}
            </button>
          )}
          <button type="button" className={btnClassName} onClick={() => onCreate(name)}>
            {mode === "first" ? (en ? "Save" : "Enregistrer") : (en ? "Create a new history point" : "Créer un nouveau point d'historique")}
          </button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
