/** A self-contained, immutable-run publication figure. Not a new worker result. */
export type FigureFormat="svg"|"png";
export interface ScientificFigureMetadata {
  schema:"quantum-figure/v1";
  format:FigureFormat;
  file:"figure.svg"|"figure.png";
  fileSha256:string;
  svgSha256:string;
  source:{runId:string;jobId:string;operation:string;modelId:string;
    jobSha256:string;resultSha256:string;artifactSha256:string|null};
  parameters:Record<string,unknown>;
  axes:{x:{label:string;unit:string};y:{label:string;unit:string}};
  series:{label:string;unit:string}[];
  plottedSamples:number;
  samplePolicy:"all recorded samples";
  uncertainty:"not recorded";
  engine:{name:string;version:string};
  worker:{version:string;pythonVersion:string};
  computedAt:string;
  exportedAt:string;
}
export interface ScientificFigurePreview {svg:string;metadata:Omit<ScientificFigureMetadata,"format"|"file"|"fileSha256"|"exportedAt">}
