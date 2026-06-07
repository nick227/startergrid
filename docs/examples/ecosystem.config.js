// PM2 process manager configuration — auto-dealer sync engine.
//
// Usage:
//   cp docs/examples/ecosystem.config.js ecosystem.config.js
//   # Set all required env vars (see docs/deployment-checklist.md)
//   pm2 start ecosystem.config.js --env production
//   pm2 save          # persist across reboots
//   pm2 startup       # install OS-level startup hook
//
// Verify:
//   pm2 list          # check process status
//   pm2 logs          # tail all logs
//   pm2 logs sync-scheduler --lines 50
//
// PM2 docs: https://pm2.keymetrics.io/docs/usage/application-declaration/
//
// Prerequisite: run `npm run build:all` before starting with PM2.

'use strict';

module.exports = {
  apps: [

    // ── HTTP API server ────────────────────────────────────────────────────────
    // Single instance. Crashes restart automatically (autorestart: true default).
    {
      name:      'api-server',
      script:    'dist/src/scripts/server.js',
      instances: 1,
      exec_mode: 'fork',
      watch:     false,
      env_production: {
        NODE_ENV: 'production',
        PORT:     '3000',
        HOST:     '0.0.0.0',
        // Required in production (see validateEnv):
        //   DATABASE_URL, APP_BASE_URL, SESSION_SECRET,
        //   PUBLIC_WRITE_RATE_LIMIT, PUBLIC_WRITE_RATE_WINDOW_MS
        //   DISPATCH_ENVIRONMENT (defaults to MOCK)
        // Forbidden in production:
        //   DEV_OPERATOR_ID, DEV_OPERATOR_DEALER_IDS
      },
    },

    // ── Sync scheduler (every 5 minutes) ──────────────────────────────────────
    // Processes READY/SCHEDULED/FAILED queue items. autorestart: false because
    // PM2 cron mode is responsible for scheduling, not crash restart.
    // Exit 0 on clean run (even empty queue). Exit 1 on fatal config error.
    //
    // First log line: "SyncScheduler started <ISO timestamp>"
    {
      name:        'sync-scheduler',
      script:      'dist/src/scripts/sync/syncScheduler.js',
      cron_restart: '*/5 * * * *',
      autorestart:  false,
      watch:        false,
      env_production: {
        NODE_ENV:             'production',
        DISPATCH_ENVIRONMENT: 'MOCK',    // change to SANDBOX/PRODUCTION when ready
      },
    },

    // ── Ingress poll (every 5 minutes) ────────────────────────────────────────
    // Polls API inventory sources that are due for a check based on their
    // per-source pollIntervalMinutes config. Skips non-due sources silently.
    // Exit 0 on clean run. Exit 1 when any source check fails (non-dry-run).
    //
    // First log line: "IngressPoll started <ISO timestamp>"
    {
      name:        'ingress-poll',
      script:      'dist/src/scripts/inventory/pollSources.js',
      cron_restart: '*/5 * * * *',
      autorestart:  false,
      watch:        false,
      env_production: {
        NODE_ENV: 'production',
      },
    },

    // ── Performance cache compute (every 15 minutes) ──────────────────────────
    // Recomputes VehiclePerformanceCache and PlatformPerformanceSummary for all
    // dealers. CPU-light; reads inventory and sync events, writes cache rows.
    // Exit 0 on clean run. Exit 1 when no dealers exist in DB.
    //
    // First log line: "PerformanceCompute started <ISO timestamp>"
    {
      name:        'performance-compute',
      script:      'dist/src/scripts/performance/computePerformance.js',
      cron_restart: '*/15 * * * *',
      autorestart:  false,
      watch:        false,
      env_production: {
        NODE_ENV: 'production',
      },
    },

  ],
};
