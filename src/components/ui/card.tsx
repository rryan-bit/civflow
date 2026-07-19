import { HTMLAttributes } from "react";

type Props = HTMLAttributes<HTMLDivElement> & { interactive?: boolean };

/** Shared card surface — pulls border/shadow/radius from the design tokens
 * in globals.css so every panel in the app looks consistent. Pass
 * `interactive` for cards that are hover targets (e.g. wrapped in a Link). */
export function Card({ interactive, className, children, ...rest }: Props) {
  return (
    <div className={`surface-card ${interactive ? "surface-card-interactive" : ""} ${className ?? ""}`} {...rest}>
      {children}
    </div>
  );
}
