import { cn } from "../../lib/cn";

type LoginProfileAvatarProps = {
  variant: "dad" | "mom";
  className?: string;
};

export function LoginProfileAvatar({ variant, className }: LoginProfileAvatarProps) {
  if (variant === "dad") {
    return (
      <svg
        aria-hidden="true"
        className={cn("h-full w-full", className)}
        viewBox="0 0 96 96"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <rect width="96" height="96" rx="48" fill="#DBEAFE" />
        <circle cx="48" cy="40" r="18" fill="#FCD9B6" />
        <path
          d="M30 36C32 28 39 24 48 24C57 24 64 28 66 36C63 33 56 31 48 31C40 31 33 33 30 36Z"
          fill="#334155"
        />
        <path
          d="M30 52C30 44 37 38 48 38C59 38 66 44 66 52C66 58 62 63 56 66C54 61 51 58 48 58C45 58 42 61 40 66C34 63 30 58 30 52Z"
          fill="#475569"
        />
        <circle cx="41" cy="40" r="2" fill="#1E293B" />
        <circle cx="55" cy="40" r="2" fill="#1E293B" />
        <path d="M44 47C46 49 50 49 52 47" stroke="#BE123C" strokeWidth="2" strokeLinecap="round" />
      </svg>
    );
  }

  return (
    <svg
      aria-hidden="true"
      className={cn("h-full w-full", className)}
      viewBox="0 0 96 96"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect width="96" height="96" rx="48" fill="#FCE7F3" />
      <circle cx="48" cy="42" r="17" fill="#FCD9B6" />
      <path
        d="M28 34C30 22 38 16 48 16C58 16 66 22 68 34C66 28 58 24 48 24C38 24 30 28 28 34Z"
        fill="#7C2D12"
      />
      <path
        d="M26 38C24 48 26 58 32 66C36 72 42 76 48 76C54 76 60 72 64 66C70 58 72 48 70 38C66 44 58 48 48 48C38 48 30 44 26 38Z"
        fill="#92400E"
      />
      <circle cx="41" cy="42" r="2" fill="#1E293B" />
      <circle cx="55" cy="42" r="2" fill="#1E293B" />
      <path d="M44 49C46 51 50 51 52 49" stroke="#BE123C" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
