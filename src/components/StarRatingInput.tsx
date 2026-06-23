/**
 * @file StarRatingInput.tsx
 * @description 1~5점 별점 입력. Apple HIG 터치 타깃(44px)을 따른다.
 */
type StarRatingInputProps = {
  label: string;
  hint?: string;
  value: number | null;
  onChange: (value: number | null) => void;
};

export function StarRatingInput({ label, hint, value, onChange }: StarRatingInputProps) {
  return (
    <div className="space-y-2">
      <div>
        <p className="text-ui-emphasis font-semibold text-slate-800">{label}</p>
        {hint ? <p className="mt-0.5 text-ui-caption text-slate-500">{hint}</p> : null}
      </div>
      <div className="flex gap-2.5">
        {[1, 2, 3, 4, 5].map((score) => {
          const active = value != null && score <= value;
          return (
            <button
              key={score}
              type="button"
              className={`flex h-11 min-h-11 w-11 min-w-11 shrink-0 items-center justify-center rounded-xl border-2 text-[20px] leading-none transition active:scale-95 ${
                active
                  ? "border-emerald-400 bg-emerald-50 text-emerald-500"
                  : "border-slate-100 bg-slate-50 text-slate-300 hover:bg-slate-100 active:bg-slate-100"
              }`}
              aria-label={`${label} ${score}점`}
              onClick={() => onChange(value === score ? null : score)}
            >
              ★
            </button>
          );
        })}
      </div>
    </div>
  );
}
