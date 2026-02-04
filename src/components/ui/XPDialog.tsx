import { useState } from "react";
import { useDialogStore } from "../../store/useDialogStore";
import type { DialogInstance } from "../../store/useDialogStore";

interface XPDialogProps {
  dialog: DialogInstance;
}

export function XPDialog({ dialog }: XPDialogProps) {
  const closeDialog = useDialogStore((state) => state.closeDialog);
  const [promptValue, setPromptValue] = useState(
    dialog.options?.defaultValue ?? "",
  );

  const handleOk = () => {
    if (dialog.type === "prompt") {
      closeDialog(dialog.id, promptValue);
    } else if (dialog.type === "confirm") {
      closeDialog(dialog.id, true);
    } else {
      closeDialog(dialog.id, undefined);
    }
  };

  const handleCancel = () => {
    if (dialog.type === "confirm") {
      closeDialog(dialog.id, false);
    } else if (dialog.type === "prompt") {
      closeDialog(dialog.id, null);
    }
  };

  // Icon mapping (generic for now, can be replaced with actual assets)
  const getIcon = () => {
    const iconType =
      dialog.options?.iconType ??
      (dialog.type === "confirm" ? "question" : "info");

    // We can use generic descriptive text or placeholders if assets are missing
    // In a real XP app, these are 32x32 icons.
    switch (iconType) {
      case "error":
        return (
          <div className="w-8 h-8 rounded-full bg-red-600 flex items-center justify-center text-white font-bold text-xl">
            X
          </div>
        );
      case "warning":
        return (
          <div className="w-8 h-8 flex items-center justify-center text-yellow-500 font-bold text-3xl">
            !
          </div>
        );
      case "question":
        return (
          <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-xl">
            ?
          </div>
        );
      case "info":
      default:
        return (
          <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold text-xl italic">
            i
          </div>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/10 pointer-events-auto">
      <div className="window shadow-xp-window min-w-[300px] max-w-[450px]">
        <div className="title-bar">
          <div className="title-bar-text">{dialog.title}</div>
          <div className="title-bar-controls">
            <button aria-label="Close" onClick={handleCancel} />
          </div>
        </div>
        <div className="window-body flex flex-col gap-4">
          <div className="flex gap-4 items-start">
            <div className="flex-shrink-0 pt-1">{getIcon()}</div>
            <div className="flex-1 text-msn-lg whitespace-pre-wrap pt-1 min-h-[40px]">
              {dialog.message}
            </div>
          </div>

          {dialog.type === "prompt" && (
            <div className="field-row-stacked">
              <input
                type="text"
                className="w-full"
                value={promptValue}
                onChange={(e) => {
                  setPromptValue(e.target.value);
                }}
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleOk();
                }}
              />
            </div>
          )}

          <div className="flex justify-center gap-2 mt-2">
            <button
              className="min-w-[75px]"
              onClick={() => {
                handleOk();
              }}
            >
              {dialog.options?.okText ?? "OK"}
            </button>
            {(dialog.type === "confirm" || dialog.type === "prompt") && (
              <button className="min-w-[75px]" onClick={handleCancel}>
                {dialog.options?.cancelText ??
                  (dialog.type === "confirm" ? "Cancel" : "Cancel")}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
