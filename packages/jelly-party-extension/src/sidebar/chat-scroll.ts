export interface ScrollMeasurements {
  scrollTop: number;
  clientHeight: number;
  scrollHeight: number;
}

const attachmentThreshold = 24;

export function isChatAttached(measurements: ScrollMeasurements): boolean {
  const distanceFromBottom =
    measurements.scrollHeight - measurements.clientHeight - measurements.scrollTop;
  return distanceFromBottom <= attachmentThreshold;
}
