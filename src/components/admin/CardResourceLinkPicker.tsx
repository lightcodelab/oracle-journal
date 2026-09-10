import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Check, ChevronsUpDown, X } from 'lucide-react';
import { fetchLinkableResources, linkKey, type LinkableKind, type LinkableResource } from '@/lib/cardResourceLinks';

export interface SelectedLink {
  kind: LinkableKind;
  id: string;
}

interface Props {
  value: SelectedLink[];
  onChange: (links: SelectedLink[]) => void;
}

const CardResourceLinkPicker = ({ value, onChange }: Props) => {
  const [resources, setResources] = useState<LinkableResource[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    fetchLinkableResources().then((r) => {
      if (active) {
        setResources(r);
        setLoading(false);
      }
    });
    return () => { active = false; };
  }, []);

  const byKey = useMemo(() => {
    const map = new Map<string, LinkableResource>();
    resources.forEach((r) => map.set(linkKey(r.kind, r.id), r));
    return map;
  }, [resources]);

  const selectedKeys = new Set(value.map((v) => linkKey(v.kind, v.id)));

  const toggle = (r: LinkableResource) => {
    const key = linkKey(r.kind, r.id);
    if (selectedKeys.has(key)) {
      onChange(value.filter((v) => linkKey(v.kind, v.id) !== key));
    } else {
      onChange([...value, { kind: r.kind, id: r.id }]);
    }
  };

  return (
    <div className="space-y-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" role="combobox" className="w-full justify-between">
            {loading ? 'Loading resources…' : 'Search and add a resource…'}
            <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
          <Command>
            <CommandInput placeholder="Search by name…" />
            <CommandList className="max-h-72">
              <CommandEmpty>No resources found.</CommandEmpty>
              <CommandGroup>
                {resources.map((r) => {
                  const key = linkKey(r.kind, r.id);
                  return (
                    <CommandItem key={key} value={`${r.title} ${r.typeLabel}`} onSelect={() => toggle(r)}>
                      <Check className={`mr-2 h-4 w-4 ${selectedKeys.has(key) ? 'opacity-100' : 'opacity-0'}`} />
                      <span className="flex-1">{r.title}</span>
                      <span className="text-xs text-muted-foreground ml-2">{r.typeLabel}</span>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {value.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {value.map((v) => {
            const r = byKey.get(linkKey(v.kind, v.id));
            return (
              <Badge key={linkKey(v.kind, v.id)} variant="secondary" className="gap-1">
                {r?.title || 'Unknown resource'}
                <button
                  type="button"
                  onClick={() => onChange(value.filter((x) => linkKey(x.kind, x.id) !== linkKey(v.kind, v.id)))}
                  className="ml-1 hover:text-destructive"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default CardResourceLinkPicker;
