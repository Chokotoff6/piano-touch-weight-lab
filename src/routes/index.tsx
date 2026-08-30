import { createFileRoute, Link } from "@tanstack/react-router";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Accueil — Touchweight statique piano" },
      {
        name: "description",
        content:
          "Outil collaboratif d'évaluation du touchweight statique pour piano : saisie des mesures et analyse des résultats.",
      },
      { property: "og:title", content: "Accueil — Touchweight statique piano" },
      {
        property: "og:description",
        content:
          "Outil collaboratif d'évaluation du touchweight statique pour piano.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Accueil,
});

function Accueil() {
  return (
    <main className="mx-auto max-w-[1400px] px-6 py-10">
      <h1 className="max-w-3xl text-xl font-semibold leading-snug">
        "Le touché de mon piano est-il trop dur ?" Outil de diagnostic du
        poids statique d'un clavier
      </h1>

      <div className="mt-6 max-w-3xl space-y-4 text-sm leading-relaxed text-foreground">
        <p>
          Bienvenue sur ce site collaboratif indépendant proposant un outil de
          mesure à disposition des pianistes et techniciens. L'objectif de
          l'outil est double: capter les données statiques d'un clavier à un
          moment "T" et, surtout, être en mesure de comparer celles-ci avec
          d'autres instruments du même modèle.
        </p>

        <p>
          Sur base des valeurs de poids ascendant(Wd) et descendant(Wa)
          relevées, l'outil calcule la friction et la balance mécanique de
          chaque touche, ainsi que la valeur moyenne de ces différentes données
          pour l'ensemble du clavier, par couleur de touche (blanches/noires). Un
          interface graphique présente également les résultats sous forme de
          courbes, permettant une analyse fine de l'équilibre général du
          clavier, ainsi qu'une comparaison avec d'autres instruments (si
          encodés par d'autres utilisateurs). Une courbe de référence
          correspondant aux moyennes "standard" généralement suggérées est
          également disponible. Celle-ci ne constitue cependant aucune
          référence universelle, chaque fabriquant/modèle ayant ses propres
          spécifications (souvent non-communiquées).
        </p>

        <p>
          L'outil permet également de suivre l'évolution d'un instrument au fil
          du temps: les résultats peuvent être sauvés localement (et rechargés)
          sous forme de fichier CSV, ou d'un rapport PDF imprimable.
        </p>

        <p>
          Des informations sur la manière de prélever ces données correctement
          sont disponibles sur :{" "}
          <a href="#" className="underline hover:text-primary">
            XXXX
          </a>{" "}
          (utilisez des liens hypertextes factices cliquables pour le moment).
          Des kits de "poids" calibrés sont disponibles sur :{" "}
          <a href="#" className="underline hover:text-primary">
            liens
          </a>
          .
        </p>

        <p>
          NB. Le "poids de toucher" global ressenti par le pianiste est une
          sensation "dynamique" : la géométrie de la mécanique, la friction
          des feutres et l'inertie des marteaux comptent tout autant que le
          simple poids de pesée "statique" mesurés ici. Plus d'informations :{" "}
          <a
            href="https://stanwoodpiano.com"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-primary"
          >
            stanwoodpiano.com
          </a>
          .
        </p>
      </div>

      <div className="mt-8">
        <Link
          to="/saisie"
          className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          Start your diagnosis
        </Link>
      </div>

      <section className="mt-10 max-w-3xl">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          FAQ
        </h2>
        <Accordion type="single" collapsible className="mt-4 w-full">
          <AccordionItem value="q1">
            <AccordionTrigger>
              What is the difference between static and dynamic touch weight?
            </AccordionTrigger>
            <AccordionContent>
              Static weight (measured here) is the physical force needed to move
              a key at rest. Dynamic weight is the actual feeling of the key when
              playing, which depends on friction, key geometry, felt density,
              and hammer inertia.
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="q2">
            <AccordionTrigger>
              Why are Down Weight (Wa) and Up Weight (Wd) both necessary?
            </AccordionTrigger>
            <AccordionContent>
              Measuring both allows the tool to isolate friction from the actual
              balance of the key. Down weight is the minimum weight to push the
              key down. Up weight is the maximum weight the key can lift back
              up.
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="q3">
            <AccordionTrigger>
              How does the app calculate Friction and Balance?
            </AccordionTrigger>
            <AccordionContent>
              The app uses standard piano technology formulas: Friction = (Wd -
              Wa) / 2 and Balance = (Wd + Wa) / 2. High friction usually means
              swollen felts or tight center pins.
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="q4">
            <AccordionTrigger>
              What if my piano has no letters in its serial number?
            </AccordionTrigger>
            <AccordionContent>
              Many high-end European and Japanese models use purely numerical
              serial numbers. The app will automatically cross-reference your
              brand and location to apply the correct original factory
              standards.
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="q5">
            <AccordionTrigger>
              Pourquoi le profil d'usine (Europe ou Japon) fait-il varier la Friction cible et pas la Balance ?
            </AccordionTrigger>
            <AccordionContent>
              Le profil d'usine détermine le calibrage d'origine des feutres de la mécanique. Le feutre est une matière organique extrêmement sensible à l'humidité de l'air (hygrométrie) :

              <p className="mt-2">
                <strong>Profil Europe (Climats Humides)</strong> : Les feutres ont tendance à se gorger d'eau et à gonfler avec l'humidité ambiante, ce qui serre davantage les axes métalliques. L'usine calibre donc une friction théorique d'origine plus élevée, fixée à une cible de 13g.
              </p>

              <p className="mt-2">
                <strong>Profil Japon (Climat Sec / Intérieur)</strong> : Les feutres restent plus secs et rétractés, libérant le mouvement des axes métalliques. La friction théorique cible y est donc plus fluide, fixée à 11g.
              </p>

              <p className="mt-2">
                La Balance (le plombage de la touche en bois), quant à elle, reste une constante physique fixe (environ 40-42g) définie en usine par l'emplacement et la masse des plombs d'équilibrage insérés dans le corps de la touche, quelle que soit la zone géographique d'exportation.
              </p>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="q6">
            <AccordionTrigger>
              Quels sont les facteurs qui interviennent dans le ressenti de
              "poids de toucher" d'un clavier ?
            </AccordionTrigger>
            <AccordionContent>
              Pour comprendre comment ces 4 moyennes dictent ce que ressentent
              vos doigts sur le clavier, imaginez que la touche de votre piano est
              une balançoire de cour de récréation.

              <p className="mt-2">
                <strong>1. Le Poids Descendant (Wa) : 'L'effort de démarrage'</strong>
              </p>

              <p className="mt-1">
                Ce que c'est : Le poids minimal nécessaire pour faire
                s'enfoncer la touche au repos.
              </p>

              <p className="mt-1">
                Le ressenti sous le doigt : C'est la première barrière que
                rencontre votre doigt. Si le Wa est trop élevé (au-dessus de
                54g), le clavier donne une sensation de 'fermeté' ou de
                'lourdeur brute' dès que vous posez les doigts sur les
                touches. Un Wa fort élevé est le premier signal d'alarme
                d'un problème mécanique majeur. En facture de piano, un
                standard acoustique oscille généralement entre 48g et 52g au
                centre. Si votre tracé indique un Wa à 60g, 70g ou plus, le piano
                souffre d'un dysfonctionnement lourd.
              </p>

              <p className="mt-2">
                <strong>2. Le Poids Ascendant (Wd) : 'La réactivité du retour'</strong>
              </p>

              <p className="mt-1">
                Ce que c'est : La force avec laquelle la touche pousse votre
                doigt vers le haut pour revenir à sa position de repos.
              </p>

              <p className="mt-1">
                Le ressenti sous le doigt : C'est le dynamisme du clavier. Si
                le Wd est élevé (autour de 35g-40g), le clavier est
                'nerveux' et 'rapide' : la touche colle à votre
                doigt, ce qui est parfait pour la répétition rapide des notes
                (trilles, répétitions). Si le Wd est trop bas (en dessous de
                30g), le clavier semble 'mou', 'paresseux', et la
                touche peine à remonter.
              </p>

              <p className="mt-2">
                <strong>3. La Friction (F) : 'La fluidité du voyage' [L'ÉLÉMENT MAJEUR DU RESSENTI]</strong>
              </p>

              <p className="mt-1">
                Ce que c'est : La résistance créée par les frottements des
                pièces en mouvement (les axes en feutre et les pivots en laine
                sous la touche).
              </p>

              <p className="mt-1">
                Le ressenti sous le doigt : C'est la texture du toucher. Une
                friction idéale (11g à 13g) donne un toucher 'onctueux'
                et un contrôle parfait des nuances douces (pianissimo). Une
                friction trop forte ({'>'} 15g) donne un toucher
                'pâteux', 'gélatineux' ou 'lourd'.
                Vous avez l'impression de jouer dans du sable. Une friction
                trop faible ({'<'} 8g) donne un toucher 'clavier
                plastique', instable et fuyant.
              </p>

              <p className="mt-2">
                <strong>4. La Balance (B) : 'La lourdeur de la balançoire'</strong>
              </p>

              <p className="mt-1">
                Ce que c'est : Le poids d'équilibre moyen de la
                mécanique une fois qu'on a retiré les frottements.
              </p>

              <p className="mt-1">
                Le ressenti sous le doigt : C'est la sensation de masse
                physique de l'instrument. Si la balance est élevée, vous
                ressentez que les pièces internes (le bois, les marteaux) sont
                lourdes à déplacer, indépendamment de leur fluidité.
              </p>

              <p className="mt-2">
                <strong>Résumé du diagnostic visuel (Croisement des données pour identifier une panne) :</strong>
              </p>

              <p className="mt-1">
                Quand vous trouvez un clavier trop lourd à enfoncer (Wa élevé),
                deux scénarios cliniques s'ouvrent à l'analyse :
              </p>

              <p className="mt-1">
                - Scénario A : Wa est très élevé ET Wd est très bas (Ex: Wa=65g,
                Wd=15g) {'->'} Le coupable est l'excès de Friction (F). La cause
                physique : la Balance du piano est bonne, mais les articulations
                sont totalement grippées. L'humidité a fait gonfler les feutres
                des mortaises de la touche ou les ganses de pivots (les axes en
                laine). Il faut rajouter énormément de poids pour vaincre la
                résistance au départ, mais le mécanisme n'a plus
                l'énergie de rejeter la touche vers le haut.
              </p>

              <p className="mt-1">
                - Scénario B : Wa est très élevé ET Wd reste élevé (Ex: Wa=65g,
                Wd=42g) -> Le coupable est l'excès de Masse ou de Plombage
                (Masse de la Balance B). La cause physique : le mécanisme
                fonctionne de manière fluide (la friction reste basse), mais il y
                a un excès de poids brut des pièces mouvantes : soit des
                marteaux trop lourds (après un re-feutrage mal calibré), soit un
                manque cruel de plombage de compensation dans le corps en bois
                des touches (le clavier manque de plomb à l'avant pour faire
                contrepoids). La touche est lourde à descendre, mais puisqu'elle
                retient une masse importante à l'arrière, elle remonte comme
                un ressort brutal.
              </p>

              <p className="mt-1">
                - Le cas particulier des Pianos Droits : Si le Wa s'envole,
                enfoncez la pédale forte. Si le Wa redevient normal, le problème
                vient des ressorts de cuillères d'étouffoirs qui sont
                réglés beaucoup trop durs.
              </p>

              <p className="mt-1">
                Important : En facture de piano, les mesures de Wa et Wd doivent
                toujours être effectuées avec la pédale de sustain (forte)
                enfoncée. Cela s'applique de manière identique pour les
                pianos droits et pour les pianos à queue. Si vous ne bloquez pas
                les étouffoirs avec la pédale, votre doigt doit soulever deux
                mechanisms en même temps. Sur un piano droit, les ressorts
                d'étouffoirs faussent le Wa de 10g à 20g dès le milieu du
                clavier. Sur un piano à queue, les étouffoirs reposent
                directement sur l'arrière de la touche et ajoutent un poids
                mort de 8g à 12g qui s'arrête brusquement à la note 69.
                Enfoncer la pédale forte permet d'isoler le toucher pur du
                clavier en libérant les cordes, garantissant une mesure homogène
                de la note 1 à la note 88.
              </p>

              <p className="mt-2">
                <strong>⚠️ Ce qui est volontairement laissé de côté ici</strong>
              </p>

              <p className="mt-1">
                Notre outil mesure uniquement ces données statiques (le piano
                au repos). Pour être tout à fait complet, le protocole avancé de
                Stanwood Piano démontre que le ressenti final d'un pianiste
                en plein jeu dépend également de paramètres dynamiques complexes
                que nous n'intégrons pas ici :
              </p>

              <p className="mt-1">
                - L'Inertie du Marteau (Hammer Strike Weight) : Le poids
                physique du feutre et du bois du marteau, qui démultiplie
                l'effort dès que l'on joue vite ou fort.
              </p>

              <p className="mt-1">
                - Le Rapport de Bascule (Ratio de la mécanique) : La
                géométrie exacte de la touche (effet de levier) qui amplifie ou
                réduit le mouvement du doigt.
              </p>

              <p className="mt-1">
                - Le Poids de l'Échappement (Let-off resistance) : La petite
                résistance supplémentaire ressentie en bout de course lorsque le
                marteau se libère pour frapper la corde.
              </p>

              <p className="mt-1">
                - La Résistance de la Pédale Forte (Sustain pedal engagement) :
                L'effort supplémentaire demandé aux doigts pour soulever les
                étouffoirs en mode de jeu normal par rapport au jeu avec pédale.
              </p>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </section>
    </main>
  );
}
