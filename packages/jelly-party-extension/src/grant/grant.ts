import "virtual:uno.css";
import { parseMagicLink } from "jelly-party-lib";
import "../sidebar/style.css";

const invite = parseMagicLink(location.href);
const tabId = Number.parseInt(new URLSearchParams(location.search).get("tab") ?? "", 10);
const allow = document.querySelector<HTMLButtonElement>("#allow")!;
const description = document.querySelector<HTMLElement>("#description")!;
const status = document.querySelector<HTMLElement>("#status")!;

if (!invite) {
  description.textContent = "This invite is incomplete or unsafe. Ask your friend for a new link.";
} else {
  const { hostname } = new URL(invite.destination);
  description.textContent = `Jelly Party needs access to ${hostname} to keep the video in sync with your friends.`;
  allow.disabled = false;
}

allow.addEventListener("click", () => {
  if (!invite) return;
  allow.disabled = true;
  status.textContent = "Waiting for the browser…";
  // Requested straight from the click: this is the only Jelly Party context that
  // has both the permission API and a user gesture.
  void chrome.permissions
    .request({ origins: [invite.originPattern] })
    .then(async (granted) => {
      if (!granted) {
        allow.disabled = false;
        status.textContent = "Jelly Party needs that access to join the party.";
        return;
      }
      status.textContent = "Opening the shared video…";
      await chrome.runtime.sendMessage({ type: "join:granted", ...invite, tabId });
      window.close();
    })
    .catch(() => {
      allow.disabled = false;
      status.textContent = "The browser did not answer. Please try again.";
    });
});
