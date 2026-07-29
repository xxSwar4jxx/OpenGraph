/**
 * Module-level (non-React) registry of expression-id -> <input> element.
 * The scientific keyboard needs direct DOM access to read/set
 * `selectionStart`/`selectionEnd` on whichever input the user was last
 * editing, which is awkward to thread through React state without
 * causing re-renders on every keystroke.
 */
const registry = new Map<string, HTMLInputElement>();

export function registerInput(id: string, el: HTMLInputElement | null) {
  if (el) registry.set(id, el);
  else registry.delete(id);
}

export function getInputEl(id: string | null): HTMLInputElement | null {
  if (!id) return null;
  return registry.get(id) ?? null;
}
