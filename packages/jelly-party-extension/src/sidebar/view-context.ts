export function shouldFollowTabActivation(
  isContextualPanel: boolean,
  sidebarWindowId: number | null,
  activatedWindowId: number,
): boolean {
  return !isContextualPanel && sidebarWindowId === activatedWindowId;
}
