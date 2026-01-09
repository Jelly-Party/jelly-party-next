import { mount } from "svelte";
import Chat from "./Chat.svelte";
import "./chat.css";

const app = mount(Chat, {
	target: document.getElementById("chat") as HTMLElement,
});

export default app;
