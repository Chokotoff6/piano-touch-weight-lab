import { useEffect, useMemo, useRef, useState } from "react";
import { fuzzyFilter, resolveEntry, normalizeEntry } from "@/lib/piano-constants";

type Group = { label: string; options: string[] };

type Props = {
  value: string;
  options: string[];
  groups?: Group[];
  disabled?: boolean;
  placeholder?: string;
  openOnFocus?: boolean;
  className?: string;
  onCommit: (value: string) => void;
};

export function SmartCombobox({
  value,
  options,
  groups,
  disabled,
  placeholder,
  openOnFocus,
  className,
  onCommit,
}: Props) {
  const [draft, setDraft] = useState(value);
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState(false);
  const wrap = useRef<HTMLDivElement | null>(null);

  useEffect(() => setDraft(value), [value]);

  const filtered = useMemo(() => {
    const list: Group[] = groups?.length ? groups : [{ label: "", options }];
    return list
      .map((g) => ({ label: g.label, options: fuzzyFilter(g.options, draft).slice(0, 8) }))
      .filter((g) => g.options.length > 0);
  }, [groups, options, draft]);

  const commit = (raw: string) => {
    const next = resolveEntry(raw, options);
    setDraft(next);
    setOpen(false);
    setTyped(false);
    if (next !== value) onCommit(next);
  };

  const pick = (option: string) => {
    setDraft(option);
    setOpen(false);
    setTyped(false);
    if (option !== value) onCommit(option);
  };

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (wrap.current && !wrap.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  return (
    <div ref={wrap} className="relative">
      <input
        value={draft}
        disabled={disabled}
        placeholder={placeholder}
        onFocus={() => {
          if (!disabled && openOnFocus) {
            setOpen(true);
            setTyped(false);
          }
        }}
        onChange={(e) => {
          setDraft(e.target.value);
          setTyped(e.target.value.length > 0);
          setOpen(true);
        }}
        onBlur={() => commit(draft)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            commit(draft);
          } else if (e.key === "Tab") {
            commit(draft);
          } else if (e.key === "Escape") {
            setOpen(false);
            setTyped(false);
          }
        }}
        className={`mt-1 h-8 w-full rounded border border-input bg-background px-2 text-sm text-foreground outline-none focus:border-ring focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground ${className ?? ""}`}
      />
      {open && !disabled && (
        <ul className="absolute z-50 mt-1 max-h-60 w-full overflow-y-auto rounded border border-input bg-popover py-1 text-sm shadow-md">
          {normalizeEntry(draft) &&
            !options.some((o) => o === normalizeEntry(draft)) && (
              <li>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => pick(normalizeEntry(draft))}
                  className="block w-full px-2 py-1 text-left font-medium text-foreground hover:bg-accent"
                >
                  ✨ Utiliser « {normalizeEntry(draft)} » (Saisie libre)
                </button>
              </li>
            )}
          {filtered.map((g) => (
            <li key={g.label || "all"}>
              {g.label && (
                <div className="px-2 py-1 text-[0.65rem] uppercase tracking-wide text-muted-foreground">
                  {g.label}
                </div>
              )}
              <ul>
                {g.options.map((o) => (
                  <li key={`${g.label}-${o}`}>
                    <button
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => pick(o)}
                      className="block w-full px-2 py-1 text-left text-foreground hover:bg-accent"
                    >
                      {o}
                    </button>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
