# Magic-link join flow prototype

PROTOTYPE — throw this away after the decision is captured.

This prototype asks whether one join state machine can keep the magic-link handoff low-friction and recoverable across Chrome, Edge, and Firefox while respecting two browser constraints: the toolbar action opens the sidebar, and optional origin access is requested by an explicit action inside the sidebar.

Run it with:

```sh
vp run prototype:join
```

Drive the happy path and then deliberately deny permission, fail navigation, fail the party connection, and close the sidebar at different points. The full state and currently legal actions are rendered after every keypress.
