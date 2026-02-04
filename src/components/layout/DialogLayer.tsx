import { useDialogStore } from "../../store/useDialogStore";
import { XPDialog } from "../ui/XPDialog";

export function DialogLayer() {
  const dialogs = useDialogStore((state) => state.dialogs);

  if (dialogs.length === 0) return null;

  return (
    <>
      {dialogs.map((dialog) => (
        <XPDialog key={dialog.id} dialog={dialog} />
      ))}
    </>
  );
}
