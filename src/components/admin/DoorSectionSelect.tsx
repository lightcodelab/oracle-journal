import { useEffect, useId, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DOOR_SECTIONS, locationDoor, type PlacementLocation } from '@/lib/doorSections';

export function DoorSectionSelect({ value, onChange, optional = false }: { value: string | null; onChange: (value: string) => void; optional?: boolean }) {
  const id = useId();
  const [locations, setLocations] = useState<PlacementLocation[]>([]);
  const [chosenDoor, setChosenDoor] = useState<string | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    void supabase.from('content_categories').select('id,name,slug,page').eq('type', 'location').eq('active', true).order('display_order').then(({ data, error }) => {
      setError(!!error);
      setLocations(data || []);
    });
  }, []);
  const current = locations.find(l => l.id === value);
  const door = current ? locationDoor(current) : chosenDoor ?? 'none';
  const sectionSlugs = Object.values(DOOR_SECTIONS).flatMap(item => item.sections.map(section => section.slug));
  return <div className="grid gap-3 sm:grid-cols-2">
    <div className="space-y-2">
      <Label htmlFor={`${id}-door`}>Door{!optional && ' *'}</Label>
      <Select value={door} onValueChange={next => { setChosenDoor(next); onChange(''); }}>
        <SelectTrigger id={`${id}-door`}><SelectValue placeholder="Choose a Door" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="none">{optional ? 'No placement / keep existing default' : 'Choose a Door'}</SelectItem>
          {Object.entries(DOOR_SECTIONS).map(([key, item]) => <SelectItem key={key} value={key}>{item.phase} · {item.name}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
    <div className="space-y-2">
      <Label htmlFor={`${id}-section`}>Section{!optional && ' *'}</Label>
      <Select value={value || 'none'} disabled={door === 'none'} onValueChange={next => onChange(next === 'none' ? '' : next)}>
        <SelectTrigger id={`${id}-section`}><SelectValue placeholder="Choose a section" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="none">Choose a section</SelectItem>
          {locations.filter(l => locationDoor(l) === door && (sectionSlugs.some(slug => slug === l.slug) || l.id === value)).map(l => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
    {error && <p className="text-sm text-destructive sm:col-span-2">Unable to load sections. Please reopen the editor.</p>}
  </div>;
}