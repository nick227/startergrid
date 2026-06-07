/**
 * Structured job logging helpers for recurring CLI jobs.
 *
 * Every job script must emit a parseable start line as its very first output:
 *   <JobName> started <ISO 8601 timestamp>
 *
 * This lets log aggregators (PM2, systemd, CloudWatch, etc.) extract the job
 * name and start time without parsing variable-format decorative headers.
 */

export function jobStartedLine(jobName: string, now = new Date()): string {
  return `${jobName} started ${now.toISOString()}`;
}

export function jobStarted(jobName: string, now = new Date()): void {
  console.log(jobStartedLine(jobName, now));
}
