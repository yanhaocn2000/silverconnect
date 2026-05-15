"use client";

import * as React from "react";
import { Trash2 } from "lucide-react";
import { Modal, ModalContent, ModalTrigger, ModalClose } from "@/components/ui/Modal";

type Strings = {
  triggerAriaLabel: string;
  title: string;
  body: string;
  cancel: string;
  confirm: string;
};

export function DeleteCardConfirm({
  action,
  locale,
  cardId,
  strings,
}: {
  action: (formData: FormData) => void | Promise<void>;
  locale: string;
  cardId: string;
  strings: Strings;
}) {
  return (
    <Modal>
      <ModalTrigger asChild>
        <button
          type="button"
          aria-label={strings.triggerAriaLabel}
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-sm border-[1.5px] border-danger bg-bg-surface text-danger"
        >
          <Trash2 size={16} aria-hidden />
        </button>
      </ModalTrigger>
      <ModalContent title={strings.title}>
        <p className="text-[15px] text-text-secondary">{strings.body}</p>
        <form action={action} className="mt-5 flex gap-3">
          <input type="hidden" name="locale" value={locale} />
          <input type="hidden" name="id" value={cardId} />
          <ModalClose
            type="button"
            className="inline-flex h-12 flex-1 items-center justify-center rounded-md border-[1.5px] border-border-strong bg-bg-surface text-[15px] font-semibold text-text-primary"
          >
            {strings.cancel}
          </ModalClose>
          <button
            type="submit"
            className="inline-flex h-12 flex-1 items-center justify-center rounded-md bg-danger text-[15px] font-bold text-white"
          >
            {strings.confirm}
          </button>
        </form>
      </ModalContent>
    </Modal>
  );
}
