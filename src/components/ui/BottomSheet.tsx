import type { ReactNode } from "react";
import { Sheet } from "react-modal-sheet";
import X from "lucide-react/dist/esm/icons/x";

import { Button } from "./Button";

type BottomSheetProps = {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  snapPoints?: number[];
  initialSnap?: number;
  showCloseButton?: boolean;
};

export function BottomSheet({
  open,
  title,
  onClose,
  children,
  snapPoints = [0, 0.45, 0.9],
  initialSnap = 1,
  showCloseButton = true,
}: BottomSheetProps) {
  return (
    <Sheet
      isOpen={open}
      onClose={onClose}
      snapPoints={snapPoints}
      initialSnap={initialSnap}
      modalEffectRootId="root"
      className="ui-sheet-root"
    >
      <Sheet.Container className="ui-sheet-container" role="dialog" aria-modal="true" aria-label={title}>
        <Sheet.Header className="ui-sheet-header">
          <div className="flex items-center justify-between px-4 pb-1 pt-0.5">
            <div className="w-8" />
            <p className="truncate px-2 text-center text-[13px] font-semibold text-slate-700">{title}</p>
            {showCloseButton ? (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0"
                aria-label="닫기"
                leadingIcon={<X className="h-4 w-4" />}
                onClick={onClose}
              />
            ) : (
              <div className="w-8" />
            )}
          </div>
        </Sheet.Header>
        <Sheet.Content className="ui-sheet-content" scrollClassName="ui-sheet-content-scroller">
          {children}
        </Sheet.Content>
      </Sheet.Container>
      <Sheet.Backdrop className="ui-sheet-backdrop" onTap={onClose} />
    </Sheet>
  );
}
