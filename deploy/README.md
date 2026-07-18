# Jelly Party server deployment

The production relay is a single in-memory service. Docker Compose builds it from this repository
and publishes it on VPS loopback so the machine's existing reverse proxy can own TLS.

## Run it

```bash
git clone https://github.com/Jelly-Party/jelly-party-next.git
cd jelly-party-next/deploy
cp .env.example .env
docker compose up --build -d
curl http://127.0.0.1:8080/health
```

To update it:

```bash
git pull --ff-only
docker compose up --build -d
```

The service has no database or volume. Parties, presence, and chat live only in process memory, so
restarting it disconnects active parties.

## Global Caddy

Add this route to the VPS-wide Caddy configuration; do not run a second Caddy container here:

```caddyfile
v2.jelly-party.com {
	reverse_proxy 127.0.0.1:8080
}
```

Caddy forwards WebSocket upgrades automatically. After DNS points at the VPS and Caddy reloads,
verify both endpoints:

```bash
curl https://v2.jelly-party.com/health
```

Then run the two-peer extension smoke test against the production WebSocket before store submission.
Set `JELLY_PARTY_PORT` in `deploy/.env` only if port 8080 conflicts with another local service.
