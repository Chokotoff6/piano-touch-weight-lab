import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { EMPTY_DATA_MESSAGE, saisieGate } from "@/lib/required-keys";
import { initLang, setLang, useLang } from "@/data/translations";
import { setTopbarState, showTopbarAlert, useTopbarState } from "@/lib/topbar-store";
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
import { useEffect, type ReactNode } from "react";

import { Toaster } from "@/components/ui/sonner";

import appCss from "../styles.css?url";
import premiumCoffeeAsset from "@/assets/premium-coffee.png.asset.json";
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

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const topbar = useTopbarState();
  const lang = useLang();
  useEffect(() => {
    initLang();
  }, []);
  const isSaisie = pathname === "/saisie";
  const isComparer = pathname === "/comparer";

  const linkClass = "rounded-md px-3 py-2 text-base font-semibold text-muted-foreground transition-colors hover:bg-background hover:text-foreground sm:px-4 sm:text-lg";
  const activeLinkClass = "rounded-md bg-background px-3 py-2 text-base font-semibold text-foreground shadow-sm sm:px-4 sm:text-lg";

  const dispatchAction = (type: string) => {
    window.dispatchEvent(new CustomEvent(type, { bubbles: true }));
  };

  /** Le bouton Sauver reste visuellement actif : blanc au repos, sombre dès qu'il y a des modifications. */
  const saveDisabled = !isSaisie || topbar.isExporting;

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
              <div className="relative">
                <Link
                  to="/comparer"
                  className={linkClass}
                  activeProps={{ className: activeLinkClass }}
                  onClick={(e) => {
                    const hasData = saisieGate.hasData?.() ?? true;
                    if (!hasData) {
                      e.preventDefault();
                      showTopbarAlert("compare", EMPTY_DATA_MESSAGE);
                      return;
                    }
                    if (isSaisie && topbar.isDirty) {
                      e.preventDefault();
                      dispatchAction("piano-compare-guard");
                    }
                  }}
                >
                  Comparer
                </Link>
                {topbar.alert?.anchor === "compare" && (
                  <div
                    className="absolute left-0 top-full !z-[99999] mt-2 w-72 !rounded-md !border !border-yellow-300 !bg-[rgba(254,240,138,0.7)] px-3 py-2 text-sm font-medium !text-gray-950 !text-opacity-100 !shadow-lg"
                    style={{ position: "absolute", zIndex: 99999, backgroundColor: "rgba(254, 240, 138, 0.7)" }}
                  >
                    {topbar.alert.message}
                  </div>
                )}
              </div>
            </div>

            <div className="mx-10 h-6 w-[2px] bg-gray-400" aria-hidden="true" />

            <div className="relative">
              <DropdownMenu>
                <div className="flex items-center">
                  <Button
                    size="sm"
                    variant="outline"
                    className={`${topbar.hasSaved ? "rounded-r-none" : ""} border border-gray-300 bg-white text-lg ${topbar.measuresReady ? "!text-muted-foreground" : "text-gray-400"} hover:bg-accent`}
                    onClick={() => {
                      if (saveDisabled) return;
                      dispatchAction("piano-save");
                    }}
                  >
                    Sauver
                  </Button>
                  {topbar.hasSaved && (
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className={`rounded-l-none border border-l-0 border-gray-300 bg-white px-2 ${topbar.measuresReady ? "!text-muted-foreground" : "text-gray-400"} hover:bg-accent`}
                      >
                        <ChevronDown className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                  )}
                </div>
                <DropdownMenuContent align="start">
                  <DropdownMenuItem onClick={() => dispatchAction("piano-save-cloud")}>
                    Enregistrer les modifications (Mettre à jour la fiche en cours)
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => dispatchAction("piano-save-quick")}>
                    Créer une nouvelle fiche (Faire une autre pesée à une date différente)
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              {topbar.alert?.anchor === "save" && (
                <div
                  className="absolute left-0 top-full !z-[99999] mt-2 w-80 !rounded-md !border !border-yellow-300 !bg-[rgba(254,240,138,0.7)] px-3 py-2 text-sm font-medium !text-gray-950 !text-opacity-100 !shadow-lg"
                  style={{ position: "absolute", zIndex: 99999, backgroundColor: "rgba(254, 240, 138, 0.7)" }}
                >
                  {topbar.alert.message}
                </div>
              )}
            </div>

            {topbar.measuresReady ? (
              <DropdownMenu>
                <div className="relative flex items-center">
                  <Button
                    variant="outline"
                    size="sm"
                    className={`rounded-r-none border border-gray-300 bg-white text-lg ${topbar.measuresReady ? "!text-muted-foreground" : "text-gray-400"}`}
                    onClick={() => dispatchAction("piano-export-csv")}
                  >
                    Exporter
                  </Button>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className={`rounded-l-none border border-l-0 border-gray-300 bg-white px-2 text-lg ${topbar.measuresReady ? "!text-muted-foreground" : "text-gray-400"}`}
                    >
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  {topbar.alert?.anchor === "export" && (
                    <div
                      className="absolute left-0 top-full !z-[99999] mt-2 w-80 !rounded-md !border !border-yellow-300 !bg-[rgba(254,240,138,0.7)] px-3 py-2 text-sm font-medium !text-gray-950 !text-opacity-100 !shadow-lg"
                      style={{ position: "absolute", zIndex: 99999, backgroundColor: "rgba(254, 240, 138, 0.7)" }}
                    >
                      {topbar.alert.message}
                    </div>
                  )}
                </div>
                <DropdownMenuContent align="start">
                  <DropdownMenuItem onClick={() => dispatchAction("piano-export-csv")}>
                    Télécharger le fichier CSV local
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => dispatchAction("piano-export-pdf")}>
                    Générer rapport PDF
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <div className="relative flex items-center">
                <Button
                  variant="outline"
                  size="sm"
                  className={`border border-gray-300 bg-white text-lg ${topbar.measuresReady ? "!text-muted-foreground" : "text-gray-400"}`}
                  onClick={() => dispatchAction("piano-export-csv")}
                >
                  Exporter
                </Button>
                {topbar.alert?.anchor === "export" && (
                  <div
                    className="absolute left-0 top-full !z-[99999] mt-2 w-80 !rounded-md !border !border-yellow-300 !bg-[rgba(254,240,138,0.7)] px-3 py-2 text-sm font-medium !text-gray-950 !text-opacity-100 !shadow-lg"
                    style={{ position: "absolute", zIndex: 99999, backgroundColor: "rgba(254, 240, 138, 0.7)" }}
                  >
                    {topbar.alert.message}
                  </div>
                )}
              </div>
            )}

            {!isComparer && (
            <div className="relative flex items-center">
              {topbar.serialFilled ? (
                <DropdownMenu>
                  <div className="flex items-center">
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-r-none bg-white text-lg text-muted-foreground"
                      onClick={() => dispatchAction("piano-import-csv")}
                    >
                      Importer
                    </Button>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="rounded-l-none border-l-0 bg-white px-2 text-muted-foreground"
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
                  className="bg-white text-lg text-muted-foreground"
                  onClick={() => dispatchAction("piano-import-csv")}
                >
                  Importer
                </Button>
              )}
              {topbar.alert?.anchor === "import" && (
                <div
                  className="absolute left-0 top-full !z-[99999] mt-2 w-80 !rounded-md !border !border-yellow-300 !bg-[rgba(254,240,138,0.7)] px-3 py-2 text-sm font-medium !text-gray-950 !text-opacity-100 !shadow-lg"
                  style={{ position: "absolute", zIndex: 99999, backgroundColor: "rgba(254, 240, 138, 0.7)" }}
                >
                  {topbar.alert.message}
                </div>
               )}
             </div>
             )}
               <Button
                 type="button"
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

           </div>
      </nav>


      <a
        href="https://buymeacoffee.com"
        target="_blank"
        rel="noopener noreferrer"
        title="Soutenir le projet — Offrir un café pour aider au maintien en ligne du site développé bénévolement"
        aria-label="Soutenir le projet — Offrir un café pour aider au maintien en ligne du site développé bénévolement"
        className="fixed right-6 top-4 z-50 flex max-h-none -translate-x-full items-center justify-center rounded-lg bg-transparent transition-transform hover:scale-105"
        style={{ marginLeft: "65px" }}
      >
        <img
          src={premiumCoffeeAsset.url}
          alt="Buy me a coffee"
          className="!h-[68px] !w-auto rounded-lg object-cover !shadow-xl"
        />
      </a>

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
