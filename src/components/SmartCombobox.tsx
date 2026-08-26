import { useEffect, useMemo, useRef, useState } from "react";
import { fuzzyFilter, resolveEntry, normalizeEntry } from "@/lib/piano-constants";

type Group = { label: string; options: string[] };

type Props = {
  value: string;
  options: string[];
  groups?: Group[];
  disabled?: boolean;
  placeholder?: string;
  onCommit: (value: string) => void;
};

export function SmartCombobox({
  value,
  options,
  groups,
  disabled,
  placeholder,
  onCommit,
}: Props) {
  const [draft, setDraft] = useState(value);
  const [open, setOpen] = useState(false);
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
    if (next !== value) onCommit(next);
  };

  const pick = (option: string) => {
    setDraft(option);
    setOpen(false);
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
        onChange={(e) => {
          setDraft(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => commit(draft)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            commit(draft);
          } else if (e.key === "Tab") {
            commit(draft);
          } else if (e.key === "Escape") {
            setOpen(false);
          }
        }}
        className="mt-1 h-8 w-full rounded border border-input bg-background px-2 text-sm text-foreground outline-none focus:border-ring focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground"
      />
      {open && !disabled && filtered.length > 0 && (
        <ul className="absolute z-50 mt-1 max-h-56 w-full overflow-auto rounded border border-input bg-popover py-1 text-sm shadow-md">
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
          {normalizeEntry(draft) &&
            !options.some((o) => o === normalizeEntry(draft)) && (
              <li>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => pick(normalizeEntry(draft))}
                  className="block w-full px-2 py-1 text-left text-muted-foreground hover:bg-accent"
                >
                  Utiliser « {normalizeEntry(draft)} »
                </button>
              </li>
            )}
        </ul>
      )}
    </div>
  );
}
