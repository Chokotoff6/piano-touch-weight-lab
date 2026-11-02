import { useEffect, useState } from "react";
import {
  AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { AutoDismissAlert } from "@/components/AutoDismissAlert";
import { useInterventions, interventionLabel, ANTECEDENT_GROUPS, ANTECEDENT_ITEMS, ANTECEDENT_KEYWORDS } from "@/lib/interventions";

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

/** Choix des interventions pour nommer un point d'historique — même présentation que l'historique instrument. */
export function HistoryPointDialog({ open, en, mode, boxClassName, btnClassName, onCancel, onUpdateCurrent, onCreate }: Props) {
  const shortList = useInterventions();
  const shortIds = new Set(shortList.map((i) => i.id));
  const items = [...shortList, ...ANTECEDENT_ITEMS.filter((i) => !shortIds.has(i.id))];
  const [picked, setPicked] = useState<string[]>([]);
  const [details, setDetails] = useState<Record<string, string>>({});
  const [customs, setCustoms] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  // "shortcuts" ouvert par défaut ; "*" = tout déplié.
  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set(["shortcuts"]));
  const [errorKey, setErrorKey] = useState(0);
  const fold = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const q = fold(query.trim());
  const matchItem = (it: { id: string; fr: string; en: string }) =>
    !q || fold(`${it.fr} ${it.en} ${ANTECEDENT_KEYWORDS[it.id] ?? ""}`).includes(q);

  useEffect(() => {
    if (!open) return;
    setPicked([]);
    setDetails({});
    setCustoms([]);
    setQuery("");
    setOpenGroups(new Set(["shortcuts"]));
    setErrorKey(0);
  }, [open, mode]);

  const toggle = (id: string) => { setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id])); setErrorKey(0); };
  const toggleGroup = (id: string) => setOpenGroups((s) => { const n = new Set(s); n.delete("*"); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const allOpen = openGroups.has("*");
  const isOpen = (id: string) => q !== "" || allOpen || openGroups.has(id);

  const name = [
    ...picked.map((id) => {
      const i = items.find((x) => x.id === id);
      const d = (details[id] ?? "").trim();
      return `${i ? interventionLabel(i, en) : id}${d ? ` (${d})` : ""}`;
    }),
    ...customs.map((c) => c.trim()).filter(Boolean),
  ].join(" + ");

  const submit = () => {
    if (!name) { setErrorKey((k) => k + 1); return; }
    onCreate(name);
  };

  const group = (id: string, label: string, list: { id: string; fr: string; en: string }[], extra?: React.ReactNode) => {
    const visible = list.filter((it) => !picked.includes(it.id) && matchItem(it));
    if (q && visible.length === 0) return null;
    const count = list.filter((it) => picked.includes(it.id)).length;
    const o = isOpen(id);
    return (
      <div key={id} className="rounded border border-border">
        <button type="button" className="flex w-full px-2 py-1.5 text-left text-sm font-semibold" onClick={() => toggleGroup(id)}>
          {o ? "▾" : "▸"} {label}{count > 0 && ` (${count})`}
        </button>
        {o && (
          <div className="flex flex-wrap gap-1.5 px-2 pb-2">
            {visible.map((i) => (
              <button key={i.id} type="button" className="list-chip" onClick={() => toggle(i.id)}>{interventionLabel(i, en)}</button>
            ))}
            {extra}
          </div>
        )}
      </div>
    );
  };

  return (
    <AlertDialog open={open} onOpenChange={(o) => { if (!o) onCancel(); }}>
      <AlertDialogContent className={`${boxClassName} w-[95vw] max-w-4xl`}>
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
        <div className="space-y-1.5 border-b-2 border-foreground/50 pb-2">
          {picked.length === 0 && customs.length === 0 && (
            <div className="text-xs italic text-muted-foreground">{en ? "No intervention selected" : "Aucune intervention sélectionnée"}</div>
          )}
          {picked.map((id) => {
            const it = items.find((i) => i.id === id);
            return (
              <div key={id} className="flex flex-nowrap items-center gap-1.5">
                <span className="list-chip list-chip-active shrink-0 whitespace-nowrap">{it ? interventionLabel(it, en) : id}</span>
                <input autoFocus value={details[id] ?? ""} onChange={(e) => setDetails((d) => ({ ...d, [id]: e.target.value }))} maxLength={80}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); e.currentTarget.blur(); } }}
                  placeholder={en ? "Optional detail: e.g. 10 keys, treble..." : "Détail optionnel : ex. 10 touches, médium..."}
                  className="list-input min-w-[14rem] flex-1" />
                <button type="button" className="shrink-0 px-1 text-muted-foreground" aria-label={en ? "Remove" : "Retirer"} onClick={() => toggle(id)}>✕</button>
              </div>
            );
          })}
          {customs.map((c, k) => (
            <div key={`c${k}`} className="flex flex-nowrap items-center gap-1.5">
              <input autoFocus value={c} onChange={(e) => { const v = e.target.value; setCustoms((cs) => cs.map((x, j) => (j === k ? v : x))); setErrorKey(0); }} maxLength={120}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); e.currentTarget.blur(); } }}
                placeholder={en ? "Describe the intervention..." : "Décrivez l'intervention..."}
                className="list-input min-w-[14rem] flex-1" />
              <button type="button" className="shrink-0 px-1 text-muted-foreground" aria-label={en ? "Remove" : "Retirer"} onClick={() => setCustoms((cs) => cs.filter((_, j) => j !== k))}>✕</button>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <input value={query} onChange={(e) => setQuery(e.target.value)} className="list-input w-full pr-7"
              placeholder={en ? "Search an intervention (e.g. hammers, tuning, pinblock)" : "Rechercher une intervention (ex : marteaux, accord, sommier)"} />
            {query && (
              <button type="button" className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground" aria-label={en ? "Clear" : "Effacer"} onClick={() => setQuery("")}>✕</button>
            )}
          </div>
          <button type="button" className="shrink-0 whitespace-nowrap text-xs text-muted-foreground underline" onClick={() => setOpenGroups(allOpen ? new Set() : new Set(["*"]))}>
            {allOpen ? (en ? "Collapse all" : "Tout replier") : (en ? "Expand all" : "Tout déplier")}
          </button>
        </div>
        <div className="max-h-[45vh] space-y-1 overflow-y-auto pr-1">
          {group("shortcuts", en ? "Common interventions" : "Interventions courantes", shortList,
            !q && <button type="button" className="list-chip" onClick={() => { setCustoms((cs) => [...cs, ""]); setErrorKey(0); }}>{en ? "+ Add" : "+ Ajouter"}</button>)}
          {ANTECEDENT_GROUPS.map((g) => group(g.id, en ? g.en : g.fr, g.items.filter((it) => !shortIds.has(it.id))))}
        </div>
        <AlertDialogFooter className="relative flex-wrap gap-2 sm:justify-end">
          <AutoDismissAlert show={errorKey > 0} resetKey={errorKey}
            className="absolute bottom-full right-0 mb-2 rounded bg-gray-950 px-3 py-1.5 text-xs font-medium text-white shadow">
            {en ? "Please select at least one intervention or add one." : "Sélectionnez au moins une intervention ou ajoutez-en une."}
          </AutoDismissAlert>
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
          <button type="button" className={btnClassName} onClick={submit}>
            {mode === "first" ? (en ? "Save" : "Enregistrer") : (en ? "Create a new history point" : "Créer un nouveau point d'historique")}
          </button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
