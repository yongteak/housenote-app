import type { ButtonHTMLAttributes, ReactNode } from "react";

import { cn } from "../../lib/cn";

type ButtonVariant = "primary" | "surface" | "ghost" | "danger";
type ButtonSize = "sm" | "md" | "icon";

const variantClassName: Record<ButtonVariant, string> = {
  primary: "toss-button-primary",
  surface: "toss-button-surface",
  ghost: "ui-button-ghost",
  danger: "ui-button-danger",
};

const sizeClassName: Record<ButtonSize, string> = {
  sm: "h-11 min-h-11 px-3 text-ui-caption",
  md: "h-11 min-h-11 px-4 text-ui-button",
  icon: "h-11 min-h-11 w-11 min-w-11 p-0",
};

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  leadingIcon?: ReactNode;
  trailingIcon?: ReactNode;
};

export function Button({
  variant = "primary",
  size = "md",
  className,
  type = "button",
  leadingIcon,
  trailingIcon,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        "inline-flex items-center justify-center gap-1.5 font-semibold transition disabled:pointer-events-none disabled:opacity-45",
        variantClassName[variant],
        sizeClassName[size],
        className,
      )}
      {...props}
    >
      {leadingIcon}
      {children}
      {trailingIcon}
    </button>
  );
}
