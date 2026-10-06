import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { RitualAddItem } from "@/lib/rituals";
import { useAddToRitual } from "./AddToRitualProvider";

/** Round "+" for thumbnails. Separate control: never opens the item itself. */
export function AddToRitualPlus({ item, className = "" }: { item: RitualAddItem; className?: string }) {
  const { open, canAdd } = useAddToRitual();
  if (!canAdd) return null;
  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            aria-label={`Add ${item.name} to Ritual`}
            onClick={(e) => { e.stopPropagation(); e.preventDefault(); open(item, e.currentTarget); }}
            onKeyDown={(e) => e.stopPropagation()}
            className={`h-11 w-11 shrink-0 rounded-full bg-background/90 text-foreground border border-border shadow-sm flex items-center justify-center hover:bg-background hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${className}`}
          >
            <Plus className="h-5 w-5" aria-hidden />
          </button>
        </TooltipTrigger>
        <TooltipContent>Add to Ritual</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/** Labelled secondary action for detail pages. */
export function AddToRitualAction({ item, className }: { item: RitualAddItem; className?: string }) {
  const { open, canAdd } = useAddToRitual();
  if (!canAdd) return null;
  return (
    <Button type="button" variant="outline" size="sm" className={className} onClick={(e) => open(item, e.currentTarget)}>
      <Plus className="h-4 w-4 mr-1" aria-hidden /> Add to Ritual
    </Button>
  );
}
