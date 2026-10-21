export const DOOR_SECTIONS = {
  remembrance: { name: 'The Door of Remembrance', phase: 'PHASE 1: REVEAL', sections: [
    { slug: 'loc-remembrance-draw-your-mirror', title: 'Draw your Mirror' },
    { slug: 'loc-remembrance-investigate-the-pattern', title: 'Investigate the Pattern' },
    { slug: 'loc-remembrance-open-a-case-file', title: 'Open a Case File' },
  ] },
  devotion: { name: 'The Door of Devotion', phase: 'PHASE 2: REGULATE', sections: [
    { slug: 'loc-devotion-restore-your-body', title: 'Restore Your Body' },
    { slug: 'loc-devotion-settle-your-nervous-system', title: 'Settle Your Nervous System' },
    { slug: 'loc-devotion-stabilise-the-pattern', title: 'Stabilise the Pattern' },
    { slug: 'loc-devotion-file-your-evidence', title: 'File Your Evidence' },
  ] },
  becoming: { name: 'The Door of Becoming', phase: 'PHASE 3: RESHAPE', sections: [
    { slug: 'loc-becoming-build-your-new-pattern', title: 'Build your new pattern' },
    { slug: 'loc-becoming-shift-your-energetic-signature', title: 'Shift your Energetic Signature' },
    { slug: 'loc-becoming-file-your-evidence', title: 'File your Evidence' },
  ] },
} as const;
export type PracticeDoor = keyof typeof DOOR_SECTIONS;
export interface PlacementLocation { id: string; name: string; slug?: string; page?: string | null }
export function locationDoor(location: PlacementLocation): string {
  for (const door of Object.keys(DOOR_SECTIONS)) {
    if (location.slug?.startsWith(`loc-${door}-`) && location.slug !== 'loc-remembrance-courses') return door;
  }
  if (location.slug === 'loc-deepening-courses') return 'remembrance';
  if (location.slug === 'loc-remembrance-courses') return 'becoming';
  if (location.slug === 'loc-rites-of-remembrance') return 'devotion';
  return location.page || 'devotion';
}
export function placementLabel(location: PlacementLocation): string {
  const door = locationDoor(location);
  const name = door in DOOR_SECTIONS ? DOOR_SECTIONS[door as PracticeDoor].name : 'The Door of Communion';
  return `${name} — ${location.name}`;
}

export function locationPath(location?: PlacementLocation | null): string {
  return `/${location ? locationDoor(location) : 'devotion'}`;
}