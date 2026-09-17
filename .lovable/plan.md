# Nettoyage des tables internes inutilisées

## Ce qui a été vérifié dans le code

- `piano_profiles` et `piano_actuel` **internes** (base Lovable Cloud) : aucun accès dans le code. Toutes les lectures/écritures de profils de pianos passent par le client externe (`@/integrations/external-supabase/client`) vers votre base de production, via `src/lib/current-piano.ts` et `src/routes/comparer.tsx`.
- `pianos_diagnostics` (interne) : **utilisée**. La page Saisie l'écrit et la relit par l'intermédiaire de `src/lib/diagnostics.functions.ts` (insert / update / lecture par empreinte). Elle est conservée.

## Ce que je vais faire

1. Une migration de base qui supprime définitivement les deux tables internes inutilisées :
   - `public.piano_profiles` (version aux colonnes françaises)
   - `public.piano_actuel`
   avec les politiques, index et déclencheurs qui leur sont attachés.
2. Régénération du fichier de types de la base pour qu'elles n'y figurent plus.
3. Vérification du build (types + compilation) pour garantir qu'aucun écran ne casse.

## Ce que je ne touche pas

- La configuration et le client de votre base externe de production (aucune modification).
- La table interne `pianos_diagnostics` et le code de la page Saisie qui l'utilise.

## Détail technique

```sql
DROP TABLE IF EXISTS public.piano_profiles CASCADE;
DROP TABLE IF EXISTS public.piano_actuel CASCADE;
```

Puis régénération de `src/integrations/supabase/types.ts`.

## Réponse à votre question sur les colonnes

Pour la table **interne** `piano_profiles`, le code n'utilise **aucune** colonne : `id`, `serial_number`, `marque`, `modele`, `wa_values`, `wd_values`, `friction_values`, `balance_values`, `created_at` sont toutes orphelines — d'où la suppression.

Pour la table `piano_profiles` de votre **base externe**, le code utilise : `id`, `brand`, `model`, `serial_number`, `is_buffer`, `type_piano`, `mesure_date`, `manufacture_year`, `climate_zone`, `maintenance_type`, `usage_level`, `ville`, `pays`, `remarques`, `wa_values`, `wd_values`, `friction_values`, `balance_values`, `created_at`, plus le champ d'auteur lu par le filtre « QUI ». Toute autre colonne présente dans cette base externe n'est pas exploitée par l'application ; je n'y ai pas accès pour en dresser la liste exacte.
