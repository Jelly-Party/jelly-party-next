# Research in-place store update requirements

Type: research
Status: resolved

## Question

What current Chrome Web Store, Firefox AMO, and Edge Add-ons requirements must the in-place MV2-to-MV3 packages, metadata, permissions, privacy declarations, reviewer instructions, and release timing satisfy?

## Answer

Update the three existing store products with separate MV3 packages, preserving each store identity—especially the current Firefox Gecko add-on ID—and using a version higher than every prior submission. Keep permissions minimal, package all executable code, replace legacy listing assets and declarations, provide a subscription-free reviewer flow, and attach reproducible source/build instructions for Firefox. Chrome can be reviewed under deferred publication and supports rollback; Firefox supports rollback but has no documented staged/percentage release; Edge should be assumed to publish immediately after certification and needs a higher-version forward fix for recovery. Allow a few weeks for Chrome's currently elevated review queue and seven business days for Edge. The full cited requirements and submission checklist are in [In-place MV2 → MV3 store update requirements](../research/store-update-requirements.md).
