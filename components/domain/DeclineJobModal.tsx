"use client";

import * as React from "react";
import { X } from "lucide-react";
import { Modal, ModalContent, ModalTrigger, ModalClose } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";

type Strings = {
  triggerLabel: string;
  title: string;
  hint: string;
  reasonLegend: string;
  reasonOptions: { value: string; label: string }[];
  cancel: string;
  submit: string;
};

export function DeclineJobModal({
  action,
  locale,
  jobId,
  strings,
}: {
  action: (formData: FormData) => void | Promise<void>;
  locale: string;
  jobId: string;
  strings: Strings;
}) {
  return (
    <Modal>
      <ModalTrigger asChild>
        <button
          type="button"
          className="inline-flex h-12 flex-1 items-center justify-center rounded-md border-[1.5px] border-danger bg-bg-surface text-[15px] font-bold text-danger"
        >
          <X size={18} className="mr-1" aria-hidden />
          {strings.triggerLabel}
        </button>
      </ModalTrigger>
      <ModalContent title={strings.title}>
        <form action={action} className="flex flex-col gap-4">
          <input type="hidden" name="locale" value={locale} />
          <input type="hidden" name="id" value={jobId} />
          <input type="hidden" name="action" value="decline" />
          <p className="text-[14px] text-text-secondary">{strings.hint}</p>
          <fieldset>
            <legend className="text-[14px] font-bold">
              {strings.reasonLegend}
            </legend>
            <ul className="mt-2 flex flex-col gap-2">
              {strings.reasonOptions.map((opt) => (
                <li key={opt.value}>
                  <label className="flex cursor-pointer items-center gap-3 rounded-md border-[1.5px] border-border bg-bg-surface p-3.5 has-[:checked]:border-2 has-[:checked]:border-danger">
                    <input
                      type="radio"
                      name="reason"
                      value={opt.value}
                      required
                      className="peer sr-only"
                    />
                    <span
                      className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 border-border-strong after:hidden after:h-3 after:w-3 after:rounded-full after:bg-danger after:content-[''] peer-checked:border-danger peer-checked:after:block"
                      aria-hidden
                    />
                    <span className="text-[15px]">{opt.label}</span>
                  </label>
                </li>
              ))}
            </ul>
          </fieldset>
          <div className="mt-2 flex gap-3">
            <ModalClose
              type="button"
              className="inline-flex h-12 flex-1 items-center justify-center rounded-md border-[1.5px] border-border-strong bg-bg-surface text-[15px] font-semibold text-text-primary"
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
