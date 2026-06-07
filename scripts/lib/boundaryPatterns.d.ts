export type ForbiddenPattern = { pattern: string; reason: string };

export type BoundaryViolation = {
  relPath: string;
  line: number;
  pattern: string;
  reason: string;
  text: string;
};

export const MARKETPLACE_FORBIDDEN: ForbiddenPattern[];
export const OPERATOR_FORBIDDEN: ForbiddenPattern[];

export function walkSourceFiles(dir: string): string[];

export function scanForbiddenImports(
  root: string,
  srcDir: string,
  forbidden: ForbiddenPattern[],
): { files: string[]; violations: BoundaryViolation[] };
