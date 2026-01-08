import { mount } from "svelte";
import Popup from "./Popup.svelte";
import "./popup.css";

const app = mount(Popup, {
	target: document.getElementById("popup")!,
});

export default app;
