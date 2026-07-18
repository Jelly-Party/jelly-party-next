// oxlint-disable-next-line typescript/triple-slash-reference -- Staged-file checks need the virtual CSS declaration in scope.
/// <reference path="./vite-env.d.ts" />

import "virtual:uno.css";
import { parseMagicLink } from "jelly-party-lib";

const invite = parseMagicLink(window.location.href);
const button = document.querySelector<HTMLButtonElement>("#join")!;
const description = document.querySelector<HTMLElement>("#description")!;
const status = document.querySelector<HTMLElement>("#status")!;
const install = document.querySelector<HTMLElement>("#install")!;
let extensionAvailable = document.documentElement.dataset.jellyPartyExtension === "installed";

if (!invite) {
  description.textContent = "This invite is incomplete or unsafe. Ask your friend for a new link.";
  status.textContent = "Invalid invite link";
} else {
  description.textContent = `Jelly Party will request access to ${new URL(invite.destination).hostname}, then open the shared video.`;
  button.disabled = !extensionAvailable;
}

window.addEventListener("message", (event) => {
  if (event.source !== window || !event.data) return;
  if (event.data.type === "jelly-party:available") {
    extensionAvailable = true;
    button.disabled = !invite;
    status.textContent = "Jelly Party is ready.";
  }
  if (event.data.type === "jelly-party:result" && event.data.ok === false) {
    button.disabled = false;
    status.textContent = event.data.error ?? "Could not join. Please try again.";
  }
  if (event.data.type === "jelly-party:result" && event.data.ok === true) {
    status.textContent = event.data.sidebarOpened
      ? "Opening the shared video…"
      : "When the video opens, click the Jelly Party toolbar button once.";
  }
});

button.addEventListener("click", () => {
  button.disabled = true;
  status.textContent = "Opening the shared video…";
  window.postMessage({ type: "jelly-party:join" }, "*");
});

setTimeout(() => {
  if (!extensionAvailable && invite) {
    description.textContent = "Install Jelly Party, then open this invite again.";
    status.textContent = "Extension not detected";
    install.classList.remove("hidden");
  }
}, 750);
