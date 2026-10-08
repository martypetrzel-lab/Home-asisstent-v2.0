"use client";
import * as Dialog from "@radix-ui/react-dialog";
import { Button } from "./button";
export function ConfirmationDialog({
  open,
  onOpenChange,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (value: boolean) => void;
  onConfirm: () => void;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="dialog-overlay" />
        <Dialog.Content className="dialog-content">
          <Dialog.Title>Přejít na živá data?</Dialog.Title>
          <Dialog.Description>
            Simulovaná měření zmizí. Bez připojeného ESP32 budou hodnoty
            nedostupné. Ovládání relé vyžaduje přihlášení k serverové bráně a
            ověřenou polaritu výstupu.
          </Dialog.Description>
          <div className="actions">
            <Dialog.Close asChild>
              <Button variant="outline">Zrušit</Button>
            </Dialog.Close>
            <Button onClick={onConfirm}>Přejít na živý režim</Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
