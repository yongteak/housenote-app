/**
 * @file StarRatingInput.tsx
 * @description 1~5점 별점 입력. Apple HIG 터치 타깃(44px)을 따른다.
 */
type StarRatingInputProps = {
  label: string;
  value: number | null;
  onChange: (value: number | null) => void;
};

export function StarRatingInput({ label, value, onChange }: StarRatingInputProps) {
  return (
    <div className="space-y-2">
      <p className="text-[13px] text-slate-600">{label}</p>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((score) => {
          const active = value != null && score <= value;
          return (
            <button
              key={score}
              type="button"
              className={`flex h-11 w-11 items-center justify-center rounded-xl text-[20px] transition ${
                active ? "bg-emerald-50 text-emerald-500" : "bg-slate-50 text-slate-300 hover:bg-slate-100"
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
