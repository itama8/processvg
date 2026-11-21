import { identityRow, placeIdentity } from "./instrument-ink.mjs";

export function driveIdentity(label, center, size) {
  return { ...placeIdentity(identityRow(label, size), center), rotateAnchor: true };
}
