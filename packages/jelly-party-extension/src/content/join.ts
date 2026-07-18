import { parseMagicLink } from "jelly-party-lib";

document.documentElement.dataset.jellyPartyExtension = "installed";
window.postMessage({ type: "jelly-party:available" }, "*");

window.addEventListener("message", (event) => {
  if (event.source !== window || event.data?.type !== "jelly-party:join") return;
  const parsed = parseMagicLink(window.location.href);
  if (!parsed) {
    window.postMessage(
      { type: "jelly-party:result", ok: false, error: "Invalid invite link" },
      "*",
    );
    return;
  }
  void chrome.runtime
    .sendMessage({ type: "join:request", ...parsed })
    .then((result) => {
      window.postMessage({ type: "jelly-party:result", ...result }, "*");
      if (result?.ok && typeof result.destination === "string") {
        setTimeout(
          () => window.location.assign(result.destination),
          result.sidebarOpened ? 50 : 1500,
        );
      }
    })
    .catch(() =>
      window.postMessage(
        { type: "jelly-party:result", ok: false, error: "The extension could not open the video" },
        "*",
      ),
    );
});
