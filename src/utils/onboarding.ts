// Remembers, while the app is open, that a school was just registered
// here — so the administrator is taken to Subscription to choose a plan
// (free trial or pay) instead of stopping at the dashboard.
let registered = false;

export const markJustRegistered = () => { registered = true; };
/** True once, right after registering. */
export function takeJustRegistered(): boolean {
  const value = registered;
  registered = false;
  return value;
}
