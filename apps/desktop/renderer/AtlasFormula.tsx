import React from "react";
import katex from "katex";

/** Render pinned Atlas TeX as native MathML, without external fonts or runtime scripts. */
export function AtlasFormula({ latex }: { latex: string }) {
  let markup: string;
  try {
    markup = katex.renderToString(latex, {
      displayMode: true, output: "mathml", throwOnError: true, trust: false,
    });
  } catch {
    return <div className="atlas-formula" role="status" data-testid="atlas-formula">Formula unavailable in this viewer</div>;
  }
  return <div className="atlas-formula" data-testid="atlas-formula" tabIndex={0} dangerouslySetInnerHTML={{ __html: markup }} />;
}
