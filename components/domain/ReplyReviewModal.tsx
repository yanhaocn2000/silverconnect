"use client";

import * as React from "react";
import { Reply } from "lucide-react";
import { Modal, ModalContent, ModalTrigger, ModalClose } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";

type Strings = {
  triggerLabel: string;
  title: string;
  cancel: string;
  submit: string;
};

export function ReplyReviewModal({
  action,
  locale,
  reviewId,
  strings,
}: {
  action: (formData: FormData) => void | Promise<void>;
  locale: string;
  reviewId: string;
  strings: Strings;
}) {
  return (
    <Modal>
      <ModalTrigger asChild>
        <button
          type="button"
          className="inline-flex h-10 items-center gap-1 rounded-sm border-[1.5px] border-brand bg-bg-surface px-3 text-[13px] font-semibold text-brand"
        >
          <Reply size={14} aria-hidden />
          {strings.triggerLabel}
        </button>
      </ModalTrigger>
      <ModalContent title={strings.title}>
        <form action={action} className="flex flex-col gap-3">
          <input type="hidden" name="locale" value={locale} />
          <input type="hidden" name="id" value={reviewId} />
          <textarea
            name="reply"
            required
            minLength={5}
            rows={4}
            className="block w-full rounded-md border-[1.5px] border-border-strong bg-bg-surface p-3 text-[15px] text-text-primary focus:border-brand focus:outline-none"
          />
          <div className="mt-2 flex gap-2">
            <ModalClose
              type="button"
              className="inline-flex h-10 flex-1 items-center justify-center rounded-md border-[1.5px] border-border-strong bg-bg-surface text-[14px] font-semibold text-text-primary"
            >
              {strings.cancel}
            </ModalClose>
            <Button type="submit" variant="primary" size="md">
              {strings.submit}
            </Button>
          </div>
        </form>
      </ModalContent>
    </Modal>
  );
}
