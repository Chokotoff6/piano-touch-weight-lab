import { useEffect, useState } from "react";
import { Check } from "lucide-react";
import {
  AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useInterventions, interventionLabel, INITIAL_DIAGNOSTIC_ID } from "@/lib/interventions";

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
  const items = useInterventions();
  const [picked, setPicked] = useState<string[]>([]);
  const [other, setOther] = useState(false);
  const [otherText, setOtherText] = useState("");

  useEffect(() => {
    if (!open) return;
    setPicked(mode === "first" && items.some((i) => i.id === INITIAL_DIAGNOSTIC_ID) ? [INITIAL_DIAGNOSTIC_ID] : []);
    setOther(false);
    setOtherText("");
  }, [open, mode, items]);

  const toggle = (id: string) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  const name = [
    ...items.filter((i) => picked.includes(i.id)).map((i) => interventionLabel(i, en)),
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
          {items.map((i) => (
            <button key={i.id} type="button" aria-pressed={picked.includes(i.id)} className={chip(picked.includes(i.id))} onClick={() => toggle(i.id)}>
              {picked.includes(i.id) && <Check className="h-3.5 w-3.5" />}{interventionLabel(i, en)}
            </button>
          ))}
          <button type="button" aria-pressed={other} className={chip(other)} onClick={() => setOther((o) => !o)}>
            {other && <Check className="h-3.5 w-3.5" />}{en ? "Other" : "Autre"}
          </button>
        </div>
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
