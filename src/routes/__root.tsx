import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { initLang, setLang, useLang } from "@/data/translations";
import { initJourneyFlags, useTopbarState } from "@/lib/topbar-store";
import {
  ChevronDown,
} from "lucide-react";
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
  useNavigate,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

import { Toaster } from "@/components/ui/sonner";

import appCss from "../styles.css?url";
import likedLogoFrAsset from "@/assets/image_soutien_v5.png.asset.json";
import likedLogoEnAsset from "@/assets/image_sustain_v5.png.asset.json";
import { ensureDemoDefault, isDemoOff, toggleDemoMode, DEMO_BANNER_V2_KEY, isDemoActive, DEMO_LOADED_EVENT } from "@/lib/demo-mode";
import { AppFooter } from "@/components/AppFooter";
import keyweightLogo from "@/assets/keyweight-logo.png.asset.json";
import { FaqDialog } from "@/components/FaqDialog";
import { LegalDialog } from "@/data/legal";
import type { FaqPage } from "@/components/FaqContent";
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

const RGPD_CONSENT_KEY = "rgpd-cgu-consent";

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const rootNavigate = useNavigate();
  const topbar = useTopbarState();
  const lang = useLang();
  const [consentOpen, setConsentOpen] = useState(false);
  /** Fenêtre juridique complète, ouvrable depuis le message de consentement. */
  const [legalOpen, setLegalOpen] = useState(false);
  const [faqOpen, setFaqOpen] = useState(false);
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
  // La jauge verte est imbriquée sous le bouton « Exporter » (10 px, à droite) :
  // aucun calcul de position n'est nécessaire.
  const pendingActionRef = useRef<(() => void) | null>(null);
  const [demoVisible, setDemoVisible] = useState(false);
  const [demoTipOpen, setDemoTipOpen] = useState(false);
  /** Verrou à vie du bandeau mauve : true tant que l'état réel n'est pas lu
      (évite tout clignotement au rendu serveur). */
  const [bannerDismissed, setBannerDismissed] = useState(true);
  const bannerRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    initLang();
    initJourneyFlags();
    ensureDemoDefault();
    setDemoVisible(!isDemoOff());
    let locked = false;
    try {
      locked = window.localStorage.getItem(DEMO_BANNER_V2_KEY) === "true";
    } catch {
      /* stockage indisponible */
    }
    setBannerDismissed(locked);
  }, []);

  const closeDemoBanner = useCallback(() => {
    try {
      window.localStorage.setItem(DEMO_BANNER_V2_KEY, "true");
    } catch {
      /* stockage indisponible */
    }
    setBannerDismissed(true);
  }, []);

  // Force brute : le bandeau s'affiche dès lors qu'il n'est pas verrouillé,
  // que le Mode Démo est OFF et que l'on se trouve sur la page Saisie.
  const shouldShowBanner =
    !bannerDismissed && !demoVisible && pathname === "/saisie" && !topbar.weighingMode;

  // Fermeture définitive : croix du bandeau, survol du bouton MODE DÉMO,
  // clic extérieur (après 2 s d'affichage stable) ou passage du Mode Démo sur ON.
  useEffect(() => {
    if (!shouldShowBanner) return;
    const onDemoLoaded = () => {
      if (isDemoActive()) closeDemoBanner();
    };
    const armedAt = Date.now() + 2000;
    const handlePointerDown = (event: PointerEvent) => {
      if (Date.now() < armedAt || !event.isTrusted) return;
      const target = event.target as Node | null;
      if (bannerRef.current && target && bannerRef.current.contains(target)) return;
      closeDemoBanner();
    };
    window.addEventListener(DEMO_LOADED_EVENT, onDemoLoaded);
    document.addEventListener("pointerdown", handlePointerDown);
    return () => {
      window.removeEventListener(DEMO_LOADED_EVENT, onDemoLoaded);
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [shouldShowBanner, closeDemoBanner]);

  // Réinitialisation totale émise par la page Saisie : le bouton repasse en OFF.
  useEffect(() => {
    const onDemoOff = () => setDemoVisible(false);
    window.addEventListener("ptw-demo-off", onDemoOff);
    return () => window.removeEventListener("ptw-demo-off", onDemoOff);
  }, []);


  const isComparer = pathname === "/comparer";
  /** Accueil épuré : seuls le logo, la FAQ et EN | FR restent visibles. */
  const isHome = pathname === "/";

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
  /** Annulation du consentement RGPD : ferme la fenêtre sans exécuter
      l'action différée (croix X ou clic sur le fond). */
  const cancelConsent = () => {
    setConsentOpen(false);
    pendingActionRef.current = null;
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
      {/* Filigrane : logo officiel KeyWeight en fond, sur toutes les pages. */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 -z-10 bg-center bg-no-repeat"
        style={{
          backgroundImage: `url(${keyweightLogo.url})`,
          backgroundSize: "min(70vw, 70vh) auto",
          opacity: 0.07,
        }}
      />
      <nav className="!sticky !top-0 !z-[50] !bg-white !shadow-md border-b border-border">
        <div className="mx-auto w-full max-w-7xl pb-1 pt-[2px] px-[100px]">
          <div className="flex flex-wrap items-center gap-2">
            {/* Logo officiel KeyWeight : calé à gauche, retour à l'accueil. */}
            <div className="relative z-10 flex shrink-0 flex-col items-center translate-y-[26px]">
              <Link to="/" aria-label={lang === "en" ? "Home" : "Accueil"} className="block">
                <img
                  src={keyweightLogo.url}
                  alt="KeyWeight"
                  style={{ height: "85px", width: "auto" }}
                  className="object-contain"
                />
              </Link>
            </div>
            {!isHome && (
            <div className="flex translate-x-[50px] translate-y-[9px] flex-wrap items-center gap-1 rounded-lg bg-muted p-1">
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
                {topbar.resultsVisited ? (
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
                        ? "Visit the Results page first to unlock the Compare page."
                        : "Consultez d'abord la page Résultats pour débloquer la Comparaison."
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
            )}

            {!isHome && <div className="mx-10 h-6 w-[2px] bg-gray-400" aria-hidden="true" />}

            {!isHome && (
            <div
              className="relative flex translate-y-[15px] items-center"
              onMouseEnter={() => {
                if (filesEnabled) {
                  setSaveMenuOpen(true);
                  cancelMenuClose();
                }
              }}
              onMouseLeave={scheduleMenuClose}
            >
              <button
                ref={saveBtnRef}
                type="button"
                disabled={!filesEnabled}
                className={`inline-flex items-center gap-1 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-lg font-bold transition-colors ${
                  filesEnabled ? "!text-black hover:bg-gray-50" : "!text-gray-400 cursor-not-allowed"
                }`}
              >
                <span className="pointer-events-none">{lang === "en" ? "Export" : "Exporter"}</span>
                <ChevronDown className="pointer-events-none ml-1 h-4 w-4" />
              </button>

              {topbar.alert?.anchor === "export" && (
                <div
                  className="absolute left-0 top-full !z-[99999] mt-2 w-80 !rounded-md !border !border-gray-300 !bg-white px-3 py-2 text-sm font-medium !text-gray-950 !text-opacity-100 !shadow-lg"
                  style={{ position: "absolute", zIndex: 99999, backgroundColor: "#ffffff" }}
                >
                  {topbar.alert.message}
                </div>
              )}
              {topbar.isExporting && (
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

              {saveMenuOpen && filesEnabled && (
                <div
                  className="absolute right-0 top-full -mt-[2px] z-[99999] min-w-[300px] max-w-[520px] rounded-md border border-gray-200 bg-white py-1 shadow-lg before:absolute before:-inset-x-4 before:-top-3 before:bottom-0 before:-z-10 before:content-['']"
                  onMouseEnter={cancelMenuClose}
                  onMouseLeave={scheduleMenuClose}
                >
                  {isComparer ? (
                    <button
                      type="button"
                      className="block w-full px-3 py-2 text-left text-sm text-gray-900 hover:bg-gray-100"
                      onClick={() => {
                        closeMenuNow();
                        requireConsent(() => dispatchAction("piano-export-pdf"));
                      }}
                    >
                      <span className="pointer-events-none">
                        {topbar.comparisonActive
                          ? lang === "en"
                            ? "Export Workshop report + Comparative analysis as PDF"
                            : "Exporter Rapport d'atelier + Analyse comparative au format PDF"
                          : lang === "en"
                            ? "Export Workshop report as PDF"
                            : "Exporter Rapport d'atelier au format PDF"}
                      </span>
                    </button>
                  ) : (
                    <>
                      {/* Sous-menu « Exporter PDF » : enfant direct, zéro zone morte. */}
                      <div
                        className="relative"
                        onMouseEnter={() => setPdfSubOpen(true)}
                        onMouseLeave={() => setPdfSubOpen(false)}
                      >
                        <button
                          type="button"
                          className="flex w-full items-center justify-between px-3 py-2 text-left text-sm text-gray-900 hover:bg-gray-100"
                        >
                          <span className="pointer-events-none">{lang === "en" ? "Export PDF" : "Exporter PDF"}</span>
                          <ChevronDown className="pointer-events-none h-3 w-3 -rotate-90" />
                        </button>
                        {pdfSubOpen && (
                          <div className="absolute right-full top-0 -mr-[2px] z-[100000] min-w-[280px] max-w-[440px] rounded-md border border-gray-200 bg-white py-1 shadow-lg before:absolute before:-inset-y-3 before:-inset-x-4 before:-z-10 before:content-['']">
                            <button
                              type="button"
                              disabled={!filesEnabled}
                              className="block w-full px-3 py-2 text-left text-sm text-gray-900 hover:bg-gray-100 disabled:cursor-not-allowed disabled:text-gray-300"
                              onClick={() => {
                                setPdfSubOpen(false);
                                closeMenuNow();
                                requireConsent(() => dispatchAction("piano-export-pdf"));
                              }}
                            >
                              <span className="pointer-events-none">{lang === "en" ? "Workshop report (3 pages)" : "Rapport d'atelier (3 pages)"}</span>
                            </button>
                            <button
                              type="button"
                              className="block w-full px-3 py-2 text-left text-sm text-gray-900 hover:bg-gray-100"
                              onClick={() => {
                                setPdfSubOpen(false);
                                closeMenuNow();
                                requireConsent(() => dispatchAction("piano-export-blank-pdf"));
                              }}
                            >
                              <span className="pointer-events-none">
                                {lang === "en"
                                  ? "Blank form table format (re-importable)"
                                  : "Formulaire vierge format tableau (re-importable)"}
                              </span>
                            </button>
                            <button
                              type="button"
                              className="block w-full px-3 py-2 text-left text-sm text-gray-900 hover:bg-gray-100"
                              onClick={() => {
                                setPdfSubOpen(false);
                                closeMenuNow();
                                requireConsent(() => dispatchAction("piano-export-blank-keyboard-pdf"));
                              }}
                            >
                              <span className="pointer-events-none">
                                {lang === "en"
                                  ? "Blank form keyboard design format (re-importable)"
                                  : "Formulaire vierge format dessin clavier (re-importable)"}
                              </span>
                            </button>
                          </div>
                        )}
                      </div>
                      {/* Sauvegarde CSV : placée sous l'option globale « Exporter PDF ». */}
                      <button
                        type="button"
                        disabled={!filesEnabled}
                        className="block w-full px-3 py-2 text-left text-sm text-gray-900 hover:bg-gray-100 disabled:cursor-not-allowed disabled:text-gray-300"
                        onClick={() => {
                          closeMenuNow();
                          requireConsent(() => dispatchAction("piano-export-csv"));
                        }}
                      >
                        {lang === "en" ? (
                          <span className="pointer-events-none block leading-snug">
                            Save entered data
                            <br />
                            as CSV (re-importable)
                          </span>
                        ) : (
                          <span className="pointer-events-none block leading-snug">
                            Sauver données saisies au format
                            <br />
                            CSV (re-importable)
                          </span>
                        )}
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
            )}

            {!isHome && !isComparer && pathname !== "/resultats" && (
            <div className="relative flex translate-y-[15px] items-center">
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

              <div className="ml-auto flex items-center">
                {/* Bouton de soutien à droite du sélecteur EN / FR,
                    taille 2× (~50 px) et descendu de 10 px. */}
                <div className="flex items-center">
                   <button
                     type="button"
                     onClick={() => setFaqOpen(true)}
                     className="mr-2 shrink-0 translate-y-[19px] rounded-md border border-gray-400 bg-white px-2 py-0.5 text-[1rem] font-bold !text-gray-900 transition-colors hover:bg-gray-100"
                   >
                     FAQ
                   </button>
                   <div className="flex shrink-0 translate-y-[19px] items-center gap-0 text-[1.14rem] font-semibold">
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
                       className="relative order-first mr-4 translate-y-[16px] transition-opacity duration-[2000ms] ease-in-out"
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
                            style={{ height: "40px" }}
                             className="relative z-10 flex w-auto shrink-0 items-center justify-center overflow-visible rounded-none p-0 transition-transform hover:scale-105 hover:bg-transparent"
                         >
                            <img
                               src={lang === "en" ? likedLogoEnAsset.url : likedLogoFrAsset.url}
                             alt={lang === "en" ? "Support the KeyWeight project" : "Soutenir le projet KeyWeight"}
                               style={{
                                 height: "40px",
                                 width: "auto",
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
              </div>



            </div>
          </div>
        </nav>

      {/* Bouton « Mode démo » : interrupteur bistable permanent, présent sur
          toutes les pages (hors accueil). Mauve pâle = ON, gris clair = OFF. */}
      {!isHome && (
        <div className="relative !z-[60] mx-auto w-full max-w-7xl overflow-visible px-[100px] pb-2 pt-3">
          <div className="relative !z-[60] flex items-center justify-end gap-2">
            {/* Infobulle au survol du libellé : gris graphite, sans flèche ni croix. */}
            <div className="relative">
              <button
                type="button"
                onMouseEnter={() => {
                  if (shouldShowBanner) closeDemoBanner();
                  setDemoTipOpen(true);
                }}
                onMouseLeave={() => setDemoTipOpen(false)}
                onClick={() => {
                  const active = toggleDemoMode();
                  setDemoVisible(active);
                  setDemoTipOpen(false);
                  void rootNavigate({ to: "/saisie" });
                }}
                aria-pressed={demoVisible}
                className={
                  demoVisible
                    ? "demo-border-pulse whitespace-nowrap rounded-md border-2 border-[#c4b5fd] bg-[#ede9fe] px-4 py-2 text-xs font-bold uppercase tracking-wide !text-[#4c1d95] transition-colors hover:bg-[#ddd6fe]"
                    : "whitespace-nowrap rounded-md border-2 border-gray-300 bg-gray-100 px-4 py-2 text-xs font-bold uppercase tracking-wide !text-black transition-colors hover:bg-gray-200"
                }
              >
                {lang === "en" ? "Demo mode" : "Mode démo"}
              </button>
              {demoTipOpen && (
                <div
                  role="tooltip"
                  className="absolute right-0 top-[calc(100%+8px)] z-50 w-[340px] rounded-md border border-gray-300 bg-white px-3 py-2 text-left text-[13.5px] font-medium leading-snug !text-gray-900 shadow-xl"
                >
                  {demoVisible
                    ? lang === "en"
                      ? "⚠️ Disabling Demo Mode will erase all current data and return to the Piano Info page"
                      : "⚠️ Désactiver le Mode Démo va effacer toutes les données actuelles et revenir page Info piano"
                    : lang === "en"
                      ? "Demo Mode pre-fills the app with a data set that lets you test the different modules. The CLOUD database used is also fictitious."
                      : "Mode Démo pré-remplit l'application avec un jeu de données permettant de tester les différents modules. La base de données CLOUD utilisée est également fictive."}
                </div>
              )}
            </div>
            {/* Bandeau mauve d'invitation — juste en-dessous du bouton MODE DÉMO,
                aligné à droite, largeur = 2× la largeur du bouton. */}
            {shouldShowBanner && (
              <div
                ref={bannerRef}
                data-demo-banner
                className="absolute right-0 top-full z-[70] mt-2 flex w-[320px] flex-col rounded-lg border border-purple-200 bg-purple-50 p-3 text-sm text-purple-900 shadow-md"
              >
                <div className="flex items-start gap-2">
                  <p className="flex-1 font-medium leading-snug">
                    {lang === "en"
                      ? "💡 No piano on hand? Activate Demo Mode in 1 click to test the app with a mock profile."
                      : "💡 Pas encore de piano sous la main ? Activez le Mode Démo en 1 clic pour tester l'application avec un profil fictif."}
                  </p>
                  <button
                    type="button"
                    aria-label={lang === "en" ? "Close" : "Fermer"}
                    onClick={(e) => {
                      e.stopPropagation();
                      closeDemoBanner();
                    }}
                    className="shrink-0 rounded px-1.5 text-sm leading-none text-purple-900 hover:bg-purple-100"
                  >
                    ×
                  </button>
                </div>
                <div className="mt-2 border-t border-purple-200 pt-2">
                  <label className="flex cursor-pointer items-center gap-2 text-xs text-purple-900">
                    <input
                      type="checkbox"
                      className="h-3.5 w-3.5 accent-purple-700"
                      onChange={(e) => {
                        if (e.target.checked) closeDemoBanner();
                      }}
                    />
                    {lang === "en" ? "Don't show again" : "Ne plus afficher"}
                  </label>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <FaqDialog
        open={faqOpen}
        onClose={() => setFaqOpen(false)}
        page={
          (pathname === "/saisie"
            ? "saisie"
            : pathname === "/resultats"
              ? "resultats"
              : pathname === "/comparer"
                ? "comparer"
                : "home") as FaqPage
        }
        en={lang === "en"}
      />

      {consentOpen &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            className="fixed inset-0 z-[99999] flex items-center justify-center p-4"
            style={{ background: "rgba(0,0,0,0.15)" }}
            onClick={cancelConsent}
          >
            <div
              className="relative w-full max-w-lg rounded-lg border border-black bg-white p-6 text-center shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                aria-label={lang === "en" ? "Close" : "Fermer"}
                onClick={cancelConsent}
                className="absolute right-2 top-2 rounded px-1.5 text-lg leading-none !text-gray-500 transition-colors hover:bg-gray-100 hover:!text-gray-900"
              >
                ×
              </button>
              <p className="text-base font-medium leading-relaxed !text-gray-900">
                {lang === "en"
                  ? "Your piano profile will complete the KeyWeight CLOUD database. Thank you for your collaboration!"
                  : "Votre profil de piano va compléter la base de données CLOUD KeyWeight. Merci de votre collaboration !"}
              </p>
              <div className="mt-5 flex justify-center">
                <button
                  type="button"
                  onClick={acceptConsent}
                  className="rounded-md border-2 border-black bg-white px-6 py-2 text-sm font-bold !text-black transition-colors hover:bg-gray-100"
                >
                  {lang === "en" ? "OK" : "D'accord"}
                </button>
              </div>
              <button
                type="button"
                onClick={() => setLegalOpen(true)}
                className="mt-3 text-[11px] !text-gray-500 underline transition-colors hover:!text-gray-800"
              >
                {lang === "en"
                  ? "(View Legal Notice & GDPR)"
                  : "(Consulter les Mentions Légales & RGPD)"}
              </button>
            </div>
          </div>,
          document.body,
        )}

      <LegalDialog open={legalOpen} onClose={() => setLegalOpen(false)} en={lang === "en"} zIndex={100001} />



      <Dialog open={supportOpen} onOpenChange={setSupportOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>
              {lang === "en"
                ? "Support the KeyWeight collaborative project"
                : "Soutenir le projet collaboratif KeyWeight"}
            </DialogTitle>
            <DialogDescription className="text-left text-sm leading-relaxed !text-gray-800">
              <span className="block">
                KeyWeight est un outil indépendant partagé, créé par un passionné de pianos. Si cette
                application collaborative vous a été utile, soutenez son développement et sa
                maintenance !
              </span>
              <span className="mt-2 block italic">
                KeyWeight is an independent shared tool, built by a piano enthusiast. If this
                collaborative application has been useful to you, support its development and
                maintenance!
              </span>
            </DialogDescription>
          </DialogHeader>
          <div className="mt-2 flex flex-wrap items-center justify-center gap-3">
            {[
              { label: lang === "en" ? "Support: 10 €" : "Soutenir : 10 €", href: "https://buy.stripe.com/4gMaEP2RB9xMg6NdJHfEk04" },
              { label: lang === "en" ? "Support: 20 €" : "Soutenir : 20 €", href: "https://buy.stripe.com/28EeV5ak325k7Ah5dbfEk03" },
              { label: lang === "en" ? "Custom amount" : "Montant libre", href: "https://buy.stripe.com/cNi7sDbo78tIg6N7ljfEk01" },
            ].map(({ label, href }) => (
              <a
                key={label}
                href={href}
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

      <AppFooter en={lang === "en"} />

      <Toaster />

    </QueryClientProvider>
  );
}
