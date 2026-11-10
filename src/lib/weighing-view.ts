import { useEffect, useState } from "react";

/** Defaults follow the screen; an explicit choice lasts until the breakpoint changes. */
export function useWeighingView() {
  const [compact, setCompact] = useState(false);
  const [override, setOverride] = useState<boolean | null>(null);
  useEffect(() => {
    const media = window.matchMedia("(max-width: 1199px)");
    setCompact(media.matches);
    const update = () => { setCompact(media.matches); setOverride(null); };
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  return { octaveView: override ?? compact, chooseOctave: setOverride };
}