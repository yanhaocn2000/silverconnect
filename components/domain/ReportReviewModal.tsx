"use client";

import * as React from "react";
import { Flag } from "lucide-react";
import { Modal, ModalContent, ModalTrigger, ModalClose } from "@/components/ui/Modal";
import { Label } from "@/components/ui/Label";
import { Button } from "@/components/ui/Button";

type Strings = {
  triggerAriaLabel: string;
  title: string;
  hint: string;
  reasonLegend: string;
  reasonOptions: { value: string; label: string }[];
  detailsLabel: string;
  cancel: string;
  submit: string;
};

export function ReportReviewModal({
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
          aria-label={strings.triggerAriaLabel}
          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-sm text-text-tertiary hover:text-danger"
        >
          <Flag size={14} aria-hidden />
        </button>
      </ModalTrigger>
      <ModalContent title={strings.title}>
        <p className="text-[14px] text-text-secondary">{strings.hint}</p>
        <form action={action} className="mt-4 flex flex-col gap-4">
          <input type="hidden" name="locale" value={locale} />
          <input type="hidden" name="reviewId" value={reviewId} />
          <fieldset>
            <legend className="text-[14px] font-bold">
              {strings.reasonLegend}
            </legend>
            <ul className="mt-2 flex flex-col gap-2">
              {strings.reasonOptions.map((opt) => (
                <li key={opt.value}>
                  <label className="flex cursor-pointer items-center gap-3 rounded-md border-[1.5px] border-border bg-bg-surface p-3 has-[:checked]:border-2 has-[:checked]:border-brand">
                    <input
                      type="radio"
                      name="reason"
                      value={opt.value}
                      required
                      className="peer sr-only"
                    />
                    <span
                      className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 border-border-strong after:hidden after:h-2.5 after:w-2.5 after:rounded-full after:bg-brand after:content-[''] peer-checked:border-brand peer-checked:after:block"
                      aria-hidden
                    />
                    <span className="text-[14px]">{opt.label}</span>
                  </label>
                </li>
              ))}
            </ul>
          </fieldset>
          <div>
            <Label htmlFor="report-details">{strings.detailsLabel}</Label>
            <textarea
              id="report-details"
              name="details"
              rows={3}
              maxLength={500}
              className="block w-full rounded-md border-[1.5px] border-border-strong bg-bg-surface p-3 text-[15px] text-text-primary focus:border-brand focus:outline-none"
            />
          </div>
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
