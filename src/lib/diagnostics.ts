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

export async function insertDiagnostic(p: DiagnosticPayload): Promise<string> {
  return (await insertDiagnosticFn({ data: p })) as string;
}

export async function updateDiagnostic(id: string, p: DiagnosticPayload): Promise<string | null> {
  return (await updateDiagnosticFn({ data: { ...p, id } })) as string | null;
}

export async function getOwnDiagnostics(
  userFingerprint: string,
  numeroCentral: string,
): Promise<DiagnosticHistoryRow[]> {
  const rows = await getOwnDiagnosticsFn({
    data: { user_fingerprint: userFingerprint, numero_central: numeroCentral },
  });
  return (rows ?? []) as unknown as DiagnosticHistoryRow[];
}

