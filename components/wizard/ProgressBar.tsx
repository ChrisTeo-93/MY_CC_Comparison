interface ProgressBarProps {
  steps: string[];
  current: number; // 0-based index
}

export function ProgressBar({ steps, current }: ProgressBarProps) {
  return (
    <div className="flex items-center justify-center gap-2">
      {steps.map((label, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <div key={label} className="flex items-center gap-2">
            <div className="flex items-center gap-2">
              <span
                className={[
                  "flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold transition",
                  done
                    ? "bg-brand-dark text-white"
                    : active
                      ? "bg-brand-dark text-white ring-4 ring-brand/20"
                      : "bg-slate-200 text-slate-500",
                ].join(" ")}
              >
                {done ? "✓" : i + 1}
              </span>
              <span
                className={[
                  "hidden text-sm font-medium sm:inline",
                  active ? "text-slate-900" : "text-slate-500",
                ].join(" ")}
              >
                {label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <span className="h-px w-6 bg-slate-200 sm:w-10" />
            )}
          </div>
        );
      })}
    </div>
  );
}
