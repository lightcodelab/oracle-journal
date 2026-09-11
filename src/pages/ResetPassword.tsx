import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { Eye, EyeOff } from "lucide-react";
import templeBannerAsset from "@/assets/homepage-banner.webp.asset.json";
const templeBanner = templeBannerAsset.url;

const ResetPassword = () => {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isRecovery, setIsRecovery] = useState(false);
  const [done, setDone] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    // Recovery links arrive with type=recovery in the URL hash
    if (window.location.hash.includes("type=recovery")) {
      setIsRecovery(true);
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setIsRecovery(true);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast({
        title: "Passwords don't match",
        description: "Please make sure both passwords are the same.",
        variant: "destructive",
      });
      return;
    }

    const passwordErrors: string[] = [];
    if (password.length < 8) passwordErrors.push("at least 8 characters");
    if (!/[A-Z]/.test(password)) passwordErrors.push("an uppercase letter");
    if (!/[a-z]/.test(password)) passwordErrors.push("a lowercase letter");
    if (!/[0-9]/.test(password)) passwordErrors.push("a number");
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) passwordErrors.push("a special character (!@#$%^&*)");

    if (passwordErrors.length > 0) {
      toast({
        title: "Password requirements not met",
        description: `Password must include: ${passwordErrors.join(", ")}`,
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
      } else {
        setDone(true);
        toast({
          title: "Password updated",
          description: "Your password has been changed successfully.",
        });
        setTimeout(() => navigate("/temple", { replace: true }), 1500);
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-8">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="mb-4"
          >
            <img
              src={templeBanner}
              alt="Temple of Sustainment"
              className="w-full h-32 sm:h-40 object-cover object-center rounded-lg"
            />
          </motion.div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Choose a New Password</CardTitle>
            <CardDescription>Enter a new password for your account</CardDescription>
          </CardHeader>
          <CardContent>
            {!isRecovery && !done ? (
              <div className="space-y-4 text-center">
                <p className="text-sm text-foreground/70 leading-relaxed">
                  This reset link is invalid or has expired. Please request a new one.
                </p>
                <Button
                  type="button"
                  className="w-full"
                  onClick={() => navigate("/auth")}
                >
                  Back to sign in
                </Button>
              </div>
            ) : done ? (
              <p className="text-sm text-foreground/80 text-center leading-relaxed">
                Your password has been updated. Taking you back to THE TEMPLE…
              </p>
            ) : (
              <form onSubmit={handleUpdatePassword} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="new-password">New Password</Label>
                  <div className="relative">
                    <Input
                      id="new-password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={8}
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-password">Confirm New Password</Label>
                  <Input
                    id="confirm-password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    minLength={8}
                  />
                </div>
                <div className="text-xs text-foreground/60 space-y-0.5">
                  <p>Password must contain:</p>
                  <ul className="list-disc list-inside ml-1 space-y-0.5">
                    <li>At least 8 characters</li>
                    <li>An uppercase letter (A-Z)</li>
                    <li>A lowercase letter (a-z)</li>
                    <li>A number (0-9)</li>
                    <li>A special character (!@#$%^&*)</li>
                  </ul>
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Updating..." : "Update Password"}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default ResetPassword;
