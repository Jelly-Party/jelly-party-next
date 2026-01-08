import browser from "webextension-polyfill";

browser.runtime.onInstalled.addListener(() => {
	console.log("Jelly Party extension installed!");
});

// Handle extension icon click
browser.action.onClicked.addListener(async (tab) => {
	if (tab.id) {
		// Will inject content script to initialize party on video pages
		console.log("Extension clicked on tab:", tab.id);
	}
});

export {};
