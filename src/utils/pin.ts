/** The same quick checks the server makes on a pickup PIN, so most mistakes are caught before sending. */
export function pinProblem(pin: string, confirm?: string): string | null {
  if (!/^\d{6}$/.test(pin)) return 'Enter 6 digits.';
  if (/^(\d)\1{5}$/.test(pin) || ['123456', '654321', '012345', '123123', '112233', '121212', '123321'].includes(pin)) return 'That PIN is too easy to guess. Choose a different one.';
  if (confirm !== undefined && pin !== confirm) return "The two PINs don't match.";
  return null;
}

export const digitsOnly = (value: string) => value.replace(/\D/g, '').slice(0, 6);
