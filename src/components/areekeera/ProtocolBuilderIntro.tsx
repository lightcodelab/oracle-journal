import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Sparkles, ShieldCheck, KeyRound, ClipboardList, ChevronRight, Lock } from 'lucide-react';

interface ProtocolBuilderIntroProps {
  onContinue: () => void;
  /** Whether the member already has an encryption password set up */
  hasEncryptionKey: boolean;
}

export default function ProtocolBuilderIntro({ onContinue, hasEncryptionKey }: ProtocolBuilderIntroProps) {
  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-2xl mx-auto p-4 py-8 space-y-6">
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <Sparkles className="w-8 h-8 text-primary" />
            </div>
            <CardTitle className="font-serif text-3xl">The AreekeerA® Protocol Builder</CardTitle>
            <CardDescription className="text-base">
              A private space to turn what you are experiencing in your body, mind and heart into a
              gentle, personalised healing protocol you can actually follow.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-8">
            <section className="space-y-3">
              <h2 className="font-serif text-xl flex items-center gap-2">
                <ClipboardList className="w-5 h-5 text-primary" />
                What it is
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                You describe how you are feeling — physically, mentally, emotionally and spiritually — and
                the Guide draws on the AreekeerA® healing templates, meditations and practices held in the
                Temple to compose a sequenced protocol for you: what to do, in what order, for how long,
                and why each step is being offered.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="font-serif text-xl flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-primary" />
                Why you would use it
              </h2>
              <ul className="space-y-2 text-sm text-muted-foreground leading-relaxed list-disc pl-5">
                <li>You know something needs tending but not where to begin.</li>
                <li>You want a practice shaped to today's symptoms rather than a generic routine.</li>
                <li>You want your protocol saved so you can return to it, track how it lands, and adjust.</li>
                <li>You want trauma-informed pacing — if things escalate, the Guide slows down and offers grounding first.</li>
              </ul>
              <p className="text-xs text-muted-foreground">
                This is not medical advice and is not a substitute for professional healthcare.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="font-serif text-xl flex items-center gap-2">
                <ClipboardList className="w-5 h-5 text-primary" />
                What you will do
              </h2>
              <ol className="space-y-2 text-sm text-muted-foreground leading-relaxed list-decimal pl-5">
                <li>Read and accept a short safety acknowledgement.</li>
                <li>Select the symptoms you are experiencing and rate their intensity.</li>
                <li>Name what you would like from this session, and how much time you have.</li>
                <li>Speak with the Guide, then save the protocol it composes for you.</li>
              </ol>
              <p className="text-sm text-muted-foreground">
                Allow around 10–15 minutes for your first protocol.
              </p>
            </section>

            <section className="space-y-3 rounded-lg border border-border bg-muted/40 p-4">
              <h2 className="font-serif text-xl flex items-center gap-2">
                <Lock className="w-5 h-5 text-primary" />
                Why the next screen asks for a password
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Because this is health information, everything you write here is end-to-end encrypted with a
                key only you hold. Not the Temple, not administrators, not anyone with database access can
                read it. That protection is only possible if the key never leaves you — which is why you
                {hasEncryptionKey ? ' unlock with your encryption password each session.' : ' create a separate encryption password before you begin.'}
              </p>
              <div className="flex items-start gap-2 text-sm text-muted-foreground">
                <KeyRound className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                <p>
                  {hasEncryptionKey
                    ? 'If you have forgotten your password, you can recover with your 12-word phrase — or, if that is also lost, start a fresh encrypted space from the unlock screen.'
                    : 'You will be given a 12-word recovery phrase. Save it somewhere safe: it is what lets you reset your password later without losing your protocols.'}
                </p>
              </div>
            </section>

            <Button onClick={onContinue} size="lg" className="w-full">
              {hasEncryptionKey ? 'Continue to unlock' : 'Continue and set up encryption'}
              <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
