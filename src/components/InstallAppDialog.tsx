import { useState, createContext, useContext, ReactNode } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import HomeScreenInstructions from "@/components/temple/HomeScreenInstructions";

const INSTALL_DIALOG_KEY = "install-app-dialog-dismissed";

interface InstallAppContextType {
  openInstallDialog: () => void;
}

const InstallAppContext = createContext<InstallAppContextType>({
  openInstallDialog: () => {},
});

export const useInstallApp = () => useContext(InstallAppContext);

export const InstallAppProvider = ({ children }: { children: ReactNode }) => {
  const [open, setOpen] = useState(false);

  // The install dialog is strictly member-initiated. Members open it from the
  // profile dropdown ("Add App Icon to Phone"). It shares one set of Home
  // Screen instructions with the top banner and Orientation.

  const handleDismiss = () => {
    localStorage.setItem(INSTALL_DIALOG_KEY, "true");
    setOpen(false);
  };

  const openInstallDialog = () => setOpen(true);

  return (
    <InstallAppContext.Provider value={{ openInstallDialog }}>
      {children}
      <Dialog open={open} onOpenChange={(v) => { if (!v) handleDismiss(); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg">Add THE TEMPLE to your Home Screen</DialogTitle>
            <DialogDescription>
              Keep THE TEMPLE of Sustainment one tap away on your phone or tablet.
            </DialogDescription>
          </DialogHeader>

          <HomeScreenInstructions className="mt-2" />

          <Button onClick={handleDismiss} className="w-full mt-4">
            Got it!
          </Button>
        </DialogContent>
      </Dialog>
    </InstallAppContext.Provider>
  );
};

export default InstallAppProvider;
