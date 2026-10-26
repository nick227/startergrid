import type { PrismaClient } from '@prisma/client';
import { autopilotEnabled, runAutopilot } from './service.js';

/** The interval is only a wake-up mechanism. Inventory, desired state and retry
 * state are durable; restarting does not lose work. Multi-process workers are
 * serialized by the same database policy-row lock. */
export function startAutopilotWorker(db: PrismaClient, intervalMs = 15_000): () => Promise<void> {
  if (!autopilotEnabled()) return async () => {};
  let running: Promise<unknown> | null = null;
  let stopped = false;
  const tick = () => {
    if (stopped || running) return;
    running = runAutopilot(db).catch(error => {
      // Do not log credentials or provider response bodies.
      console.error('Autopilot sweep failed:', error instanceof Error ? error.name : 'Unknown error');
    }).finally(() => { running = null; });
  };
  const timer = setInterval(tick, Math.max(1_000, intervalMs));
  timer.unref();
  tick();
  return async () => { stopped = true; clearInterval(timer); await running; };
}
