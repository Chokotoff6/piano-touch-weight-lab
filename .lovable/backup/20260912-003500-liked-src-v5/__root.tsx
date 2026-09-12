import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { initLang, setLang, useLang } from "@/data/translations";
import { initJourneyFlags, useTopbarState } from "@/lib/topbar-store";
import {
  ChevronDown,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  useRouterState,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

import { Toaster } from "@/components/ui/sonner";

import appCss from "../styles.css?url";
import likedLogoFrAsset from "@/assets/image_N48Ks9.png.asset.json";
import likedLogoEnAsset from "@/assets/image_DVGujN.png.asset.json";
import keyweightLogo from "@/assets/keyweight-logo.png.asset.json";
import { reportLovableError } from "../lib/lovable-error-reporting";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "KeyWeight" },
      { name: "description", content: "Outil technique de mesure du touchweight statique d’un piano." },
      { name: "author", content: "Touchweight piano" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:site", content: "@Lovable" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=JetBrains+Mono:ital,wght@0,400;0,500;0,600;1,400&family=Work+Sans:wght@400;500;600&display=swap",
      },
      { rel: "icon", href: "/favicon.png", type: "image/png" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="fr">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

const LEGAL_TEXT =
  "Conditions d'utilisation et clause de non-garantie Service en l'état : Ce site est un outil expérimental collaboratif mis à disposition gratuitement. L'éditeur ne fournit aucune garantie quant à la disponibilité du service, l'exactitude des calculs ou la conservation des données. L'éditeur se réserve le droit de modifier, restreindre ou fermer l'accès, ainsi que de supprimer l'historique des saisies à tout moment, sans préavis ni indemnité. L'éditeur reste libre d'introduire des fonctionnalités payantes. Sauf fermeture définitive du service, les numéros de série enregistrés durant la phase gratuite conserveront un accès préférentiel gratuit aux fonctionnalités de base existantes, sans que cela ne constitue un droit opposable.";

const RGPD_CONSENT_KEY = "rgpd-cgu-consent";
const consentLinkClass =
  "underline font-semibold text-blue-700 hover:text-blue-900";
const RGPD_CONSENT_TEXT = (
  <span>
    En poursuivant, vous acceptez notre{" "}
    <a href="/politique-confidentialite" target="_blank" rel="noopener noreferrer" className={consentLinkClass}>
      Politique de confidentialité (RGPD)
    </a>{" "}
    ainsi que nos{" "}
    <a href="/cgu" target="_blank" rel="noopener noreferrer" className={consentLinkClass}>
      CGU
    </a>
    . Vous êtes informés que les données de régulation cibles fournies le sont à titre purement indicatif, de recherche et d'aide au diagnostic indépendant, sans affiliation officielle avec les constructeurs cités.
  </span>
);

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const topbar = useTopbarState();
  const lang = useLang();
  const [consentOpen, setConsentOpen] = useState(false);
  /** Fenêtre interne de soutien collaboratif (bilingue). */
  const [supportOpen, setSupportOpen] = useState(false);
  /** Message flash au survol du bouton de soutien (3 s maximum). */
  const [supportHint, setSupportHint] = useState(false);
  const supportHintTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** Apparition temporisée du bouton LIKED : 5 s invisible, puis fondu 2 s.
      Le cycle se réinitialise à chaque entrée sur Résultats/Comparer. */
  const [likedVisible, setLikedVisible] = useState(false);
  const likedFadeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const likedActivePages = pathname === "/resultats" || pathname === "/comparer";
  useEffect(() => {
    if (!likedActivePages) {
      if (likedFadeTimer.current) {
        clearTimeout(likedFadeTimer.current);
        likedFadeTimer.current = null;
      }
      setLikedVisible(false);
      return;
    }
    // Démarre invisible, puis fondu après 5 s.
    setLikedVisible(false);
    likedFadeTimer.current = setTimeout(() => setLikedVisible(true), 5000);
    return () => {
      if (likedFadeTimer.current) {
        clearTimeout(likedFadeTimer.current);
        likedFadeTimer.current = null;
      }
    };
  }, [likedActivePages]);
  const [saveMenuOpen, setSaveMenuOpen] = useState(false);
  /** Infobulle « Importer » : visible au survol, masquée après 3 secondes. */
  const [importHint, setImportHint] = useState(false);
  const importHintTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const showImportHint = () => {
    setImportHint(true);
    if (importHintTimer.current) clearTimeout(importHintTimer.current);
    importHintTimer.current = setTimeout(() => setImportHint(false), 3000);
  };
  const hideImportHint = () => {
    if (importHintTimer.current) clearTimeout(importHintTimer.current);
    importHintTimer.current = null;
    setImportHint(false);
  };
  /** Fermeture du menu « Exporter » dès que la souris quitte le bouton ou le menu. */
  const menuCloseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cancelMenuClose = () => {
    if (menuCloseTimer.current) clearTimeout(menuCloseTimer.current);
    menuCloseTimer.current = null;
  };
  const scheduleMenuClose = () => {
    cancelMenuClose();
    menuCloseTimer.current = setTimeout(() => setSaveMenuOpen(false), 180);
  };
  const closeMenuNow = () => {
    cancelMenuClose();
    setSaveMenuOpen(false);
  };

  // La jauge verte est imbriquée sous le bouton « Sauver » (10 px, à droite) :
  // aucun calcul de position n'est nécessaire.
  const saveBtnRef = useRef<HTMLButtonElement | null>(null);
  const pendingActionRef = useRef<(() => void) | null>(null);
  useEffect(() => {
    initLang();
    initJourneyFlags();
  }, []);
  const isComparer = pathname === "/comparer";

  /** Affiche le consentement RGPD/CGU au premier clic Sauver/Importer de la
      session, puis exécute l'action différée après acceptation. */
  const requireConsent = (action: () => void) => {
    try {
      if (window.sessionStorage.getItem(RGPD_CONSENT_KEY) === "1") {
        action();
        return;
      }
    } catch { /* stockage indisponible */ }
    pendingActionRef.current = action;
    setConsentOpen(true);
  };
  const acceptConsent = () => {
    try {
      window.sessionStorage.setItem(RGPD_CONSENT_KEY, "1");
    } catch { /* stockage indisponible */ }
    setConsentOpen(false);
    const pending = pendingActionRef.current;
    pendingActionRef.current = null;
    pending?.();
  };

  const linkClass = "rounded-md px-3 py-2 text-base font-semibold !text-black transition-colors hover:bg-background sm:px-4 sm:text-lg";
  const activeLinkClass = "rounded-md bg-background px-3 py-2 text-base font-semibold !text-black shadow-sm sm:px-4 sm:text-lg";
  const lockedLinkClass = "cursor-not-allowed rounded-md px-3 py-2 text-base font-semibold !text-gray-300 sm:px-4 sm:text-lg";

  // Le bouton « Fichiers » reste actif hors Comparer dès qu'une saisie
  // exploitable existe (retour depuis Comparer inclus).
  const filesEnabled = isComparer || topbar.measuresReady || topbar.gateReady;

  const dispatchAction = (type: string) => {
    window.dispatchEvent(new CustomEvent(type, { bubbles: true }));
  };

  return (
    <QueryClientProvider client={queryClient}>
      <nav className="!sticky !top-0 !z-[50] !bg-white !shadow-md border-b border-border">
        <div className="mx-auto max-w-[1400px] px-4 py-1 sm:px-6">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex flex-wrap items-center gap-1 rounded-lg bg-muted p-1">
              <Link to="/" className={linkClass} activeOptions={{ exact: true }} activeProps={{ className: activeLinkClass }}>
                {lang === "en" ? "Home" : "Accueil"}
              </Link>
              <Link to="/saisie" className={linkClass} activeProps={{ className: activeLinkClass }}>
                {lang === "en" ? "Inputs" : "Saisie"}
              </Link>
              {topbar.gateReady ? (
                <Link to="/resultats" className={linkClass} activeProps={{ className: activeLinkClass }}>
                  {lang === "en" ? "Results" : "Résultats"}
                </Link>
              ) : (
                <span
                  className={lockedLinkClass}
                  aria-disabled="true"
                  title={
                    lang === "en"
                      ? "Complete the minimum weighing threshold on the Inputs page."
                      : "Complétez le seuil minimal de pesée sur la page Saisie."
                  }
                >
                  {lang === "en" ? "Results" : "Résultats"}
                </span>
              )}
              <div className="relative">
                {topbar.compareUnlocked && topbar.resultsVisited && topbar.gateReady ? (
                  <Link
                    to="/comparer"
                    className={linkClass}
                    activeProps={{ className: activeLinkClass }}
                  >
                    {lang === "en" ? "Compare" : "Comparer"}
                  </Link>
                ) : (
                  <span
                    className={lockedLinkClass}
                    aria-disabled="true"
                    title={
                      lang === "en"
                        ? "The « Valid entry » indicator must be green, then visit the Results page."
                        : "Le témoin « Saisie conforme » doit être vert, puis passez par la page Résultats."
                    }
                  >
                    {lang === "en" ? "Compare" : "Comparer"}
                  </span>
                )}



                {topbar.alert?.anchor === "compare" && (
                  <div
                    className="absolute left-0 top-full !z-[99999] mt-2 w-72 !rounded-md !border !border-gray-300 !bg-white px-3 py-2 text-sm font-medium !text-gray-950 !text-opacity-100 !shadow-lg"
                    style={{ position: "absolute", zIndex: 99999, backgroundColor: "#ffffff" }}
                  >
                    {topbar.alert.message}
                  </div>
                )}
              </div>
            </div>


            <div className="mx-10 h-6 w-[2px] bg-gray-400" aria-hidden="true" />

            <DropdownMenu open={saveMenuOpen} onOpenChange={setSaveMenuOpen} modal={false}>
              <div
                className="relative flex items-center"
                onMouseEnter={cancelMenuClose}
                onMouseLeave={scheduleMenuClose}
              >
                <DropdownMenuTrigger asChild>
                  <Button

                    ref={saveBtnRef}
                    variant="outline"
                    size="sm"
                    disabled={!filesEnabled}
                    onClickCapture={(e) => {
                      let ok = false;
                      try {
                        ok = window.sessionStorage.getItem(RGPD_CONSENT_KEY) === "1";
                      } catch { /* stockage indisponible */ }
                      if (!ok) {
                        e.preventDefault();
                        e.stopPropagation();
                        requireConsent(() => setSaveMenuOpen(true));
                      }
                    }}
                    className={`border border-gray-300 bg-white text-lg font-bold ${
                      filesEnabled ? "!text-black" : "!text-gray-400"
                    }`}
                  >
                    {lang === "en" ? "Export" : "Exporter"}
                    <ChevronDown className="ml-1 h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                {topbar.alert?.anchor === "export" && (
                  <div
                    className="absolute left-0 top-full !z-[99999] mt-2 w-80 !rounded-md !border !border-gray-300 !bg-white px-3 py-2 text-sm font-medium !text-gray-950 !text-opacity-100 !shadow-lg"
                    style={{ position: "absolute", zIndex: 99999, backgroundColor: "#ffffff" }}
                  >
                    {topbar.alert.message}
                  </div>
                )}
                {topbar.isExporting && (
                  // Progression purement visuelle : fine ligne verte intense,
                  // imbriquée sous le bouton « Sauver », à 10 px exactement,
                  // alignée à droite. Aucun texte descriptif.
                  <div
                    className="absolute inset-x-0 top-full !z-[99999] mt-[10px] h-[3px] w-full overflow-hidden rounded-full bg-gray-200"
                  >
                    <div
                      className="h-full rounded-full transition-[width] duration-200 ease-linear"
                      style={{
                        width: `${Math.round(Math.max(0.04, topbar.exportProgress) * 100)}%`,
                        backgroundColor: "#16a34a",
                      }}
                    />
                  </div>
                )}
              </div>
              <DropdownMenuContent
                align="start"
                className="max-w-[520px]"
                onMouseEnter={cancelMenuClose}
                onMouseLeave={scheduleMenuClose}
              >

                {isComparer ? (
                  /* Page Comparer : une seule ligne directe (algorithme adaptatif 3/4/6 pages). */
                  <DropdownMenuItem
                    onClick={() => requireConsent(() => dispatchAction("piano-export-pdf"))}
                  >
                    {topbar.comparisonActive
                      ? lang === "en"
                        ? "Export Workshop report + Comparative analysis as PDF"
                        : "Exporter Rapport d'atelier + Analyse comparative au format PDF"
                      : lang === "en"
                        ? "Export Workshop report as PDF"
                        : "Exporter Rapport d'atelier au format PDF"}
                  </DropdownMenuItem>
                ) : (
                  <>
                    <DropdownMenuSub>
                      <DropdownMenuSubTrigger>
                        {lang === "en" ? "Export PDF" : "Exporter PDF"}
                      </DropdownMenuSubTrigger>
                      <DropdownMenuSubContent
                        sideOffset={4}
                        alignOffset={-4}
                        avoidCollisions={false}
                        className="max-w-[520px]"
                      >
                        <DropdownMenuItem
                          disabled={!filesEnabled}
                          onClick={() => requireConsent(() => dispatchAction("piano-export-pdf"))}
                        >
                          {lang === "en" ? "Workshop report (3 pages)" : "Rapport d'atelier (3 pages)"}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => dispatchAction("piano-export-blank-pdf")}>
                          {lang === "en"
                            ? "Blank form table format (re-importable)"
                            : "Formulaire vierge format tableau (re-importable)"}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => dispatchAction("piano-export-blank-keyboard-pdf")}>
                          {lang === "en"
                            ? "Blank form keyboard design format (re-importable)"
                            : "Formulaire vierge format dessin clavier (re-importable)"}
                        </DropdownMenuItem>

                      </DropdownMenuSubContent>
                    </DropdownMenuSub>
                    {/* Sauvegarde CSV : placée sous l'option globale « Exporter PDF ». */}
                    <DropdownMenuItem
                      disabled={!filesEnabled}
                      onClick={() => requireConsent(() => dispatchAction("piano-export-csv"))}
                    >
                      {lang === "en"
                        ? "Save entered data as CSV (re-importable)"
                        : "Sauver données saisies au format CSV (re-importable)"}
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>



            {!isComparer && pathname !== "/resultats" && (
            <div className="relative flex items-center">
              {/* Importer : chargement d'un fichier CSV local uniquement. */}
              <Button
                variant="outline"
                size="sm"
                onMouseEnter={() => {
                  closeMenuNow();
                  showImportHint();
                }}
                onMouseLeave={hideImportHint}
                className="border border-gray-300 bg-white text-lg font-bold !text-black"
                onClick={() => dispatchAction("piano-import-csv")}
              >
                {lang === "en" ? "Import" : "Importer"}
              </Button>


              {(importHint || topbar.alert?.anchor === "import") && (
                <div
                  className="absolute left-0 top-full !z-[99999] mt-2 w-80 !rounded-md !border !border-gray-300 !bg-white px-3 py-2 text-sm font-medium !text-gray-950 !text-opacity-100 !shadow-lg"
                  style={{ position: "absolute", zIndex: 99999, backgroundColor: "#ffffff" }}
                >
                  {topbar.alert?.anchor === "import"
                    ? topbar.alert.message
                    : lang === "en"
                      ? "Import a Keyweight CSV file from your local storage."
                      : "Importer un fichier CSV (Keyweight) depuis votre stockage local."}
                </div>
               )}
             </div>
             )}

              <div className="ml-auto flex items-center mr-[-1rem] sm:mr-[-1.5rem]">
                {/* Bouton de soutien à droite du sélecteur EN / FR,
                    taille 2× (~50 px) et descendu de 10 px. */}
                <div className="flex -translate-x-[60px] items-center">
                   <div className="flex shrink-0 -translate-x-[50px] translate-y-[19px] items-center gap-0 text-[1.14rem] font-semibold">
                     <Button
                       variant="ghost"
                       size="sm"
                       onClick={() => setLang("en")}
                       className={`px-1 text-[1.14rem] ${lang === "en" ? "!text-gray-900 underline" : "!text-gray-400"}`}
                     >
                       EN
                     </Button>
                     <span className="!text-gray-300">|</span>
                     <Button
                       type="button"
                       variant="ghost"
                       size="sm"
                       onClick={() => setLang("fr")}
                       className={`px-1 text-[1.14rem] ${lang === "fr" ? "!text-gray-900 underline" : "!text-gray-400"}`}
                     >
                       FR
                     </Button>
                   </div>
                   {(pathname === "/resultats" || pathname === "/comparer") && (
                    <div
                       className="relative ml-3 translate-y-[16px] transition-opacity duration-[2000ms] ease-in-out"
                       style={{ opacity: likedVisible ? 1 : 0, pointerEvents: likedVisible ? "auto" : "none" }}
                     onMouseEnter={() => {
                       if (supportHintTimer.current) clearTimeout(supportHintTimer.current);
                       setSupportHint(true);
                       supportHintTimer.current = setTimeout(() => setSupportHint(false), 3000);
                     }}
                     onMouseLeave={() => {
                       if (supportHintTimer.current) clearTimeout(supportHintTimer.current);
                       setSupportHint(false);
                     }}
                   >
                          {/* Hauteur historique conservée ; largeur dictée par les proportions natives du logo. */}
                         <Button
                          type="button"
                           variant="ghost"
                           size="sm"
                          onClick={() => setSupportOpen(true)}
                          aria-label={lang === "en" ? "Support the KeyWeight project" : "Soutenir le projet KeyWeight"}
                           style={{ height: "40px", width: "95px" }}
                            className="relative z-10 flex w-[95px] shrink-0 items-center justify-center overflow-visible rounded-none p-0 transition-transform hover:scale-105 hover:bg-transparent"
                        >
                           <img
                              src={lang === "en" ? likedLogoEnAsset.url : likedLogoFrAsset.url}
                            alt={lang === "en" ? "Support the KeyWeight project" : "Soutenir le projet KeyWeight"}
                              style={{
                                height: "40px",
                                width: "95px",
                                maxWidth: "none",
                              }}
                             className="block object-contain liked-breathing"
                          />
                       </Button>

                     {supportHint && (
                       <div className="pointer-events-none absolute left-1/2 top-full z-[9999] mt-[6px] -translate-x-1/2 whitespace-nowrap rounded-md border border-gray-300 bg-white px-2 py-1 text-xs font-medium !text-gray-900 shadow-md">
                         {lang === "en" ? "Support the KeyWeight project" : "Soutenir le projet KeyWeight"}
                       </div>
                     )}
                   </div>
                   )}
                </div>


                {/* Logo officiel KeyWeight : 30 px à gauche du bord droit,
                    assis sur sa ligne de base, agrandi de 15 %. */}
                <img
                  src={keyweightLogo.url}
                  alt="KeyWeight"
                  style={{ height: "85px", width: "auto" }}
                  className="relative z-10 shrink-0 -translate-x-[30px] translate-y-[26px] object-contain"
                />


              </div>



            </div>
          </div>
        </nav>

      {consentOpen &&
        typeof document !== "undefined" &&
        createPortal(
          <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/60 p-4">
            <div className="w-full max-w-lg rounded-lg border border-black bg-white p-6 shadow-xl">
              <p className="text-sm leading-relaxed text-gray-950">{RGPD_CONSENT_TEXT}</p>
              <div className="mt-4 flex justify-end">
                <button
                  type="button"
                  onClick={acceptConsent}
                  className="rounded-md border-2 border-black bg-white px-4 py-1.5 text-sm font-bold !text-black transition-colors hover:bg-gray-100"
                >
                  {lang === "en" ? "I accept" : "J'accepte"}
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}



      <Dialog open={supportOpen} onOpenChange={setSupportOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>
              {lang === "en"
                ? "Support the KeyWeight collaborative project"
                : "Soutenir le projet collaboratif KeyWeight"}
            </DialogTitle>
            <DialogDescription className="text-left text-sm leading-relaxed !text-gray-800">
              {lang === "en"
                ? "KeyWeight is an independent tool created for pianists and piano technicians. To develop this platform, several hundred euros have been personally invested. If this tool saves you time and precision on a daily basis, you can actively participate in its maintenance and future developments through a free financial support. Thank you!"
                : "KeyWeight est un outil indépendant créé pour les pianistes et facteurs de piano. Pour développer cette plateforme, plusieurs centaines d'euros ont été investis personnellement. Si cet outil vous fait gagner du temps et de la précision au quotidien, vous pouvez participer activement à sa maintenance et à ses futures évolutions via un soutien financier libre. Merci !"}
            </DialogDescription>
          </DialogHeader>
          <div className="mt-2 flex flex-wrap items-center justify-center gap-3">
            {[
              lang === "en" ? "Support: 10 $" : "Soutenir : 10 €",
              lang === "en" ? "Support: 20 $" : "Soutenir : 20 €",
              lang === "en" ? "Custom amount" : "Montant libre",
            ].map((label) => (
              <a
                key={label}
                href="#"
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium !text-gray-900 transition-colors hover:bg-gray-50"
              >
                {label}
              </a>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
      <Outlet />

      <Toaster />

      {pathname === "/" && (
        <footer className="mx-auto max-w-[1400px] px-6 py-10">
          <p className="text-[0.65rem] leading-relaxed text-muted-foreground">{LEGAL_TEXT}</p>
        </footer>
      )}
    </QueryClientProvider>
  );
}
