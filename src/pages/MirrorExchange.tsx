import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Eye, Lock, Loader2, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useMemberState } from '@/hooks/useMemberState';
import PageBreadcrumb from '@/components/PageBreadcrumb';
import NavActions from '@/components/NavActions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';

type StepKey =
  | 'introduction'
  | 'may'
  | 'may_not'
  | 'orientation'
  | 'agreement'
  | 'attestation'
  | 'profile'
  | 'complete';

interface VersionRow { id: string; body: string; version: string }

export default function MirrorExchange() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { hasFullTempleAccess, loading: memberLoading } = useMemberState();

  const [step, setStep] = useState<StepKey>('introduction');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [agreement, setAgreement] = useState<VersionRow | null>(null);
  const [orientation, setOrientation] = useState<VersionRow | null>(null);
  const [attestation, setAttestation] = useState<VersionRow | null>(null);
  const [hasAgreement, setHasAgreement] = useState(false);
  const [hasOrientation, setHasOrientation] = useState(false);
  const [hasAttestation, setHasAttestation] = useState(false);
  const [hasProfile, setHasProfile] = useState(false);
  const [isReady, setIsReady] = useState(false);

  const [attestChecked, setAttestChecked] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [pronouns, setPronouns] = useState('');
  const [country, setCountry] = useState('');
  const [region, setRegion] = useState('');
  const [town, setTown] = useState('');
  const [timezone, setTimezone] = useState(
    Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
  );
  const [languages, setLanguages] = useState('');
  const [intro, setIntro] = useState('');

  useEffect(() => {
    if (!authLoading && !user) navigate('/auth?redirect=/communion/mirror-exchange');
  }, [authLoading, user, navigate]);

  useEffect(() => {
    if (!user) return;
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  async function load() {
    setLoading(true);
    const [ag, or, at, prof, ready] = await Promise.all([
      supabase.from('mirror_agreement_versions').select('id,body,version').eq('is_current', true).maybeSingle(),
      supabase.from('mirror_orientation_versions').select('id,body,version').eq('is_current', true).maybeSingle(),
      supabase.from('mirror_adult_attestation_versions').select('id,body,version').eq('is_current', true).maybeSingle(),
      supabase.from('community_profiles').select('id,display_name,pronouns,country,region,town,timezone,languages,intro').eq('user_id', user!.id).maybeSingle(),
      supabase.rpc('mirror_exchange_ready_self'),
    ]);
    setAgreement((ag.data as VersionRow) ?? null);
    setOrientation((or.data as VersionRow) ?? null);
    setAttestation((at.data as VersionRow) ?? null);

    if (ag.data) {
      const { data: rows } = await supabase
        .from('mirror_agreement_acceptances')
        .select('id').eq('user_id', user!.id).eq('version_id', (ag.data as VersionRow).id).limit(1);
      setHasAgreement((rows ?? []).length > 0);
    }
    if (or.data) {
      const { data: rows } = await supabase
        .from('mirror_orientation_completions')
        .select('id').eq('user_id', user!.id).eq('version_id', (or.data as VersionRow).id).limit(1);
      setHasOrientation((rows ?? []).length > 0);
    }
    if (at.data) {
      const { data: rows } = await supabase
        .from('mirror_adult_attestations')
        .select('id').eq('user_id', user!.id).eq('version_id', (at.data as VersionRow).id).limit(1);
      setHasAttestation((rows ?? []).length > 0);
    }
    if (prof.data) {
      setHasProfile(true);
      const p = prof.data as Record<string, unknown>;
      setDisplayName((p.display_name as string) ?? '');
      setPronouns((p.pronouns as string) ?? '');
      setCountry((p.country as string) ?? '');
      setRegion((p.region as string) ?? '');
      setTown((p.town as string) ?? '');
      setTimezone((p.timezone as string) ?? timezone);
      setLanguages(((p.languages as string[]) ?? []).join(', '));
      setIntro((p.intro as string) ?? '');
    }
    setIsReady(Boolean(ready.data));
    setLoading(false);
  }

  // Resume at first unmet step
  const resumeStep = useMemo<StepKey>(() => {
    if (isReady) return 'complete';
    if (!hasOrientation) return 'orientation';
    if (!hasAgreement) return 'agreement';
    if (!hasAttestation) return 'attestation';
    if (!hasProfile) return 'profile';
    return 'complete';
  }, [isReady, hasOrientation, hasAgreement, hasAttestation, hasProfile]);

  useEffect(() => {
    if (!loading) setStep((prev) => (prev === 'introduction' ? prev : resumeStep));
  }, [loading, resumeStep]);

  if (authLoading || memberLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!hasFullTempleAccess) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="max-w-md text-center space-y-4">
          <Lock className="w-8 h-8 mx-auto text-muted-foreground" />
          <h1 className="font-serif text-2xl">The Mirror Exchange</h1>
          <p className="text-muted-foreground">
            The Mirror Exchange is open to active Temple members. Please continue your membership to enter.
          </p>
          <Button onClick={() => navigate('/membership')}>View Membership</Button>
        </div>
      </div>
    );
  }

  async function callRpc(fn:
    | 'mirror_accept_agreement'
    | 'mirror_complete_orientation'
    | 'mirror_record_attestation'
    | 'mirror_activate_participation'
  ) {
    const { error } = await supabase.rpc(fn);
    if (error) throw error;
  }

  async function handleOrientation() {
    setSaving(true);
    try {
      await callRpc('mirror_complete_orientation');
      setHasOrientation(true);
      setStep('agreement');
    } catch (e) {
      toast.error((e as Error).message);
    } finally { setSaving(false); }
  }

  async function handleAgreement() {
    setSaving(true);
    try {
      await callRpc('mirror_accept_agreement');
      setHasAgreement(true);
      setStep('attestation');
    } catch (e) {
      toast.error((e as Error).message);
    } finally { setSaving(false); }
  }

  async function handleAttestation() {
    if (!attestChecked) return;
    setSaving(true);
    try {
      await callRpc('mirror_record_attestation');
      setHasAttestation(true);
      setStep('profile');
    } catch (e) {
      toast.error((e as Error).message);
    } finally { setSaving(false); }
  }

  async function handleProfile() {
    if (!displayName.trim() || !timezone.trim()) {
      toast.error('Display name and timezone are required.');
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.rpc('mirror_save_profile', {
        _display_name: displayName.trim(),
        _timezone: timezone.trim(),
        _pronouns: pronouns.trim() || null,
        _country: country.trim() || null,
        _region: region.trim() || null,
        _town: town.trim() || null,
        _languages: languages.split(',').map((s) => s.trim()).filter(Boolean),
        _intro: intro.trim() || null,
      });
      if (error) throw error;
      setHasProfile(true);
      await callRpc('mirror_activate_participation');
      const { data } = await supabase.rpc('mirror_exchange_ready_self');
      setIsReady(Boolean(data));
      setStep('complete');
    } catch (e) {
      toast.error((e as Error).message);
    } finally { setSaving(false); }
  }

  const scopeStatement = 'The Mirror Exchange is a peer-held space for outward processing. Your Mirror does not guide your process or provide your answers. She holds space while you listen for your own.';

  return (
    <div className="min-h-screen bg-background py-12 px-4 relative">
      <div className="absolute top-4 left-4 right-4 z-20 flex items-center justify-between">
        <PageBreadcrumb items={[
          { label: 'Door of Communion', href: '/communion' },
          { label: 'The Mirror Exchange' },
        ]} />
        <NavActions />
      </div>

      <div className="max-w-2xl mx-auto pt-16">
        <motion.div
          initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
          className="text-center mb-10 space-y-3"
        >
          <div className="w-12 h-12 rounded-full border border-primary/30 flex items-center justify-center mx-auto">
            <Eye className="w-6 h-6 text-primary" />
          </div>
          <h1 className="font-serif text-3xl md:text-4xl">The Mirror Exchange</h1>
          <p className="text-muted-foreground italic max-w-xl mx-auto">{scopeStatement}</p>
        </motion.div>

        <div className="bg-card border border-border rounded-lg p-6 md:p-8">
          {step === 'introduction' && (
            <Section title="Welcome">
              <p>
                The Mirror Exchange is a peer-held space for active adult Temple members who want
                another member to hold space while they outwardly process thoughts, reflections and
                self-revelations.
              </p>
              <p>
                Before entering, please walk through orientation, the Mirror Exchange agreement,
                and an 18+ attestation, and create a private community profile. Your profile stays
                private in this stage — matching and invitations will arrive later.
              </p>
              <Actions>
                <Button onClick={() => setStep('may')}>Begin</Button>
              </Actions>
            </Section>
          )}

          {step === 'may' && (
            <Section title="What a Mirror may do">
              <ul className="list-disc pl-5 space-y-1">
                <li>Listen attentively.</li>
                <li>Allow silence and uninterrupted processing.</li>
                <li>Reflect back the speaker&apos;s own words.</li>
                <li>Ask clarifying questions.</li>
                <li>Ask gentle deepening questions when invited.</li>
                <li>Ask whether the speaker wants reflection, a question or more space.</li>
              </ul>
              <Actions>
                <Button variant="outline" onClick={() => setStep('introduction')}>Back</Button>
                <Button onClick={() => setStep('may_not')}>Continue</Button>
              </Actions>
            </Section>
          )}

          {step === 'may_not' && (
            <Section title="What a Mirror may not do">
              <ul className="list-disc pl-5 space-y-1">
                <li>Coach, counsel, mentor or advise another member.</li>
                <li>Give recommendations or action plans.</li>
                <li>Lead an exercise, technique, modality or process.</li>
                <li>Perform healing, energetic or therapeutic work.</li>
                <li>Diagnose, assess, analyse or interpret another member.</li>
                <li>Tell another member what her experience means.</li>
                <li>Recruit clients or promote paid services.</li>
                <li>Invoke professional authority within the exchange.</li>
              </ul>
              <Actions>
                <Button variant="outline" onClick={() => setStep('may')}>Back</Button>
                <Button onClick={() => setStep('orientation')}>Continue</Button>
              </Actions>
            </Section>
          )}

          {step === 'orientation' && (
            <Section title="Orientation acknowledgement">
              <pre className="whitespace-pre-wrap font-sans text-sm text-foreground/90 bg-muted/40 p-4 rounded">
                {orientation?.body}
              </pre>
              <p className="text-sm text-muted-foreground">
                By continuing, you confirm you have read and understood the Mirror orientation.
              </p>
              <Actions>
                <Button variant="outline" onClick={() => setStep('may_not')}>Back</Button>
                <Button onClick={handleOrientation} disabled={saving}>
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Acknowledge orientation'}
                </Button>
              </Actions>
            </Section>
          )}

          {step === 'agreement' && (
            <Section title="Mirror Exchange agreement">
              <p className="text-sm text-muted-foreground">
                Before accepting the agreement, please note:
              </p>
              <ul className="list-disc pl-5 space-y-1 text-sm">
                <li>This is peer-held processing space, not coaching, counselling, therapy, crisis support, healing or professional care.</li>
                <li>You are responsible for deciding what you share.</li>
                <li>No recording or screenshots.</li>
                <li>No unsolicited advice, interpretation, exercises or processes.</li>
                <li>No client recruitment, service promotion or financial solicitation.</li>
                <li>No romantic or sexual use of the Exchange.</li>
                <li>Respect confidentiality — absolute confidentiality cannot be technically guaranteed.</li>
                <li>Ending connections, blocking and reporting will become available in later stages.</li>
                <li>Urgent or crisis support is outside the Exchange&apos;s scope.</li>
              </ul>
              <pre className="whitespace-pre-wrap font-sans text-sm text-foreground/90 bg-muted/40 p-4 rounded">
                {agreement?.body}
              </pre>
              <Actions>
                <Button variant="outline" onClick={() => setStep('orientation')}>Back</Button>
                <Button onClick={handleAgreement} disabled={saving}>
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Accept agreement'}
                </Button>
              </Actions>
            </Section>
          )}

          {step === 'attestation' && (
            <Section title="Adult attestation">
              <p className="text-sm text-muted-foreground">{attestation?.body}</p>
              <label className="flex items-start gap-3 pt-2 cursor-pointer">
                <Checkbox
                  checked={attestChecked}
                  onCheckedChange={(v) => setAttestChecked(Boolean(v))}
                />
                <span className="text-sm">I attest that I am 18 years of age or older.</span>
              </label>
              <Actions>
                <Button variant="outline" onClick={() => setStep('agreement')}>Back</Button>
                <Button onClick={handleAttestation} disabled={!attestChecked || saving}>
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirm attestation'}
                </Button>
              </Actions>
            </Section>
          )}

          {step === 'profile' && (
            <Section title="Private community profile">
              <p className="text-sm text-muted-foreground">
                Your profile stays private in Stage 1. Nothing here is visible to other members.
              </p>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="md:col-span-2">
                  <Label htmlFor="displayName">Community display name *</Label>
                  <Input id="displayName" value={displayName} onChange={(e) => setDisplayName(e.target.value)} maxLength={60} />
                </div>
                <div>
                  <Label htmlFor="pronouns">Pronouns</Label>
                  <Input id="pronouns" value={pronouns} onChange={(e) => setPronouns(e.target.value)} maxLength={40} />
                </div>
                <div>
                  <Label htmlFor="timezone">Timezone (IANA) *</Label>
                  <Input id="timezone" value={timezone} onChange={(e) => setTimezone(e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="country">Country</Label>
                  <Input id="country" value={country} onChange={(e) => setCountry(e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="region">State or region</Label>
                  <Input id="region" value={region} onChange={(e) => setRegion(e.target.value)} />
                </div>
                <div className="md:col-span-2">
                  <Label htmlFor="town">Approximate town or city (kept private)</Label>
                  <Input id="town" value={town} onChange={(e) => setTown(e.target.value)} />
                </div>
                <div className="md:col-span-2">
                  <Label htmlFor="languages">Languages (comma separated)</Label>
                  <Input id="languages" value={languages} onChange={(e) => setLanguages(e.target.value)} />
                </div>
                <div className="md:col-span-2">
                  <Label htmlFor="intro">Short introduction</Label>
                  <Textarea id="intro" value={intro} onChange={(e) => setIntro(e.target.value)} maxLength={600} rows={4} />
                </div>
              </div>
              <Actions>
                <Button variant="outline" onClick={() => setStep('attestation')}>Back</Button>
                <Button onClick={handleProfile} disabled={saving}>
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save profile & enter'}
                </Button>
              </Actions>
            </Section>
          )}

          {step === 'complete' && (
            <Section title="Your place within The Mirror Exchange is prepared.">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-primary mt-1" />
                <div className="space-y-3">
                  <p>
                    Your private Mirror profile has been created, but it is not visible to other
                    members yet. Matching and invitations will arrive in a later stage.
                  </p>
                  <p>You may return to the Door of Communion.</p>
                </div>
              </div>
              <Actions>
                <Button onClick={() => navigate('/communion')}>Return to Door of Communion</Button>
              </Actions>
            </Section>
          )}
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-4">
      <h2 className="font-serif text-2xl">{title}</h2>
      <div className="space-y-4 text-foreground/90">{children}</div>
    </div>
  );
}

function Actions({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-wrap gap-3 pt-4">{children}</div>;
}