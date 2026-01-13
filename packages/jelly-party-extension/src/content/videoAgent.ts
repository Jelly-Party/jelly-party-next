import { createLogger } from "jelly-party-lib";
import { videoController } from "../lib/sync/VideoController";

const log = createLogger("videoAgent");

// Initialize
log.info("VideoAgent starting", { url: window.location.href });

// Listen for video detection updates
videoController.onVideoChange((video) => {
	log.info("Video changed", { hasVideo: !!video });
	advertise();
});

// Start detection immediately
videoController.start();

// Forward local events to manager
videoController.onLocalPlay((timeFromEnd) => {
	postToManager({
		type: "jellyparty:localVideoEvent",
		event: "play",
		timeFromEnd,
	});
});

videoController.onLocalPause((timeFromEnd) => {
	postToManager({
		type: "jellyparty:localVideoEvent",
		event: "pause",
		timeFromEnd,
	});
});

videoController.onLocalSeek((timeFromEnd) => {
	postToManager({
		type: "jellyparty:localVideoEvent",
		event: "seek",
		timeFromEnd,
	});
});

// Listen for commands from manager
window.addEventListener("message", (event) => {
	const msg = event.data;
	if (!msg || typeof msg !== "object") return;

	// Only accept messages from manager (which is in top frame)
	// We could verify origin, but for now "*" is used.

	if (msg.type === "jellyparty:executeCommand") {
		const { command, timeFromEnd } = msg;
		log.debug("Received command", { command, timeFromEnd });

		switch (command) {
			case "play":
				videoController.play(timeFromEnd);
				break;
			case "pause":
				videoController.pause(timeFromEnd);
				break;
			case "seek":
				videoController.seek(timeFromEnd);
				break;
		}
	} else if (msg.type === "jellyparty:ping") {
		// Manager asking for status
		advertise();
	}
});

function advertise() {
	const video = videoController.getVideo();
	if (!video) return;

	postToManager({
		type: "jellyparty:videoAdvertise",
		hasVideo: true,
		url: window.location.href,
		duration: video.duration,
		width: video.offsetWidth,
		height: video.offsetHeight,
	});
}

function postToManager(msg: object) {
	// Send to top window (where manager lives)
	window.top?.postMessage(msg, "*");
}

// Initial advertise
advertise();
