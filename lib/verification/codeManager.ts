/** Formats a 3-digit verification code as the display string users add to their Sleeper display name. */
export function formatVerificationCode(digits: string): string {
  return `BOB${digits}`;
}
