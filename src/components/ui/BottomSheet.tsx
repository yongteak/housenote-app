import { type ReactNode, useEffect } from "react";
import { AnimatePresence, motion } from "motion/react";
import { createPortal } from "react-dom";

import { cn } from "../../lib/cn";

/** 시트 플로팅 여백 (상·하·좌·우 동일) */
export const SHEET_INSET = 12;

type BottomSheetLayout = "inset" | "compact";

type BottomSheetProps = {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  /** 상·하·좌·우 동일 여백의 전체 화면 느낌 */
  layout?: BottomSheetLayout;
  /** 헤더 좌측 액션 (상세·원본 등) */
  headerLeading?: ReactNode;
  closeLabel?: string;
};

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

  const insetStyle =
    layout === "inset"
      ? {
          top: `calc(${SHEET_INSET}px + env(safe-area-inset-top, 0px))`,
          bottom: `calc(${SHEET_INSET}px + env(safe-area-inset-bottom, 0px))`,
          left: SHEET_INSET,
          right: SHEET_INSET,
        }
      : {
          left: SHEET_INSET,
          right: SHEET_INSET,
          bottom: `calc(${SHEET_INSET}px + env(safe-area-inset-bottom, 0px))`,
          maxHeight: `calc(92dvh - env(safe-area-inset-top, 0px) - ${SHEET_INSET}px)`,
        };

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

          <motion.section
            role="dialog"
            aria-modal="true"
            aria-label={title}
            className={cn(
              "ui-sheet-container fixed z-[90] flex flex-col overflow-hidden",
              layout === "inset" && "ui-sheet-container--inset",
            )}
            style={insetStyle}
            initial={{ y: layout === "inset" ? "104%" : "108%", opacity: 0.96 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: layout === "inset" ? "104%" : "108%", opacity: 0.96 }}
            transition={{ type: "spring", damping: 30, stiffness: 340 }}
          >
            <header className="ui-sheet-header shrink-0 border-b border-slate-100/80">
              <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 px-3 py-2.5">
                <div className="flex min-w-0 items-center justify-start gap-2">{headerLeading}</div>
                <p className="max-w-[44vw] truncate text-center text-[15px] font-semibold text-slate-900">{title}</p>
                <div className="flex justify-end">
                  <button
                    type="button"
                    className="text-[15px] font-medium text-slate-500 transition hover:text-slate-800 active:opacity-60"
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
          </motion.section>
        </>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}
