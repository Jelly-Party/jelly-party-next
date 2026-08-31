import { parseMagicLink } from "jelly-party-lib";

document.documentElement.dataset.jellyPartyExtension = "installed";
window.postMessage({ type: "jelly-party:available" }, "*");

const invite = parseMagicLink(window.location.href);
if (!invite) {
  reportFailure("Invalid invite link");
} else {
  void chrome.runtime
    .sendMessage({ type: "join:prepare", ...invite })
    .then((result) => {
      if (!result?.ok) reportFailure(result?.error ?? "Could not join");
    })
    .catch(() => reportFailure("The extension could not prepare this invite"));
}

function reportFailure(error: string): void {
  document.documentElement.dataset.jellyPartyError = error;
  window.postMessage({ type: "jelly-party:result", ok: false, error }, "*");
}
