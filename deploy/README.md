# Jelly Party Server Deployment

Deploy the Jelly Party WebSocket server with observability via Grafana Cloud OTLP.

## Prerequisites

- Docker & Docker Compose
- Grafana Cloud account (free tier works great)

## Setup

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Get your OTLP credentials from Grafana Cloud:
   - Go to [grafana.com](https://grafana.com) → Your Stack → OpenTelemetry → Configure
   - Copy the OTLP endpoint (e.g., `https://otlp-gateway-prod-eu-west-2.grafana.net/otlp`)
   - Copy your Instance ID
   - Generate an API token

3. Edit `.env` with your credentials

4. Start everything:
   ```bash
   docker compose up -d
   ```

## Updating

```bash
git pull
docker compose build
docker compose up -d
```

## Services

| Service | Port | Description |
|---------|------|-------------|
| server | 8080 | WebSocket server |
| server | 9090 | Metrics (internal, scraped by Alloy) |
| alloy | - | OTLP forwarding to Grafana Cloud |

## Observability

All telemetry flows through a single OTLP endpoint:

```
Server → Alloy → Grafana Cloud OTLP Gateway
  ├── Metrics → Prometheus/Mimir
  └── Logs → Loki
```

### Available Metrics

- `jellyparty_active_parties` - Current party count
- `jellyparty_active_clients` - Connected clients
- `jellyparty_messages_total{type="..."}` - Messages by type
- `jellyparty_parties_created_total` - Historical party count
- Plus Node.js defaults (CPU, memory, event loop)

### Viewing in Grafana

- **Metrics**: Explore → Prometheus → query `jellyparty_*`
- **Logs**: Explore → Loki → query `{container="server"}`
