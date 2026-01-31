import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useMembership } from "@/hooks/useMembership";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Check, X, Sparkles, Heart, Crown, Loader2 } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { motion } from "framer-motion";
import templeBanner from "@/assets/temple-banner.png";
import guidesPhoto from "@/assets/julie-tash-guides.jpg";
import ProfileDropdown from "@/components/ProfileDropdown";
import PageBreadcrumb from "@/components/PageBreadcrumb";

// Feature row component for comparison table
const FeatureRow = ({ 
  feature, 
  t1 = false, 
  t2 = false, 
  t3 = false 
}: { 
  feature: string; 
  t1?: boolean; 
  t2?: boolean; 
  t3?: boolean;
}) => (
  <TableRow>
    <TableCell className="text-muted-foreground">{feature}</TableCell>
    <TableCell className="text-center">
      {t1 ? (
        <Check className="w-5 h-5 text-primary mx-auto" />
      ) : (
        <X className="w-5 h-5 text-muted-foreground/40 mx-auto" />
      )}
    </TableCell>
    <TableCell className="text-center">
      {t2 ? (
        <Check className="w-5 h-5 text-primary mx-auto" />
      ) : (
        <X className="w-5 h-5 text-muted-foreground/40 mx-auto" />
      )}
    </TableCell>
    <TableCell className="text-center">
      {t3 ? (
        <Check className="w-5 h-5 text-primary mx-auto" />
      ) : (
        <X className="w-5 h-5 text-muted-foreground/40 mx-auto" />
      )}
    </TableCell>
  </TableRow>
);

const tierIcons = {
  T1: Sparkles,
  T2: Heart,
  T3: Crown,
};

const tierColors = {
  T1: "from-amber-500/20 to-orange-500/20 border-amber-500/30",
  T2: "from-rose-500/20 to-pink-500/20 border-rose-500/30",
  T3: "from-violet-500/20 to-purple-500/20 border-violet-500/30",
};

const tierBadgeColors = {
  T1: "bg-amber-500/20 text-amber-300 border-amber-500/30",
  T2: "bg-rose-500/20 text-rose-300 border-rose-500/30",
  T3: "bg-violet-500/20 text-violet-300 border-violet-500/30",
};

const bucketLabels: Record<string, string> = {
  remembrance: "Door of Remembrance",
  devotion: "Door of Devotion",
  communion: "Door of Communion",
};

const Membership = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { tiers, loading, checkoutLoading, currentTier, subscriptionStatus, startCheckout } = useMembership();
  const [isYearly, setIsYearly] = useState(false);

  const formatPrice = (cents: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
    }).format(cents / 100);
  };

  const getYearlySavings = (monthlyPrice: number, yearlyPrice: number) => {
    const yearlyIfMonthly = monthlyPrice * 12;
    const savings = yearlyIfMonthly - yearlyPrice;
    const percent = Math.round((savings / yearlyIfMonthly) * 100);
    return { savings, percent };
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Top Navigation */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-sm border-b border-border/50">
        <div className="max-w-7xl mx-auto px-4 py-3 flex justify-end">
          <Button 
            variant="outline" 
            onClick={() => navigate('/temple')}
            className="text-sm"
          >
            Login
          </Button>
        </div>
      </header>

      {/* Sales Hero Section */}
      <section className="relative overflow-hidden pt-16">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-background to-background" />
        
        <div className="relative max-w-6xl mx-auto px-4 py-20 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <img 
              src={templeBanner} 
              alt="Temple of Sustainment" 
              className="w-full max-w-2xl mx-auto mb-8"
            />
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-serif mb-6 text-foreground leading-tight">
              Your Sacred Digital Sanctuary<br />
              <span className="text-primary">for Healing & Transformation</span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto mb-8 leading-relaxed">
              Step through the doors of ancient wisdom, reimagined for the modern seeker. 
              Access powerful healing protocols, oracle guidance, live ceremonies, and a 
              supportive community — all in one sacred space.
            </p>
            <div className="flex flex-wrap justify-center gap-4 mb-8">
              <Badge variant="secondary" className="px-4 py-2 text-sm bg-primary/10 text-primary border-primary/20">
                ✨ 7-Day Free Trial
              </Badge>
              <Badge variant="secondary" className="px-4 py-2 text-sm bg-muted text-muted-foreground">
                Cancel Anytime
              </Badge>
              <Badge variant="secondary" className="px-4 py-2 text-sm bg-muted text-muted-foreground">
                Instant Access
              </Badge>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20 px-4 bg-muted/30">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-4xl font-serif mb-4 text-foreground">
              Three Doors to Your Transformation
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Each door opens to deeper levels of healing, wisdom, and connection. 
              Choose the path that calls to your soul.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Door of Remembrance */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="bg-card border border-amber-500/20 rounded-lg p-6 hover:border-amber-500/40 transition-colors"
            >
              <div className="w-14 h-14 rounded-full bg-amber-500/10 flex items-center justify-center mb-4">
                <Sparkles className="w-7 h-7 text-amber-500" />
              </div>
              <h3 className="text-xl font-serif mb-2 text-foreground">The Door of Remembrance</h3>
              <p className="text-muted-foreground text-sm mb-4">
                Reconnect with your inner wisdom through sacred oracle guidance and self-reflection.
              </p>
              <ul className="space-y-2 text-sm">
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                  <span className="text-foreground/80">4 Complete Oracle Card Decks with shuffle animations (7 more decks to come)</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                  <span className="text-foreground/80">Unlimited card readings with deep interpretations</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                  <span className="text-foreground/80">Save & revisit meaningful readings</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                  <span className="text-foreground/80">Private digital journal for reflections</span>
                </li>
              </ul>
            </motion.div>

            {/* Door of Devotion */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="bg-card border border-rose-500/20 rounded-lg p-6 hover:border-rose-500/40 transition-colors"
            >
              <div className="w-14 h-14 rounded-full bg-rose-500/10 flex items-center justify-center mb-4">
                <Heart className="w-7 h-7 text-rose-500" />
              </div>
              <h3 className="text-xl font-serif mb-2 text-foreground">The Door of Devotion</h3>
              <p className="text-muted-foreground text-sm mb-4">
                Deepen your practice with personalized healing protocols and sacred rituals.
              </p>
              <ul className="space-y-2 text-sm">
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                  <span className="text-foreground/80">AI-powered AreekeerA healing protocols</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                  <span className="text-foreground/80">Library of guided meditations</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                  <span className="text-foreground/80">Sacred altar rituals & ceremonies</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                  <span className="text-foreground/80">Energy hygiene & protection practices</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                  <span className="text-foreground/80">Healing templates & somatic tools</span>
                </li>
              </ul>
            </motion.div>

            {/* Door of Communion */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.5 }}
              className="bg-card border border-violet-500/20 rounded-lg p-6 hover:border-violet-500/40 transition-colors"
            >
              <div className="w-14 h-14 rounded-full bg-violet-500/10 flex items-center justify-center mb-4">
                <Crown className="w-7 h-7 text-violet-500" />
              </div>
              <h3 className="text-xl font-serif mb-2 text-foreground">The Door of Communion</h3>
              <p className="text-muted-foreground text-sm mb-4">
                Join live ceremonies and connect with a global community of seekers.
              </p>
              <ul className="space-y-2 text-sm">
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                  <span className="text-foreground/80">Live oracle readings with Julie</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                  <span className="text-foreground/80">Weekly healing classes & teachings</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                  <span className="text-foreground/80">Interactive workshops & intensives</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                  <span className="text-foreground/80">Group meditation ceremonies</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                  <span className="text-foreground/80">Full replay library access</span>
                </li>
              </ul>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Social Proof / Trust Section */}
      <section className="py-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.6 }}
          >
            <p className="text-xl md:text-2xl font-serif italic text-foreground/80 mb-6">
              "This is not just an app — it's a living temple. A place to return to again and again 
              for guidance, healing, and remembrance of who you truly are."
            </p>
            <p className="text-muted-foreground">— Tash Lewin, Creator</p>
          </motion.div>
        </div>
      </section>

      {/* Choose Your Path Section */}
      <section className="py-16 px-4 text-center bg-muted/20">
        <h2 className="text-3xl md:text-4xl font-serif mb-4 text-foreground">
          Choose Your Path
        </h2>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
          Begin your journey of healing and transformation with a 7-day free trial.
          Cancel anytime.
        </p>

        {/* Billing Toggle */}
        <div className="flex items-center justify-center gap-3 mb-12">
          <Label htmlFor="billing-toggle" className={!isYearly ? "text-foreground" : "text-muted-foreground"}>
            Monthly
          </Label>
          <Switch
            id="billing-toggle"
            checked={isYearly}
            onCheckedChange={setIsYearly}
          />
          <Label htmlFor="billing-toggle" className={isYearly ? "text-foreground" : "text-muted-foreground"}>
            Yearly
          </Label>
          {isYearly && (
            <Badge variant="secondary" className="ml-2 bg-primary/20 text-primary">
              Save up to 17%
            </Badge>
          )}
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="pb-20 px-4">
        <div className="max-w-6xl mx-auto grid gap-6 md:grid-cols-3">
          {tiers.map((tier) => {
            const TierIcon = tierIcons[tier.code as keyof typeof tierIcons] || Sparkles;
            const colorClass = tierColors[tier.code as keyof typeof tierColors] || tierColors.T1;
            const badgeColor = tierBadgeColors[tier.code as keyof typeof tierBadgeColors] || tierBadgeColors.T1;
            
            const price = isYearly ? tier.yearlyPrice : tier.monthlyPrice;
            const priceAmount = price?.unit_amount_cents || 0;
            
            const isCurrentTier = currentTier === tier.code;
            const isActive = subscriptionStatus === "active" || subscriptionStatus === "trialing";

            const savings = tier.monthlyPrice && tier.yearlyPrice
              ? getYearlySavings(tier.monthlyPrice.unit_amount_cents, tier.yearlyPrice.unit_amount_cents)
              : null;

            return (
              <Card
                key={tier.code}
                className={`relative overflow-hidden border-2 bg-gradient-to-b ${colorClass} transition-all hover:scale-[1.02]`}
              >
                {tier.code === "T2" && (
                  <div className="absolute top-0 right-0 bg-primary text-primary-foreground text-xs font-medium px-3 py-1 rounded-bl-lg">
                    Most Popular
                  </div>
                )}

                <CardHeader className="text-center pb-2">
                  <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-background/50 flex items-center justify-center">
                    <TierIcon className="w-7 h-7 text-foreground" />
                  </div>
                  <Badge className={`mb-2 ${badgeColor} border`}>
                    {tier.name}
                  </Badge>
                  <CardTitle className="text-2xl">{tier.name}</CardTitle>
                  <CardDescription className="text-muted-foreground">
                    {tier.plan?.description || "Access healing content"}
                  </CardDescription>
                </CardHeader>

                <CardContent className="text-center">
                  <div className="mb-6">
                    <span className="text-4xl font-bold text-foreground">
                      {formatPrice(priceAmount)}
                    </span>
                    <span className="text-muted-foreground">
                      /{isYearly ? "year" : "month"}
                    </span>
                    {isYearly && savings && savings.percent > 0 && (
                      <p className="text-sm text-primary mt-1">
                        Save {formatPrice(savings.savings)} ({savings.percent}% off)
                      </p>
                    )}
                  </div>

                  <div className="space-y-3 text-left">
                    {tier.buckets.map((bucket) => (
                      <div key={bucket} className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-primary flex-shrink-0" />
                        <span className="text-sm text-foreground">
                          {bucketLabels[bucket] || bucket}
                        </span>
                      </div>
                    ))}
                    <div className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-primary flex-shrink-0" />
                      <span className="text-sm text-foreground">7-day free trial</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-primary flex-shrink-0" />
                      <span className="text-sm text-foreground">Cancel anytime</span>
                    </div>
                  </div>
                </CardContent>

                <CardFooter>
                  {isCurrentTier && isActive ? (
                    <Button className="w-full" variant="secondary" disabled>
                      Current Plan
                    </Button>
                  ) : (
                    <Button
                      className="w-full"
                      onClick={() => price && startCheckout(price.id)}
                      disabled={!price || checkoutLoading === price?.id}
                    >
                      {checkoutLoading === price?.id ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Loading...
                        </>
                      ) : (
                        "Start Free Trial"
                      )}
                    </Button>
                  )}
                </CardFooter>
              </Card>
            );
          })}
        </div>
      </section>

      {/* Feature Comparison Table */}
      <section className="py-16 px-4 border-t border-border/40">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-serif mb-8 text-center text-foreground">
            Compare Features
          </h2>
          
          <div className="overflow-x-auto rounded-lg border border-border">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="w-[300px] font-serif text-foreground">Features</TableHead>
                  <TableHead className="text-center font-serif text-foreground">
                    <div className="flex flex-col items-center gap-1">
                      <Sparkles className="w-5 h-5 text-amber-500" />
                      <span>Seeker</span>
                    </div>
                  </TableHead>
                  <TableHead className="text-center font-serif text-foreground">
                    <div className="flex flex-col items-center gap-1">
                      <Heart className="w-5 h-5 text-rose-500" />
                      <span>Devotee</span>
                    </div>
                  </TableHead>
                  <TableHead className="text-center font-serif text-foreground">
                    <div className="flex flex-col items-center gap-1">
                      <Crown className="w-5 h-5 text-violet-500" />
                      <span>Initiate</span>
                    </div>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {/* Door of Remembrance Section */}
                <TableRow className="bg-amber-500/10">
                  <TableCell colSpan={4} className="font-serif text-amber-400 font-medium">
                    The Door of Remembrance
                  </TableCell>
                </TableRow>
                <FeatureRow feature="All Digital Card Decks with Shuffle" t1 t2 t3 />
                <FeatureRow feature="Unlimited Card Readings" t1 t2 t3 />
                <FeatureRow feature="Save Card Readings" t1 t2 t3 />
                <FeatureRow feature="Digital Journal" t1 t2 t3 />
                
                {/* Door of Devotion Section */}
                <TableRow className="bg-rose-500/10">
                  <TableCell colSpan={4} className="font-serif text-rose-400 font-medium">
                    The Door of Devotion
                  </TableCell>
                </TableRow>
                <FeatureRow feature="Guided Meditations" t2 t3 />
                <FeatureRow feature="AI AreekeerA Guide for Personalized Protocols" t2 t3 />
                <FeatureRow feature="Altar Rituals" t2 t3 />
                <FeatureRow feature="Energy Hygiene Practices" t2 t3 />
                <FeatureRow feature="Healing Templates" t2 t3 />
                
                {/* Door of Communion Section */}
                <TableRow className="bg-violet-500/10">
                  <TableCell colSpan={4} className="font-serif text-violet-400 font-medium">
                    The Door of Communion
                  </TableCell>
                </TableRow>
                <FeatureRow feature="Live Readings" t3 />
                <FeatureRow feature="Live Classes" t3 />
                <FeatureRow feature="Live Workshops" t3 />
                <FeatureRow feature="Live Meditation Classes" t3 />
                <FeatureRow feature="All Session Replays" t3 />
              </TableBody>
            </Table>
          </div>
        </div>
      </section>

      {/* Your Guides Section */}
      <section className="py-20 px-4 border-t border-border/40">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-3xl md:text-4xl font-serif mb-12 text-center text-foreground">
              Your Guides
            </h2>
            
            <div className="grid md:grid-cols-3 gap-8 items-start">
              {/* Photo */}
              <div className="flex justify-center">
                <img 
                  src={guidesPhoto}
                  alt="Julie and Tash Lewin"
                  className="w-full object-cover grayscale"
                />
              </div>
              
              {/* Julie's Bio */}
              <div>
                <p className="text-foreground/90 font-sans leading-relaxed mb-4">
                  <span className="font-semibold text-foreground">Julie Lewin</span> is a medical intuitive with over 40 years of experience working with the body as an intelligent, communicative system. Her work focuses on identifying how trauma, stress, and unresolved emotional patterns become stored in the physical body and nervous system — often long before symptoms appear.
                </p>
                <p className="text-foreground/90 font-sans leading-relaxed">
                  Rather than treating symptoms in isolation, Julie tracks chronic pain and illness patterns through time, using the AreekeerA® approach to read the body's energetic and neurological history. Her work supports the release of long-held survival responses so the system can return to safety, repair, and resilience.
                </p>
              </div>
              
              {/* Tash's Bio */}
              <div>
                <p className="text-foreground/90 font-sans leading-relaxed mb-4">
                  <span className="font-semibold text-foreground">Tash Lewin</span> works at the intersection of trauma, identity, and nervous system regulation. Her role within AreekeerA® focuses on helping people understand how subconscious beliefs, protective patterns, and energetic contracts form around unresolved trauma — and how these patterns quietly shape health, relationships, and life outcomes.
                </p>
                <p className="text-foreground/90 font-sans leading-relaxed">
                  Through structured, trauma-informed processes, Tash supports the rewriting of identity at both psychological and energetic levels, allowing new patterns of safety, capacity, and self-trust to emerge without force or bypassing.
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* FAQ or Trust Signals */}
      <section className="py-16 px-4 border-t border-border/40">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-2xl font-serif mb-8 text-foreground">
            Frequently Asked Questions
          </h2>
          <div className="space-y-6 text-left">
            <div>
              <h3 className="font-medium text-foreground mb-2">
                What happens after my free trial?
              </h3>
              <p className="text-muted-foreground text-sm">
                After your 7-day trial, you'll be charged the subscription amount. You can cancel anytime before the trial ends to avoid charges.
              </p>
            </div>
            <div>
              <h3 className="font-medium text-foreground mb-2">
                Can I change my plan later?
              </h3>
              <p className="text-muted-foreground text-sm">
                Yes! You can upgrade or downgrade your plan at any time. Changes take effect at the next billing cycle.
              </p>
            </div>
            <div>
              <h3 className="font-medium text-foreground mb-2">
                What payment methods do you accept?
              </h3>
              <p className="text-muted-foreground text-sm">
                We accept all major credit cards through our secure payment partner Stripe.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Membership;
