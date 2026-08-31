export type VideoControllerInjection = (allFrames: boolean) => Promise<void>;

/**
 * The main frame decides whether the tab is accessible. Chrome rejects an
 * all-frame injection when even one cross-origin frame is inaccessible, so an
 * optional embedded player must never hide a usable top-level video.
 */
export async function injectVideoController(inject: VideoControllerInjection): Promise<boolean> {
  try {
    await inject(false);
  } catch {
    return false;
  }

  try {
    await inject(true);
  } catch {
    // The main frame is already instrumented. Other frames are best-effort.
  }
  return true;
}
