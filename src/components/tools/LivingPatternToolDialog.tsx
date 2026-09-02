import { useEffect, useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import LivingPatternPause from "@/pages/LivingPatternPause";
import LivingPatternPresence from "@/pages/LivingPatternPresence";
import LivingPatternPractice from "@/pages/LivingPatternPractice";

type Lens = "pause" | "perceive" | "practice";

interface LivingPatternToolDialogProps {
  lens: Lens | null;
  open: boolean;
  onClose: () => void;
}

/**
 * Shows the Living Pattern lenses (the /living-pattern page content) inside a
 * dialog, matching how other tracking tools open on a course page.
 */
export const LivingPatternToolDialog = ({ lens, open, onClose }: LivingPatternToolDialogProps) => {
  const [active, setActive] = useState<Lens>(lens ?? "pause");

  useEffect(() => {
    if (open && lens) setActive(lens);
  }, [open, lens]);

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <div className="space-y-4">
          <Button variant="ghost" size="sm" onClick={onClose}>
            ← Back to the course
          </Button>
          <hr className="border-border" />
        </div>

        <div className="space-y-3 pt-2">
          <p className="text-[0.7rem] tracking-[0.2em] uppercase text-primary">
            Your Living Pattern
          </p>
          <h1 className="font-serif text-3xl">Pause, Perceive, Practice</h1>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Three lenses, one private place. They are not steps and not a
            sequence — open whichever one meets the moment you are in.
          </p>

          <Tabs value={active} onValueChange={(v) => setActive(v as Lens)} className="mt-4">
            <TabsList className="w-full grid grid-cols-3 bg-primary text-primary-foreground">
              <TabsTrigger value="pause" className="text-primary-foreground/90 data-[state=active]:bg-primary-foreground data-[state=active]:text-primary">
                Pause
              </TabsTrigger>
              <TabsTrigger value="perceive" className="text-primary-foreground/90 data-[state=active]:bg-primary-foreground data-[state=active]:text-primary">
                Perceive
              </TabsTrigger>
              <TabsTrigger value="practice" className="text-primary-foreground/90 data-[state=active]:bg-primary-foreground data-[state=active]:text-primary">
                Practice
              </TabsTrigger>
            </TabsList>
            <TabsContent value="pause" className="mt-6">
              <LivingPatternPause embedded />
            </TabsContent>
            <TabsContent value="perceive" className="mt-6">
              <LivingPatternPresence embedded />
            </TabsContent>
            <TabsContent value="practice" className="mt-6">
              <LivingPatternPractice embedded />
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
};
