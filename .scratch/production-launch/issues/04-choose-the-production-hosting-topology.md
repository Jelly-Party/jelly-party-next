# Choose the production hosting topology

Type: grilling
Status: resolved

## Question

Where should the new website, join flow, backend, and observability run?

## Answer

Deploy `www.jelly-party.com` and `join.jelly-party.com` as static sites on Vercel. Run the new WebSocket backend on a separate small VPS with the repository's Docker Compose and Caddy stack. Grafana Alloy forwards metrics and logs to a free Grafana Cloud stack. Include an uptime check, protected configuration, and a documented rollback; do not add a database, orchestration platform, or multi-region topology.
