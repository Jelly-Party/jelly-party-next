/**
 * FAQ data for Jelly Party - shared between extension and website
 */

export interface FAQItem {
	id: string;
	question: string;
	answer: string;
}

export const faqItems: FAQItem[] = [
	{
		id: "join-party",
		question: "How do I join a party?",
		answer:
			"Simply open the magic link your friend sent you. The extension will automatically open the video and join the party!",
	},
	{
		id: "start-party",
		question: "How do I start a party?",
		answer:
			"Open a video on any website, open Jelly Party, and click 'Start a new party'. Then copy and share the link with friends.",
	},
	{
		id: "video-not-syncing",
		question: "Video not syncing?",
		answer:
			"Make sure everyone is watching the exact same video URL. We sync play/pause/seek, but you must manually navigate to the same video page first.",
	},
	{
		id: "cant-see-friends",
		question: "Can't see friends?",
		answer:
			"Ensure everyone has the Jelly Party extension installed and clicked the same magic link. You should see their names in the peer list.",
	},
	{
		id: "manual-join",
		question: "Magic link not working?",
		answer:
			"If the link doesn't open the extension, ask the host for the 'Party ID'. You can paste it manually in the 'Join Party by Id' box.",
	},
	{
		id: "privacy",
		question: "Is my data private?",
		answer:
			"Yes! We don't store personal data or chat history. Messages are relayed directly between friends. Our code is 100% open source.",
	},
];
