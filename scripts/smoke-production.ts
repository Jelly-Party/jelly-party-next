import assert from "node:assert/strict";
import { RELEASE_VERSION } from "../config/release.ts";
import { DEFAULT_BUILD_URLS } from "../config/urls.ts";

await verifyPage(DEFAULT_BUILD_URLS.website, "Jelly Party");
await verifyPage(DEFAULT_BUILD_URLS.join, "You’re invited to watch together");

const healthUrl = new URL(DEFAULT_BUILD_URLS.websocket);
healthUrl.protocol = "https:";
healthUrl.pathname = "/health";
const healthResponse = await fetch(healthUrl, { cache: "no-store" });
assert.equal(healthResponse.status, 200, `${healthUrl} returned ${healthResponse.status}`);
assert.deepEqual(await healthResponse.json(), { status: "ok", version: RELEASE_VERSION });

await verifyWebSocket(DEFAULT_BUILD_URLS.websocket);
console.log("production website, join route, health endpoint, and WebSocket verified");

async function verifyPage(url: string, expectedText: string): Promise<void> {
  const response = await fetch(url, { cache: "no-store" });
  assert.equal(response.status, 200, `${url} returned ${response.status}`);
  assert.ok((await response.text()).includes(expectedText), `${url} has unexpected HTML`);
}

async function verifyWebSocket(baseUrl: string): Promise<void> {
  const url = new URL(baseUrl);
  url.pathname = "/party/ProductionSmokeCheck00";

  await new Promise<void>((resolve, reject) => {
    const socket = new WebSocket(url);
    let opened = false;
    const timeout = setTimeout(() => {
      socket.close();
      reject(new Error(`${url} did not complete a WebSocket handshake within 10 seconds`));
    }, 10_000);

    socket.addEventListener(
      "open",
      () => {
        opened = true;
        socket.close(1000);
      },
      { once: true },
    );
    socket.addEventListener(
      "close",
      () => {
        clearTimeout(timeout);
        if (opened) resolve();
        else reject(new Error(`${url} closed before completing its WebSocket handshake`));
      },
      { once: true },
    );
    socket.addEventListener(
      "error",
      () => {
        clearTimeout(timeout);
        reject(new Error(`${url} failed its WebSocket handshake`));
      },
      { once: true },
    );
  });
}
