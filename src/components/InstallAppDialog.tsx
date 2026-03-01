import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Apple, Smartphone, X } from "lucide-react";

const INSTALL_DIALOG_KEY = "install-app-dialog-dismissed";

const InstallAppDialog = () => {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    // Only show if not previously dismissed and on mobile
    const dismissed = localStorage.getItem(INSTALL_DIALOG_KEY);
    if (dismissed) return;

    // Small delay so it doesn't flash immediately
    const timer = setTimeout(() => setOpen(true), 2000);
    return () => clearTimeout(timer);
  }, []);

  const handleDismiss = () => {
    localStorage.setItem(INSTALL_DIALOG_KEY, "true");
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleDismiss(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg">Install the App on Your Phone</DialogTitle>
          <DialogDescription>
            Add The Temple of Sustainment to your home screen for quick access — just like a real app!
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="iphone" className="mt-2">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="iphone" className="gap-1.5">
              <Apple className="h-4 w-4" /> iPhone
            </TabsTrigger>
            <TabsTrigger value="android" className="gap-1.5">
              <Smartphone className="h-4 w-4" /> Android
            </TabsTrigger>
          </TabsList>

          <TabsContent value="iphone" className="mt-4 space-y-3 text-sm text-foreground/80">
            <ol className="list-decimal list-inside space-y-2">
              <li>Open this website in <strong>Safari</strong></li>
              <li>
                Tap the <strong>Share</strong> button{" "}
                <span className="inline-block align-middle">
                  <svg className="inline h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
                    <polyline points="16 6 12 2 8 6" />
                    <line x1="12" y1="2" x2="12" y2="15" />
                  </svg>
                </span>{" "}
                at the bottom of the screen
              </li>
              <li>Scroll down and tap <strong>"Add to Home Screen"</strong></li>
              <li className="italic text-muted-foreground">Click the three dots "More" button if the full menu isn't showing.</li>
              <li>Tap <strong>"Add"</strong> in the top right corner</li>
            </ol>
            <p className="text-xs text-muted-foreground">The app icon will appear on your home screen.</p>
          </TabsContent>

          <TabsContent value="android" className="mt-4 space-y-3 text-sm text-foreground/80">
            <ol className="list-decimal list-inside space-y-2">
              <li>Open this website in <strong>Chrome</strong></li>
              <li>
                Tap the <strong>three-dot menu</strong>{" "}
                <span className="inline-block align-middle font-bold tracking-tighter">⋮</span>{" "}
                in the top right corner
              </li>
              <li>Tap <strong>"Add to Home screen"</strong></li>
              <li>Tap <strong>"Add"</strong> to confirm</li>
            </ol>
            <p className="text-xs text-muted-foreground">The app icon will appear on your home screen.</p>
          </TabsContent>
        </Tabs>

        <Button onClick={handleDismiss} className="w-full mt-4">
          Got it!
        </Button>
      </DialogContent>
    </Dialog>
  );
};

export default InstallAppDialog;
