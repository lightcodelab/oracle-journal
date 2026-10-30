import { describe, it, expect } from 'vitest';
import { DOOR_SECTIONS, locationDoor, placementLabel, locationPath } from './doorSections';
describe('Door section placement', () => {
  it('keeps Phase 1 in Remembrance with three ordered sections', () => {
    expect(DOOR_SECTIONS.remembrance.chamber).toBe('PHASE 1: REVEAL');
    expect(DOOR_SECTIONS.remembrance.sections.map(s => s.title)).toEqual(['Draw your Mirror', 'Investigate the Pattern', 'Open a Case File']);
  });
  it('keeps Phase 2 in Devotion with four ordered sections', () => {
    expect(DOOR_SECTIONS.devotion.chamber).toBe('PHASE 2: REGULATE');
    expect(DOOR_SECTIONS.devotion.sections.map(s => s.title)).toEqual(['Restore Your Body', 'Settle Your Nervous System', 'Stabilise the Pattern', 'File Your Evidence']);
  });
  it('keeps Phase 3 in Becoming with three ordered sections', () => {
    expect(DOOR_SECTIONS.becoming.chamber).toBe('PHASE 3: INVESTIGATE');
    expect(DOOR_SECTIONS.becoming.sections.map(s => s.title)).toEqual(['Build your new pattern', 'Shift your Energetic Signature', 'File your Evidence']);
  });
  it('retains the correct Door for existing course and rite locations', () => {
    expect(locationDoor({id:'a',name:'Courses',slug:'loc-remembrance-courses',page:'remembrance'})).toBe('becoming');
    expect(locationDoor({id:'b',name:'Rites',slug:'loc-rites-of-remembrance',page:'remembrance'})).toBe('devotion');
  });
  it('distinguishes identically named evidence sections by Door', () => {
    expect(placementLabel({id:'a',name:'File Your Evidence',page:'devotion'})).toBe('The Door of Devotion — File Your Evidence');
    expect(placementLabel({id:'b',name:'File your Evidence',page:'becoming'})).toBe('The Door of Becoming — File your Evidence');
  });
  it('opens every new placement through its own Door', () => {
    for (const [door, item] of Object.entries(DOOR_SECTIONS)) {
      for (const section of item.sections) {
        expect(locationPath({ id: section.slug, name: section.title, slug: section.slug })).toBe(`/${door}`);
      }
    }
  });
});