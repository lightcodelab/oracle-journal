import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Copy, Sparkles } from "lucide-react";

interface Props {
  /** Fully-formed referral URL, e.g. https://.../r/code */
  referralUrl: string;
  displayName?: string | null;
}

const AffiliateWelcomeKit = ({ referralUrl, displayName }: Props) => {
  const { toast } = useToast();

  const copy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: `${label} copied` });
  };

  const socialPost = `THE TEMPLE of Sustainment is a living practice for meeting what is actually happening — in your body, your relationships and your inner world — understanding what may sit beneath it, and choosing one supported next step.

Inside there are courses, card decks, guided meditations, somatic and energy-medicine practices, live offerings and replays, and the Living Pattern Lab: a private place to see what keeps happening and to practise a different choice.

If that speaks to something in you, you can step inside here:
${referralUrl}`;

  const shortPost = `A private space for noticing what keeps happening — and practising a different response. THE TEMPLE of Sustainment: ${referralUrl}`;

  const dmMessage = `Hi — I wanted to share something I'm part of.

THE TEMPLE of Sustainment is a membership space for meeting what is here in your body and your life, understanding what may sit beneath it, and choosing one supported next step. It holds courses, card decks, guided and somatic practices, live offerings, and a private Living Pattern Lab for noticing what repeats.

Here's the doorway if you'd like to look: ${referralUrl}`;

  const emailCopy = `Subject: A doorway I wanted to share with you

Hello,

I wanted to tell you about THE TEMPLE of Sustainment.

It is a membership space built for the seasons where insight alone is not enough — where the same pain keeps returning and your body reacts before you understand why. Inside there are courses, card decks, guided meditations, somatic and energy-medicine practices, live offerings and replays, and the Living Pattern Lab: a private place to record what keeps happening and practise a different choice.

One membership opens every Door. If you'd like to see what is inside:

${referralUrl}

With care,
${displayName || "Your name"}`;

  const bioLine = `THE TEMPLE of Sustainment — step inside: ${referralUrl}`;

  const items: { value: string; label: string; text: string; hint: string }[] = [
    { value: "post", label: "Social post", text: socialPost, hint: "Instagram, Facebook or Substack post." },
    { value: "short", label: "Short caption", text: shortPost, hint: "Stories, Threads or a short caption." },
    { value: "dm", label: "Personal message", text: dmMessage, hint: "A warm one-to-one message." },
    { value: "email", label: "Email", text: emailCopy, hint: "Send to your list or a friend." },
    { value: "bio", label: "Bio link", text: bioLine, hint: "Link-in-bio or profile line." },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary-strong" aria-hidden="true" />
          Your welcome kit
        </CardTitle>
        <CardDescription>
          Ready-to-use wording with your referral link already inside. Copy, adjust it to sound like you,
          and share.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="rounded-lg border bg-muted/30 p-3 flex items-center gap-2">
          <div className="flex-1 min-w-0">
            <div className="text-xs text-muted-foreground">Your referral link</div>
            <div className="text-sm truncate">{referralUrl}</div>
          </div>
          <Button size="sm" variant="ghost" aria-label="Copy referral link" onClick={() => copy(referralUrl, "Link")}>
            <Copy className="w-4 h-4" />
          </Button>
        </div>

        <Tabs defaultValue="post">
          <TabsList className="flex-wrap h-auto">
            {items.map((i) => (
              <TabsTrigger key={i.value} value={i.value}>
                {i.label}
              </TabsTrigger>
            ))}
          </TabsList>
          {items.map((i) => (
            <TabsContent key={i.value} value={i.value} className="space-y-3">
              <p className="text-xs text-muted-foreground">{i.hint}</p>
              <div className="rounded-lg border p-3 text-sm whitespace-pre-line bg-background">{i.text}</div>
              <Button size="sm" variant="outline" onClick={() => copy(i.text, i.label)}>
                <Copy className="w-4 h-4 mr-1" /> Copy {i.label.toLowerCase()}
              </Button>
            </TabsContent>
          ))}
        </Tabs>

        <div className="border-t pt-4 space-y-2">
          <div className="text-sm font-medium">How to make it easy</div>
          <ul className="text-sm text-muted-foreground list-disc pl-5 space-y-1">
            <li>Speak from your own experience first, then offer the link — it converts far better than a pitch.</li>
            <li>Use a separate link for each place you share (Instagram bio, newsletter, podcast) so you can see what works.</li>
            <li>Your link remembers a visitor for 60 days, so you are credited even if they join weeks later.</li>
            <li>Please avoid promising healing or medical outcomes — THE TEMPLE offers self-directed reflective and restorative practices.</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};

export default AffiliateWelcomeKit;
