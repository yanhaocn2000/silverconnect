"use client";

import * as React from "react";
import { Upload } from "lucide-react";
import { Modal, ModalContent, ModalTrigger, ModalClose } from "@/components/ui/Modal";
import { Label } from "@/components/ui/Label";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

type Strings = {
  triggerLabel: string;
  title: string;
  docNumberLabel: string;
  expiresLabel: string;
  chooseFileLabel: string;
  cancel: string;
  submit: string;
};

export function UploadDocModal({
  action,
  locale,
  docType,
  defaultDocumentNumber = "",
  defaultExpiresAt = "",
  strings,
}: {
  action: (formData: FormData) => void | Promise<void>;
  locale: string;
  docType: string;
  defaultDocumentNumber?: string;
  defaultExpiresAt?: string;
  strings: Strings;
}) {
  const numId = `dlg-num-${docType}`;
  const expId = `dlg-exp-${docType}`;
  const fileId = `dlg-file-${docType}`;
  const [fileName, setFileName] = React.useState<string>("");

  return (
    <Modal>
      <ModalTrigger asChild>
        <button
          type="button"
          className="inline-flex h-10 w-full items-center justify-center gap-1.5 rounded-md bg-brand px-3 text-[13px] font-bold text-white"
        >
          <Upload size={14} aria-hidden /> {strings.triggerLabel}
        </button>
      </ModalTrigger>
      <ModalContent title={strings.title}>
        <form
          action={action}
          encType="multipart/form-data"
          className="flex flex-col gap-4"
        >
          <input type="hidden" name="locale" value={locale} />
          <input type="hidden" name="type" value={docType} />
          <div>
            <Label htmlFor={numId}>{strings.docNumberLabel}</Label>
            <Input
              id={numId}
              name="documentNumber"
              defaultValue={defaultDocumentNumber}
            />
          </div>
          <div>
            <Label htmlFor={expId}>{strings.expiresLabel}</Label>
            <Input
              id={expId}
              name="expiresAt"
              type="date"
              defaultValue={defaultExpiresAt}
            />
          </div>
          <div>
            <Label htmlFor={fileId}>
              <span className="inline-flex h-10 w-full cursor-pointer items-center justify-center gap-1.5 rounded-md border-[1.5px] border-border-strong bg-bg-surface px-3 text-[13px] font-semibold text-text-primary">
                <Upload size={14} aria-hidden /> {strings.chooseFileLabel}
              </span>
            </Label>
            <input
              id={fileId}
              name="file"
              type="file"
              required
              accept="image/jpeg,image/png,image/webp,image/heic,application/pdf"
              className="sr-only"
              onChange={(e) => setFileName(e.target.files?.[0]?.name ?? "")}
            />
            {fileName && (
              <p className="mt-1 truncate text-[12px] text-text-tertiary">
                {fileName}
              </p>
            )}
          </div>
          <div className="mt-2 flex gap-3">
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
