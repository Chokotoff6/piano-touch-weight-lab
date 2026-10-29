import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { ArrowDown, ArrowUp, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  useInterventions, interventionLabel, addIntervention, removeIntervention, moveIntervention, resetInterventions,
} from "@/lib/interventions";
import { effectiveModels, addModel, removeModel, resetModels, knownBrands, subscribeModelCatalog } from "@/data/pianoModels";

type P = { open: boolean; onOpenChange: (o: boolean) => void; en: boolean };

/** Types d'intervention : ordre, ajout, suppression, restauration d'usine. */
export function InterventionListDialog({ open, onOpenChange, en }: P) {
  const items = useInterventions();
  const [draft, setDraft] = useState("");
  const add = () => { addIntervention(draft); setDraft(""); };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] max-w-md overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{en ? "Intervention types list" : "Liste types d'intervention"}</DialogTitle>
          <DialogDescription>{en ? "Order, add or remove the suggestions offered when creating a history point." : "Ordonnez, ajoutez ou supprimez les suggestions proposées à la création d'un point d'historique."}</DialogDescription>
        </DialogHeader>
        <ul className="list-panel">
          {items.map((i, idx) => (
            <li key={i.id} className="list-row">
              <span className="min-w-0 flex-1 truncate">{interventionLabel(i, en)}</span>
              <button type="button" className="list-icon" disabled={idx === 0} aria-label={en ? "Move up" : "Monter"} onClick={() => moveIntervention(i.id, -1)}><ArrowUp className="h-4 w-4" /></button>
              <button type="button" className="list-icon" disabled={idx === items.length - 1} aria-label={en ? "Move down" : "Descendre"} onClick={() => moveIntervention(i.id, 1)}><ArrowDown className="h-4 w-4" /></button>
              <button type="button" className="list-icon" aria-label={en ? "Remove" : "Supprimer"} onClick={() => removeIntervention(i.id)}><Trash2 className="h-4 w-4" /></button>
            </li>
          ))}
        </ul>
        <div className="flex gap-2">
          <input className="list-input" value={draft} maxLength={80} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") add(); }} placeholder={en ? "New intervention..." : "Nouvelle intervention..."} />
          <Button type="button" variant="outline" disabled={!draft.trim()} onClick={add}>{en ? "Add" : "Ajouter"}</Button>
        </div>
        <Button type="button" variant="outline" size="sm" className="self-start" onClick={resetInterventions}>{en ? "Restore factory list" : "Restaurer la liste d'usine"}</Button>
      </DialogContent>
    </Dialog>
  );
}

let catalogVersion = 0;
subscribeModelCatalog(() => { catalogVersion += 1; });
const useCatalogVersion = () => useSyncExternalStore(subscribeModelCatalog, () => catalogVersion, () => 0);

/** Modèles de piano : filtre marque + type, tri alphabétique, ajout, suppression, restauration. */
export function ModelListDialog({ open, onOpenChange, en }: P) {
  const version = useCatalogVersion();
  const brands = useMemo(() => knownBrands(), [version, open]); // eslint-disable-line react-hooks/exhaustive-deps
  const [brand, setBrand] = useState("");
  const [type, setType] = useState<"droit" | "queue">("droit");
  const [draft, setDraft] = useState("");
  useEffect(() => { if (open && !brand && brands[0]) setBrand(brands[0]); }, [open, brand, brands]);
  const models = useMemo(() => (brand ? effectiveModels(brand, type) : []), [brand, type, version]); // eslint-disable-line react-hooks/exhaustive-deps
  const add = () => { addModel(brand, type, draft); setDraft(""); };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] max-w-md overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{en ? "Brands & models list" : "Liste marques & modèles"}</DialogTitle>
          <DialogDescription>{en ? "Pick a brand and a type to view and edit its models." : "Choisissez une marque et un type pour afficher et modifier ses modèles."}</DialogDescription>
        </DialogHeader>
        <div className="flex flex-wrap items-center gap-2">
          <select className="list-input w-auto flex-1" value={brand} onChange={(e) => setBrand(e.target.value)}>
            {brands.map((b) => <option key={b} value={b}>{b}</option>)}
          </select>
          {(["droit", "queue"] as const).map((t) => (
            <button key={t} type="button" aria-pressed={type === t} className={`list-chip ${type === t ? "list-chip-active" : ""}`} onClick={() => setType(t)}>
              {t === "droit" ? (en ? "Upright" : "Droit") : (en ? "Grand" : "à Queue")}
            </button>
          ))}
        </div>
        <ul className="list-panel">
          {models.length === 0 && <li className="list-row italic text-muted-foreground">{en ? "No model" : "Aucun modèle"}</li>}
          {models.map((m) => (
            <li key={m} className="list-row">
              <span className="min-w-0 flex-1 truncate">{m}</span>
              <button type="button" className="list-icon" aria-label={en ? "Remove" : "Supprimer"} onClick={() => removeModel(brand, type, m)}><Trash2 className="h-4 w-4" /></button>
            </li>
          ))}
        </ul>
        <div className="flex gap-2">
          <input className="list-input" value={draft} maxLength={40} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && draft.trim()) add(); }} placeholder={en ? "New model..." : "Nouveau modèle..."} />
          <Button type="button" variant="outline" disabled={!draft.trim() || !brand} onClick={add}>{en ? "Add" : "Ajouter"}</Button>
        </div>
        <Button type="button" variant="outline" size="sm" className="self-start" disabled={!brand} onClick={() => resetModels(brand, type)}>{en ? "Restore factory list" : "Restaurer la liste d'usine"}</Button>
      </DialogContent>
    </Dialog>
  );
}
