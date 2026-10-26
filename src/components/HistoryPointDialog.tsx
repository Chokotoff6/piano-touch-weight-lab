import { useEffect, useState } from "react";
import { Check } from "lucide-react";
import {
  AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useInterventions, interventionLabel, INITIAL_DIAGNOSTIC_ID } from "@/lib/interventions";

type Props = {
  open: boolean;
  en: boolean;
  /** "first" = premier point d'un nouveau dossier ; "propose" = nouveau point suggéré. */
  mode: "first" | "propose";
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
          <AlertDialogTitle>{en ? "History point" : "Point d'historique"}</AlertDialogTitle>
          <AlertDialogDescription className="text-gray-700">
            {mode === "propose"
              ? (en
                ? "Create a new history point for this piano? (Recommended if you made regulation changes.) Select the work carried out:"
                : "Créer un nouveau point d'historique pour ce piano ? (Recommandé si vous avez effectué des modifications de régulation.) Sélectionnez les interventions :")
              : (en ? "Select the work carried out for this first history point:" : "Sélectionnez les interventions de ce premier point d'historique :")}
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
          {mode === "propose" ? (
            <button type="button" className={btnClassName} onClick={onUpdateCurrent}>{en ? "No, update current point" : "Non, mettre à jour le point actuel"}</button>
          ) : (
            <button type="button" className={btnClassName} onClick={onCancel}>{en ? "Cancel" : "Annuler"}</button>
          )}
          <button type="button" className={btnClassName} onClick={() => onCreate(name)}>
            {mode === "propose" ? (en ? "Create history point" : "Créer le point d'historique") : (en ? "Save" : "Enregistrer")}
          </button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
