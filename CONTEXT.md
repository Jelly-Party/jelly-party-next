# Jelly Party

Jelly Party lets people form temporary watch parties that synchronize video playback and provide text chat without requiring accounts.

## Language

**Party**:
A temporary group whose peers share chat and synchronize playback.
_Avoid_: Room, session

**Peer**:
One connected browser participant in a party. One person can create more than one peer by joining from multiple browser contexts.
_Avoid_: User, member

**Launch-supported service**:
A streaming service that passes the two-peer create, join, play, pause, seek, and chat contract on the current versions of Chrome, Firefox, and Edge.
_Avoid_: Supported service

**Best-effort service**:
A streaming service expected to work through generic video behavior but not currently verified against the launch-support contract.
_Avoid_: Supported service

**Playback intent**:
The complete desired playback state shared between peers: whether playback is paused and its position relative to the end.
_Avoid_: Video command, playback event
