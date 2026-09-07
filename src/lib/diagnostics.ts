// Synchronisation cloud du diagnostic (INSERT / UPDATE via fonctions sécurisées).
import { supabase } from "@/integrations/supabase/client";

export type DiagnosticHistoryRow = {
  id: string;
  marque: string | null;
  type_piano: string | null;
  modele: string | null;
  prefixe_lettre: string | null;
  numero_central: string | null;
  suffixe_lettre: string | null;
  annee_fabrication: number | null;
  pays: string | null;
  ville: string | null;
  zone_climatique: string | null;
  type_entretien: string | null;
  remarques: string | null;
  mesures_wa: unknown;
  mesures_wd: unknown;
  date_heure_saisie: string;
};

export type DiagnosticPayload = {
  user_fingerprint: string;
  marque: string;
  type_piano: string;
  modele: string;
  prefixe_lettre: string;
  numero_central: string;
  suffixe_lettre: string;
  annee_fabrication: number | null;
  pays: string;
  ville: string;
  zone_climatique: string;
  type_entretien: string;
  remarques: string;
  mesures_wa: string[];
  mesures_wd: string[];
};

const args = (p: DiagnosticPayload) => ({
  _user_fingerprint: p.user_fingerprint,
  _marque: p.marque,
  _type_piano: p.type_piano,
  _modele: p.modele,
  _prefixe_lettre: p.prefixe_lettre,
  _numero_central: p.numero_central,
  _suffixe_lettre: p.suffixe_lettre,
  _annee_fabrication: p.annee_fabrication as number,
  _pays: p.pays,
  _ville: p.ville,
  _zone_climatique: p.zone_climatique,
  _type_entretien: p.type_entretien,
  _remarques: p.remarques,
  _mesures_wa: p.mesures_wa,
  _mesures_wd: p.mesures_wd,
});

export async function insertDiagnostic(p: DiagnosticPayload): Promise<string> {
  const { data, error } = await supabase.rpc("insert_diagnostic", args(p));
  if (error) throw error;
  return data as string;
}

export async function updateDiagnostic(id: string, p: DiagnosticPayload): Promise<string | null> {
  const { data, error } = await supabase.rpc("update_own_diagnostic", { _id: id, ...args(p) });
  if (error) throw error;
  return (data as string | null) ?? null;
}

export async function getOwnDiagnostics(
  userFingerprint: string,
  numeroCentral: string,
): Promise<DiagnosticHistoryRow[]> {
  const { data, error } = await supabase.rpc("get_own_diagnostics", {
    _user_fingerprint: userFingerprint,
    _numero_central: numeroCentral,
  });
  if (error) throw error;
  return (data ?? []) as DiagnosticHistoryRow[];
}
