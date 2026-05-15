"use client";

import * as React from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "./cn";

export const Modal = Dialog.Root;
export const ModalTrigger = Dialog.Trigger;
export const ModalClose = Dialog.Close;

export function ModalContent({
  className,
  title,
  children,
  ...props
}: React.ComponentPropsWithoutRef<typeof Dialog.Content> & { title?: string }) {
  return (
    <Dialog.Portal>
      <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50 data-[state=open]:animate-in data-[state=open]:fade-in" />
      <Dialog.Content
        className={cn(
          "fixed left-1/2 top-1/2 z-50 w-[min(480px,calc(100vw-32px))] -translate-x-1/2 -translate-y-1/2",
          "rounded-lg bg-bg-surface p-6 shadow-lg border border-border",
          "data-[state=open]:animate-in data-[state=open]:fade-in",
          className
        )}
        {...props}
      >
        {title && (
          <Dialog.Title className="text-h3 text-text-primary mb-4">
            {title}
          </Dialog.Title>
        )}
        {children}
        <Dialog.Close
          aria-label="Close"
          className="absolute right-4 top-4 inline-flex min-h-touch min-w-touch items-center justify-center rounded-sm text-text-secondary hover:text-text-primary"
        >
          <X size={24} aria-hidden />
        </Dialog.Close>
      </Dialog.Content>
    </Dialog.Portal>
  );
}
