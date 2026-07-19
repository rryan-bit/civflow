"use client";

import { Button } from "@/components/ui/button";

/**
 * Shared trigger for every print-to-PDF page in the app (diary entries and
 * variations each still keep their own colocated copy; this is the shared
 * version for pages added since, like the client report). Just calls the
 * browser's native print dialog — "Save as PDF" there is how every printable
 * document in CivFlow becomes a shareable file, no server-side PDF
 * generation involved.
 */
export function PrintButton({ label = "Print / Save as PDF" }: { label?: string }) {
  return (
    <Button type="button" variant="outline" onClick={() => window.print()} className="print:hidden">
      {label}
    </Button>
  );
}
