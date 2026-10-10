export const SAVINGS_TAGLINE = "Spend on what matters. Save the rest.";
export const LAUNCH_HOLD_MS = 1600;

export function launchHoldTime(reduceMotion: boolean) {
  return reduceMotion ? 0 : LAUNCH_HOLD_MS;
}
