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
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
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
import premiumCoffeeAsset from "@/assets/premium-coffee.png.asset.json";
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
      { title: "Touchweight statique piano" },
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
  const [saveMenuOpen, setSaveMenuOpen] = useState(false);
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

  const dispatchAction = (type: string) => {
    window.dispatchEvent(new CustomEvent(type, { bubbles: true }));
  };

  return (
    <QueryClientProvider client={queryClient}>
      <nav className="!sticky !top-0 !z-[50] !bg-white !shadow-md border-b border-border">
        <div className="mx-auto max-w-[1400px] px-4 py-3 sm:px-6">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex flex-wrap items-center gap-1 rounded-lg bg-muted p-1">
              <Link to="/" className={linkClass} activeOptions={{ exact: true }} activeProps={{ className: activeLinkClass }}>
                Accueil
              </Link>
              <Link to="/saisie" className={linkClass} activeProps={{ className: activeLinkClass }}>
                Saisie
              </Link>
              {topbar.gateReady ? (
                <Link to="/resultats" className={linkClass} activeProps={{ className: activeLinkClass }}>
                  Résultats
                </Link>
              ) : (
                <span
                  className={lockedLinkClass}
                  aria-disabled="true"
                  title="Complétez le seuil minimal de pesée sur la page Saisie."
                >
                  Résultats
                </span>
              )}
              <div className="relative">
                {topbar.compareUnlocked && topbar.resultsVisited && topbar.gateReady ? (
                  <Link
                    to="/comparer"
                    className={linkClass}
                    activeProps={{ className: activeLinkClass }}
                  >
                    Comparer
                  </Link>
                ) : (
                  <span
                    className={lockedLinkClass}
                    aria-disabled="true"
                    title="Le témoin « Saisie conforme » doit être vert, puis passez par la page Résultats."
                  >
                    Comparer
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

            <DropdownMenu open={saveMenuOpen} onOpenChange={setSaveMenuOpen}>
              <div className="relative flex items-center">
                <DropdownMenuTrigger asChild>
                  <Button
                    ref={saveBtnRef}
                    variant="outline"
                    size="sm"
                    disabled={!isComparer && !topbar.measuresReady}
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
                      topbar.measuresReady || isComparer ? "!text-black" : "!text-gray-400"
                    }`}
                  >
                    {lang === "en" ? "Save" : "Sauver"}
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
                    className="absolute right-0 top-full !z-[99999] mt-[10px] h-[3px] w-[220px] overflow-hidden rounded-full bg-gray-200"
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
              <DropdownMenuContent align="start" className="max-w-[420px]">
                <DropdownMenuItem
                  disabled={!topbar.measuresReady}
                  onClick={() => requireConsent(() => dispatchAction("piano-export-csv"))}
                >
                  {lang === "en"
                    ? "Save entered data as CSV (re-importable)"
                    : "Sauver les données saisies au format CSV (ré-importable)"}
                </DropdownMenuItem>
                <DropdownMenuItem
                  disabled={!isComparer && !topbar.measuresReady}
                  onClick={() => requireConsent(() => dispatchAction("piano-export-pdf"))}
                >
                  {lang === "en"
                    ? "Export entered data as PDF (re-importable)"
                    : "Exporter les données saisies au format PDF (ré-importable)"}
                </DropdownMenuItem>
                {!isComparer && (
                  <DropdownMenuItem onClick={() => dispatchAction("piano-export-blank-pdf")}>
                    {lang === "en"
                      ? "Generate a blank form - Table format"
                      : "Générer un formulaire vierge au format Tableau"}
                  </DropdownMenuItem>
                )}
                {!isComparer && (
                  <DropdownMenuItem onClick={() => dispatchAction("piano-export-blank-keyboard-pdf")}>
                    {lang === "en"
                      ? "Generate a blank form - Keyboard drawing format"
                      : "Générer un formulaire vierge au format Dessin Clavier"}
                  </DropdownMenuItem>
                )}

              </DropdownMenuContent>
            </DropdownMenu>



            {!isComparer && (
            <div className="relative flex items-center">
              {topbar.serialFilled ? (
                <DropdownMenu>
                  <div className="flex items-center">
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-r-none bg-white text-lg !text-black"
                      onClick={() => dispatchAction("piano-import-csv")}
                    >
                      Importer
                    </Button>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="rounded-l-none border-l-0 bg-white px-2 !text-black"
                      >
                        <ChevronDown className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                  </div>
                  <DropdownMenuContent align="start">
                    <DropdownMenuItem onClick={() => dispatchAction("piano-import-csv")}>
                      Charger un fichier CSV local
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onSelect={(event) => event.preventDefault()}
                      onClick={() => dispatchAction("piano-import-history")}
                    >
                      Restaurer depuis l&apos;historique en ligne
                    </DropdownMenuItem>
                    {topbar.historyRows.length > 0 && (
                      <>
                        <div className="mx-1 my-1 border-t border-border" />
                        {topbar.historyRows.map((row) => (
                          <DropdownMenuItem
                            key={row.id}
                            onClick={() =>
                              window.dispatchEvent(
                                new CustomEvent("piano-import-history-row", { detail: row.id }),
                              )
                            }
                          >
                            {row.label}
                          </DropdownMenuItem>
                        ))}
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  className="bg-white text-lg !text-black"
                  onClick={() => dispatchAction("piano-import-csv")}
                >
                  Importer
                </Button>
              )}
              {topbar.alert?.anchor === "import" && (
                <div
                  className="absolute left-0 top-full !z-[99999] mt-2 w-80 !rounded-md !border !border-gray-300 !bg-white px-3 py-2 text-sm font-medium !text-gray-950 !text-opacity-100 !shadow-lg"
                  style={{ position: "absolute", zIndex: 99999, backgroundColor: "#ffffff" }}
                >
                  {topbar.alert.message}
                </div>
               )}
             </div>
             )}

             <div className="ml-auto flex items-center gap-3">
               {/* Café à gauche des langues, puis logo tout à droite. */}
               <a
                 href="https://buymeacoffee.com"
                 target="_blank"
                 rel="noopener noreferrer"
                 title="Soutenir le projet — Offrir un café pour aider au maintien en ligne du site développé bénévolement"
                 aria-label="Soutenir le projet — Offrir un café pour aider au maintien en ligne du site développé bénévolement"
                 className="flex shrink-0 items-center justify-center rounded-lg bg-transparent transition-transform hover:scale-105"
               >
                 <img
                   src={premiumCoffeeAsset.url}
                   alt="Buy me a coffee"
                   className="!h-[44px] !w-auto rounded-lg object-contain"
                 />
               </a>
               <div className="flex shrink-0 items-center gap-1 text-sm font-semibold">
                 <Button
                   variant="ghost"
                   size="sm"
                   onClick={() => setLang("en")}
                   className={lang === "en" ? "!text-gray-900 underline" : "!text-gray-400"}
                 >
                   EN
                 </Button>
                 <span className="!text-gray-300">|</span>
                 <Button
                   type="button"
                   variant="ghost"
                   size="sm"
                   onClick={() => setLang("fr")}
                   className={lang === "fr" ? "!text-gray-900 underline" : "!text-gray-400"}
                 >
                   FR
                 </Button>
               </div>

               {/* Logo officiel KeyWeight, pleine hauteur du bandeau. */}
               <img
                 src={keyweightLogo.url}
                 alt="KeyWeight"
                 style={{ height: "calc(100% - 12px)", maxHeight: "55px", width: "auto" }}
                 className="shrink-0 self-stretch object-contain"
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
