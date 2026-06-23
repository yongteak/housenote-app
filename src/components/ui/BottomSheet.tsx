import { type CSSProperties, type ReactNode, useEffect } from "react";
import { AnimatePresence, motion } from "motion/react";
import { createPortal } from "react-dom";

import { cn } from "../../lib/cn";

/** 시트 플로팅 여백 (하단·좌·우 동일) */
export const SHEET_INSET = 12;

type BottomSheetLayout = "inset" | "compact";

type BottomSheetProps = {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  /** inset: 상·하·좌·우 동일 여백, compact: 하단 플로팅 카드 */
  layout?: BottomSheetLayout;
  /** 헤더 좌측 액션 (상세·원본 등) */
  headerLeading?: ReactNode;
  closeLabel?: string;
};

/** 하단·좌·우 동일 플로팅 여백 */
function getSheetFloatingInset(): string {
  return `calc(${SHEET_INSET}px + env(safe-area-inset-bottom, 0px))`;
}

function getSheetShellStyle(layout: BottomSheetLayout): CSSProperties {
  const floatingInset = getSheetFloatingInset();

  if (layout === "inset") {
    return {
      top: `calc(${SHEET_INSET}px + env(safe-area-inset-top, 0px))`,
      left: floatingInset,
      right: floatingInset,
      bottom: floatingInset,
    };
  }

  return {
    left: floatingInset,
    right: floatingInset,
    bottom: floatingInset,
  };
}

function getSheetPanelStyle(layout: BottomSheetLayout): CSSProperties {
  if (layout === "inset") {
    return { maxHeight: "100%" };
  }

  return {
    maxHeight: `calc(85dvh - env(safe-area-inset-top, 0px) - ${SHEET_INSET * 2}px)`,
  };
}

export function BottomSheet({
  open,
  title,
  onClose,
  children,
  layout = "compact",
  headerLeading,
  closeLabel = "닫기",
}: BottomSheetProps) {
  useEffect(() => {
    if (!open) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  if (typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <AnimatePresence>
      {open ? (
        <>
          <motion.button
            type="button"
            aria-label="시트 닫기"
            className="ui-sheet-backdrop fixed inset-0 z-[80] cursor-pointer border-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={onClose}
          />

          <motion.div
            className={cn("fixed z-[90] flex justify-center pointer-events-none", layout === "inset" && "top-0")}
            style={getSheetShellStyle(layout)}
            initial={{ y: "108%", opacity: 0.96 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "108%", opacity: 0.96 }}
            transition={{ type: "spring", damping: 30, stiffness: 340 }}
          >
            <section
              role="dialog"
              aria-modal="true"
              aria-label={title}
              className={cn(
                "ui-sheet-container pointer-events-auto flex w-full max-w-xl flex-col overflow-hidden",
                layout === "inset" && "ui-sheet-container--inset",
              )}
              style={getSheetPanelStyle(layout)}
            >
              <header className="ui-sheet-header shrink-0 border-b border-slate-100/80">
                <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 px-3 py-2.5">
                  <div className="flex min-w-0 items-center justify-start gap-2">{headerLeading}</div>
                  <p className="max-w-[44vw] truncate text-center text-[15px] font-semibold text-slate-900">{title}</p>
                  <div className="flex justify-end">
                    <button
                      type="button"
                      className="cursor-pointer text-[15px] font-medium text-slate-500 transition hover:text-slate-800 active:opacity-60"
                      onClick={onClose}
                    >
                      {closeLabel}
                    </button>
                  </div>
                </div>
              </header>

              <div className="ui-sheet-content-scroller min-h-0 flex-1 overflow-y-auto overscroll-contain">
                {children}
              </div>
            </section>
          </motion.div>
        </>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}
