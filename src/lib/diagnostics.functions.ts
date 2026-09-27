// Accès serveur aux diagnostics : remplace les appels RPC directs depuis le
// navigateur. Les fonctions SQL SECURITY DEFINER ne sont plus exposées à
// l'API publique ; toute écriture/lecture passe ici, avec validation stricte.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const text = (max: number) => z.string().trim().max(max).default("");

const payloadSchema = z.object({
  user_fingerprint: z.string().trim().min(8).max(200),
  marque: text(120),
  type_piano: text(120),
  modele: text(120),
  prefixe_lettre: text(20),
  numero_central: z.string().trim().min(1).max(60),
  suffixe_lettre: text(20),
  annee_fabrication: z.number().int().min(1700).max(2200).nullable().default(null),
  pays: text(120),
  ville: text(120),
  zone_climatique: text(120),
  type_entretien: text(120),
  remarques: text(4000),
  mesures_wa: z.array(z.string().max(20)).max(200).default([]),
  mesures_wd: z.array(z.string().max(20)).max(200).default([]),
});

type Payload = z.infer<typeof payloadSchema>;

function row(p: Payload) {
  return {
    user_fingerprint: p.user_fingerprint,
    marque: p.marque,
    type_piano: p.type_piano,
    modele: p.modele,
    prefixe_lettre: p.prefixe_lettre,
    numero_central: p.numero_central,
    suffixe_lettre: p.suffixe_lettre,
    annee_fabrication: p.annee_fabrication,
    pays: p.pays,
    ville: p.ville,
    zone_climatique: p.zone_climatique,
    type_entretien: p.type_entretien,
    remarques: p.remarques,
    mesures_wa: p.mesures_wa as unknown as never,
    mesures_wd: p.mesures_wd as unknown as never,
  };
}

export const insertDiagnosticFn = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => payloadSchema.parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: inserted, error } = await supabaseAdmin
      .from("pianos_diagnostics")
      .insert({ ...row(data), date_heure_saisie: new Date().toISOString() })
      .select("id")
      .single();
    if (error) {
      console.error("[diagnostics] insert", error);
      throw new Error("Enregistrement impossible");
    }
    return inserted.id as string;
  });

export const updateDiagnosticFn = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    payloadSchema.extend({ id: z.string().uuid() }).parse(data),
  )
  .handler(async ({ data }) => {
    const { id, ...rest } = data;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // Le fingerprint du propriétaire conditionne la mise à jour.
    const { data: updated, error } = await supabaseAdmin
      .from("pianos_diagnostics")
      .update(row(rest))
      .eq("id", id)
      .eq("user_fingerprint", rest.user_fingerprint)
      .select("id")
      .maybeSingle();
    if (error) {
      console.error("[diagnostics] update", error);
      throw new Error("Mise à jour impossible");
    }
    return (updated?.id as string | undefined) ?? null;
  });

export const getOwnDiagnosticsFn = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z
      .object({
        user_fingerprint: z.string().trim().min(8).max(200),
        numero_central: z.string().trim().min(1).max(60),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows, error } = await supabaseAdmin
      .from("pianos_diagnostics")
      .select("*")
      .eq("user_fingerprint", data.user_fingerprint)
      .eq("numero_central", data.numero_central);
    if (error) {
      console.error("[diagnostics] select", error);
      throw new Error("Lecture impossible");
    }
    return rows ?? [];
  });
