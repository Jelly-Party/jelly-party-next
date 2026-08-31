import type {} from "./vite-env.d.ts";
import "virtual:uno.css";
import "./style.css";
import { parseMagicLink } from "jelly-party-lib";

const invite = parseMagicLink(window.location.href);
const button = document.querySelector<HTMLButtonElement>("#join")!;
const description = document.querySelector<HTMLElement>("#description")!;
const status = document.querySelector<HTMLElement>("#status")!;
const install = document.querySelector<HTMLElement>("#install")!;
install.setAttribute("href", __JELLY_WEBSITE_URL__);
let extensionAvailable = document.documentElement.dataset.jellyPartyExtension === "installed";
const startupError = document.documentElement.dataset.jellyPartyError;

if (!invite) {
  description.textContent = "This invite is incomplete or unsafe. Ask your friend for a new link.";
  status.textContent = "Invalid invite link";
} else {
  description.textContent = `Jelly Party will request access to ${new URL(invite.destination).hostname}, then open the shared video.`;
  button.disabled = true;
  if (extensionAvailable) status.textContent = "Opening Jelly Party…";
}

window.addEventListener("message", (event) => {
  if (event.source !== window || !event.data) return;
  if (event.data.type === "jelly-party:available") {
    extensionAvailable = true;
    button.disabled = true;
    if (invite) status.textContent = "Opening Jelly Party…";
  }
  if (event.data.type === "jelly-party:result" && event.data.ok === false) {
    button.disabled = true;
    status.textContent = event.data.error ?? "Could not join. Please try again.";
  }
});

if (startupError) status.textContent = startupError;

setTimeout(() => {
  if (!extensionAvailable && invite) {
    description.textContent = "Install Jelly Party, then open this invite again.";
    status.textContent = "Extension not detected";
    install.classList.remove("hidden");
  }
}, 750);
