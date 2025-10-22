
"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ClipboardCopy } from "lucide-react";

interface EmailPreviewDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  htmlContent: string;
  onCopy: (htmlContent: string) => void;
}

export function EmailPreviewDialog({
  isOpen,
  onOpenChange,
  htmlContent,
  onCopy,
}: EmailPreviewDialogProps) {
  const handleCopyClick = () => {
    onCopy(htmlContent);
    onOpenChange(false); // Close dialog after copying
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Aperçu du Rapport par E-mail</DialogTitle>
          <DialogDescription>
            Voici l'aperçu du rapport qui sera copié. Vous pourrez le coller
            directement dans votre client de messagerie.
          </DialogDescription>
        </DialogHeader>
        <div className="flex-1 overflow-auto border rounded-md">
          <iframe
            srcDoc={htmlContent}
            className="w-full h-full border-0"
            title="Aperçu du rapport"
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fermer
          </Button>
          <Button onClick={handleCopyClick}>
            <ClipboardCopy className="mr-2 h-4 w-4" />
            Copier le contenu
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
