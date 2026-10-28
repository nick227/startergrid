import { defineRailway, github, mysql, project, service, volume } from "railway/iac";

export default defineRailway(() => {
  const MySQL = mysql("MySQL", { region: "us-east4-eqdc4a" });
  MySQL.deploy = { startCommand: "docker-entrypoint.sh mysqld --innodb-use-native-aio=0 --disable-log-bin --performance_schema=0 --innodb-buffer-pool-size=1G" };
  MySQL.networking = { privateNetworkEndpoint: "mysql" };
  const mysqlVolume = volume("mysql-volume", { alerts: { usage: { "100": {}, "80": {}, "95": {} } }, allowOnlineResize: true, region: "us-east4-eqdc4a", sizeMB: 5000 });
  const autoDealerOperatorUi = service("auto-dealer-operator-ui", {
    source: github("nick227/startergrid", { branch: "main", checkSuites: false }),
    build: { buildCommand: "npm ci && npx prisma generate && npm run build:all", buildEnvironment: "V3", builder: "NIXPACKS", watchPatterns: ["/**"] },
    start: "npx prisma migrate deploy && node dist/src/scripts/server.js",
    healthcheck: "/health",
    healthcheckTimeout: 300,
    replicas: { "us-east4-eqdc4a": 1 },
    deploy: { restartPolicyMaxRetries: 3 },
  });

  return project("startergrid", {
    variables: { managed: false },
    resources: [autoDealerOperatorUi, MySQL, mysqlVolume],
  });
});
