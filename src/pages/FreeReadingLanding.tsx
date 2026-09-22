import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Sparkles } from "lucide-react";
import spreadsImage from "@/assets/sacred-spreads-temple.jpg";
import cardBacksCollage from "@/assets/free-reading-card-backs-collage.jpg";

const SPREAD_PATH = "/remembrance/spreads";

const FreeReadingLanding = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [newsletter, setNewsletter] = useState(true);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    document.title = "Your free card reading | THE TEMPLE of Sustainment";
    const description =
      "Create a free account and receive one Past, Present, Future card reading, written for the exact cards drawn for you.";
    let meta = document.querySelector('meta[name="description"]');
    if (!meta) {
      meta = document.createElement("meta");
      meta.setAttribute("name", "description");
      document.head.appendChild(meta);
    }
    meta.setAttribute("content", description);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast({ title: "Almost there", description: "Please add your email and a password.", variant: "destructive" });
      return;
    }

    const missing: string[] = [];
    if (password.length < 8) missing.push("at least 8 characters");
    if (!/[A-Z]/.test(password)) missing.push("an uppercase letter");
    if (!/[a-z]/.test(password)) missing.push("a lowercase letter");
    if (!/[0-9]/.test(password)) missing.push("a number");
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) missing.push("a special character (!@#$%^&*)");
    if (missing.length > 0) {
      toast({
        title: "Password requirements not met",
        description: `Password must include: ${missing.join(", ")}`,
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { data: guard } = await supabase.functions.invoke("signup-guard", { body: { email } });
      if (guard && guard.allowed === false) {
        toast({
          title: "We can't create that account",
          description: guard.message || "Please use a personal or work email address.",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}${SPREAD_PATH}`,
          data: { full_name: fullName },
        },
      });

      if (error) {
        toast({
          title: error.message.includes("already registered") ? "Account exists" : "Something went wrong",
          description: error.message.includes("already registered")
            ? "This email already has an account. Please sign in instead."
            : error.message,
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        await supabase
          .from("profiles")
          .update({
            newsletter_opt_in: newsletter,
            free_signup_source: "free-reading-landing",
            updated_at: new Date().toISOString(),
          })
          .eq("id", session.user.id);

        void supabase.functions.invoke("free-signup-onboard", { body: {} });
      }

      toast({ title: "Welcome", description: "Your reading is ready to draw." });
      navigate(SPREAD_PATH, { replace: true });
    } catch (error: any) {
      toast({
        title: "Something went wrong",
        description: error?.message || "Please try again in a moment.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <section className="relative isolate overflow-hidden">
        <img
          src={spreadsImage}
          alt="Oracle cards laid out on a dark cloth in warm candlelight."
          className="absolute inset-0 -z-10 h-full w-full object-cover"
        />
        <div
          className="absolute inset-0 -z-10 bg-gradient-to-b from-image-overlay/65 via-image-overlay/75 to-image-overlay/95"
          aria-hidden
        />
        <div
          className="absolute inset-0 -z-10 bg-gradient-to-r from-image-overlay/45 via-transparent to-image-overlay/45"
          aria-hidden
        />
        <div className="mx-auto max-w-3xl px-5 py-16 text-center md:py-24">
          <p className="mb-3 text-xs uppercase tracking-[0.2em] text-primary">A free card reading</p>
          <h1 className="font-serif text-[2rem] leading-tight text-on-image sm:text-5xl">
            Past, Present, Future
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-on-image/90">
            Three cards drawn for you, and one reading written from the thread that
            runs between them. No charge, no card details — just a free account so
            your reading is saved and stays yours.
          </p>
        </div>
      </section>

      <section className="px-5 py-12 md:py-16">
        <div className="mx-auto grid max-w-5xl gap-10 md:grid-cols-2 md:gap-14">
          <div>
            <h2 className="font-serif text-2xl text-foreground">What you receive</h2>
            <ul className="mt-5 space-y-4 text-sm leading-relaxed text-muted-foreground">
              <li className="flex gap-3">
                <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
                Three cards drawn at random from across the decks, laid out as Past,
                Present and Future.
              </li>
              <li className="flex gap-3">
                <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
                One written reading that names the common thread between your three
                cards, in THE TEMPLE's grounded voice.
              </li>
              <li className="flex gap-3">
                <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
                Three reflection questions you can write into privately, saved to your
                account so you can return and add more.
              </li>
            </ul>
            <p className="mt-6 text-xs leading-relaxed text-muted-foreground">
              A free account includes this one reading. Membership opens the other five
              spreads, every card deck, the courses, the Remembrance Letters, Living
              Pattern and your private journal.
            </p>
            <p className="mt-4 text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link to="/auth" className="text-primary underline">
                Sign in
              </Link>
              .
            </p>
          </div>

          <form onSubmit={handleSubmit} className="rounded-lg border border-border bg-card p-6">
            <h2 className="font-serif text-xl text-foreground">Create your free account</h2>
            <div className="mt-5 space-y-4">
              <div>
                <Label htmlFor="free-name">Your name</Label>
                <Input
                  id="free-name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  autoComplete="name"
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label htmlFor="free-email">Email</Label>
                <Input
                  id="free-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label htmlFor="free-password">Password</Label>
                <Input
                  id="free-password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                  className="mt-1.5"
                />
                <p className="mt-1.5 text-xs text-muted-foreground">
                  At least 8 characters, with upper and lower case, a number and a
                  special character.
                </p>
              </div>
              <div className="flex items-start gap-3">
                <Checkbox
                  id="free-newsletter"
                  checked={newsletter}
                  onCheckedChange={(checked) => setNewsletter(checked === true)}
                />
                <Label htmlFor="free-newsletter" className="text-xs font-normal leading-relaxed text-muted-foreground">
                  Send me occasional emails from THE TEMPLE about new practices,
                  teachings and openings. You can unsubscribe any time.
                </Label>
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden /> Creating your account
                  </>
                ) : (
                  "Draw my free reading"
                )}
              </Button>
              <img
                src={cardBacksCollage}
                alt="The four card decks available for the Past, Present, Future reading, spread across dark cloth in candlelight."
                width={1500}
                height={1000}
                className="mt-5 aspect-[3/2] w-full rounded-lg border border-border/60 object-cover"
              />
            </div>
          </form>
        </div>
      </section>
    </div>
  );
};

export default FreeReadingLanding;
