import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

interface PurchaseVerificationProps {
  deckId: string | null;
  deckName: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const PurchaseVerification = ({
  deckId,
  deckName,
  isOpen,
  onClose,
  onSuccess,
}: PurchaseVerificationProps) => {
  const [email, setEmail] = useState("");
  const [isPremium, setIsPremium] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleVerify = async () => {
    if (!email || !deckId) {
      toast({
        title: "Error",
        description: "Please enter your email address",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('verify-woocommerce-purchase', {
        body: { email, deckId, isPremium },
      });

      if (error) throw error;

      if (data.verified) {
        toast({
          title: "Success!",
          description: "Purchase verified. You now have access to this deck!",
        });
        onSuccess();
        onClose();
      } else {
        toast({
          title: "Purchase not found",
          description: "No purchase found for this deck with the provided email. Please check your email or contact support.",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error('Verification error:', error);
      toast({
        title: "Verification failed",
        description: error.message || "Failed to verify purchase. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Verify Purchase for {deckName}</DialogTitle>
          <DialogDescription>
            Enter the email address you used when purchasing this deck from our store, and select which version you purchased.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="verify-email">Email Address</Label>
            <Input
              id="verify-email"
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Version Purchased</Label>
            <div className="flex gap-4">
              <Button
                type="button"
                variant={!isPremium ? "default" : "outline"}
                className="flex-1"
                onClick={() => setIsPremium(false)}
              >
                Digital Version
              </Button>
              <Button
                type="button"
                variant={isPremium ? "default" : "outline"}
                className="flex-1"
                onClick={() => setIsPremium(true)}
              >
                Premium Version
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Premium includes embodiment content and guided meditations
            </p>
          </div>

          <Button
            onClick={handleVerify}
            disabled={loading || !email}
            className="w-full"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Verifying...
              </>
            ) : (
              "Verify Purchase"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};