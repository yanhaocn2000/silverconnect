"use client";

import * as React from "react";
import { Calendar } from "lucide-react";
import { Modal, ModalContent, ModalTrigger, ModalClose } from "@/components/ui/Modal";
import { Label } from "@/components/ui/Label";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

type Strings = {
  triggerLabel: string;
  title: string;
  hint: string;
  dateLabel: string;
  timeLabel: string;
  cancel: string;
  submit: string;
};

export function RescheduleModal({
  action,
  locale,
  bookingId,
  defaultDate,
  defaultTime,
  minDate,
  maxDate,
  strings,
}: {
  action: (formData: FormData) => void | Promise<void>;
  locale: string;
  bookingId: string;
  defaultDate: string;
  defaultTime: string;
  minDate: string;
  maxDate: string;
  strings: Strings;
}) {
  return (
    <Modal>
      <ModalTrigger asChild>
        <button
          type="button"
          className="inline-flex h-14 items-center justify-center gap-2 rounded-md border-[1.5px] border-brand bg-bg-surface px-4 text-[15px] font-bold text-brand"
        >
          <Calendar size={18} aria-hidden /> {strings.triggerLabel}
        </button>
      </ModalTrigger>
      <ModalContent title={strings.title}>
        <p className="text-[14px] text-text-secondary">{strings.hint}</p>
        <form action={action} className="mt-4 flex flex-col gap-4">
          <input type="hidden" name="locale" value={locale} />
          <input type="hidden" name="id" value={bookingId} />
          <div>
            <Label htmlFor="reschedule-date">{strings.dateLabel}</Label>
            <Input
              id="reschedule-date"
              name="date"
              type="date"
              required
              defaultValue={defaultDate}
              min={minDate}
              max={maxDate}
            />
          </div>
          <div>
            <Label htmlFor="reschedule-time">{strings.timeLabel}</Label>
            <Input
              id="reschedule-time"
              name="time"
              type="time"
              required
              defaultValue={defaultTime}
              step={900}
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
