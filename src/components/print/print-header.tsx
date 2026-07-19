import { LogoMark } from "@/components/logo";

/**
 * Shared letterhead for every printable/save-as-PDF document in the app
 * (site diary entries, variations, and anything else that grows a print
 * view). Only rendered in print (`hidden print:block`) — the on-screen page
 * keeps its normal header. Deliberately plain, high-contrast markup: the
 * global `@media print` rules in globals.css force everything to black on
 * white, so this doesn't try to be colorful — just complete and legible.
 */
export function PrintHeader({
  documentTitle,
  companyName,
  licenceNumber,
  projectName,
  siteAddress,
  logoUrl,
}: {
  documentTitle: string;
  companyName?: string | null;
  licenceNumber?: string | null;
  projectName?: string | null;
  siteAddress?: string | null;
  logoUrl?: string | null;
}) {
  const generated = new Date().toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });

  return (
    <div className="mb-6 hidden border-b-2 border-slate-900 pb-4 print:block">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-2.5">
          {logoUrl ? (
            // Fixed-height box, auto width capped at 160px — keeps the logo
            // the same visual size on every printed document regardless of
            // the uploaded file's own pixel dimensions or aspect ratio.
            // Explicit width/height attributes (not just the CSS classes)
            // matter here: some browsers' print/PDF rendering paints an
            // <img> at its intrinsic size if it hasn't finished loading by
            // the time print layout runs, so reserving the box up front
            // avoids a logo that only sometimes shows at the right size.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={logoUrl}
              alt={`${companyName ?? "Company"} logo`}
              width={160}
              height={48}
              className="max-h-12 max-w-[160px] object-contain object-left"
              style={{ height: "48px", width: "auto", maxWidth: "160px" }}
            />
          ) : (
            <>
              <LogoMark className="h-12 w-12 rounded-[12px]" />
              <span className="text-lg font-semibold tracking-tight text-slate-900">CivFlow</span>
            </>
          )}
        </div>
        <p className="text-xs text-slate-500">Generated {generated}</p>
      </div>

      <h1 className="mt-5 text-xl font-semibold tracking-tight text-slate-900">{documentTitle}</h1>

      <div className="mt-1.5 text-sm text-slate-700">
        {companyName && (
          <p>
            {companyName}
            {licenceNumber && ` · QBCC Licence No. ${licenceNumber}`}
          </p>
        )}
        {projectName && (
          <p>
            {projectName}
            {siteAddress && ` — ${siteAddress}`}
          </p>
        )}
      </div>
    </div>
  );
}
