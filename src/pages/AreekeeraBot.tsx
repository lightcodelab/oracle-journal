import { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { ArrowLeft, Send, Loader2, RefreshCw, Save, Sparkles, AlertTriangle, Shield, CheckCircle, ChevronRight, Play, Clock, Heart } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import ProfileDropdown from '@/components/ProfileDropdown';

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface Symptom {
  id: string;
  name: string;
  domain: 'physical' | 'mental' | 'emotional' | 'spiritual';
  description: string | null;
}

interface SymptomEntry {
  symptomId: string;
  severity: number;
}

interface ProtocolStep {
  id: string;
  title: string;
  modality: string;
  duration_sec: number | null;
  description: string | null;
  reason: string;
}

interface ProtocolData {
  title: string;
  summary: string;
  safety_notes: string;
  steps: ProtocolStep[];
  escalation_shown: boolean;
}

type IntakePhase = 'consent' | 'symptoms' | 'chat' | 'protocol';

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/areekeera-bot`;

const domainColors: Record<string, string> = {
  physical: 'bg-red-500/20 text-red-700 dark:text-red-400 border-red-500/30',
  mental: 'bg-blue-500/20 text-blue-700 dark:text-blue-400 border-blue-500/30',
  emotional: 'bg-yellow-500/20 text-yellow-700 dark:text-yellow-400 border-yellow-500/30',
  spiritual: 'bg-purple-500/20 text-purple-700 dark:text-purple-400 border-purple-500/30',
};

const AreekeeraBot = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [phase, setPhase] = useState<IntakePhase>('consent');
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Symptom intake state
  const [symptoms, setSymptoms] = useState<Symptom[]>([]);
  const [selectedSymptoms, setSelectedSymptoms] = useState<SymptomEntry[]>([]);
  const [currentDomain, setCurrentDomain] = useState<'physical' | 'mental' | 'emotional' | 'spiritual'>('physical');
  const [goals, setGoals] = useState('');
  const [sessionTime, setSessionTime] = useState(15);

  // Protocol state
  const [generatedProtocol, setGeneratedProtocol] = useState<ProtocolData | null>(null);
  const [showEscalation, setShowEscalation] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate('/auth');
        return;
      }
      setUserId(session.user.id);
      await loadSymptoms();
      setLoading(false);
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) {
        navigate('/auth');
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages]);

  const loadSymptoms = async () => {
    const { data, error } = await supabase
      .from('symptoms')
      .select('*')
      .order('domain', { ascending: true });

    if (error) {
      console.error('Error loading symptoms:', error);
      return;
    }
    setSymptoms(data || []);
  };

  const handleConsentAccept = () => {
    setPhase('symptoms');
  };

  const handleSymptomToggle = (symptomId: string) => {
    setSelectedSymptoms(prev => {
      const existing = prev.find(s => s.symptomId === symptomId);
      if (existing) {
        return prev.filter(s => s.symptomId !== symptomId);
      }
      return [...prev, { symptomId, severity: 5 }];
    });
  };

  const handleSeverityChange = (symptomId: string, severity: number) => {
    setSelectedSymptoms(prev =>
      prev.map(s => s.symptomId === symptomId ? { ...s, severity } : s)
    );
  };

  const handleStartChat = () => {
    if (selectedSymptoms.length === 0) {
      toast({
        title: "Please select symptoms",
        description: "Select at least one symptom to continue.",
        variant: "destructive",
      });
      return;
    }
    setPhase('chat');
    
    // Send initial message to bot with symptom data
    const symptomNames = selectedSymptoms.map(s => {
      const symptom = symptoms.find(sym => sym.id === s.symptomId);
      return symptom ? `${symptom.name} (severity: ${s.severity}/10)` : '';
    }).filter(Boolean);

    const initialMessage = `I'm experiencing the following: ${symptomNames.join(', ')}. ${goals ? `My goals are: ${goals}. ` : ''}I have about ${sessionTime} minutes available.`;
    
    setInput('');
    sendMessage(initialMessage, true);
  };

  const extractProtocol = (content: string): ProtocolData | null => {
    const jsonMatch = content.match(/\{"protocol":\s*\{[\s\S]*?\}\}/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0]);
        return parsed.protocol;
      } catch {
        return null;
      }
    }
    return null;
  };

  const saveProtocol = async (protocol: ProtocolData) => {
    if (!userId) return;

    try {
      // Create the protocol
      const { data: protocolData, error: protocolError } = await supabase
        .from('areekeera_protocols')
        .insert({
          title: protocol.title,
          summary: protocol.summary,
          safety_notes: protocol.safety_notes,
        })
        .select()
        .single();

      if (protocolError) throw protocolError;

      // Save user protocol link
      const { error: userProtocolError } = await supabase
        .from('user_areekeera_protocols')
        .insert({
          user_id: userId,
          protocol_id: protocolData.id,
        });

      if (userProtocolError) throw userProtocolError;

      // Add protocol steps (if we have resource IDs)
      // For MVP, we'll store the steps without resource links
      if (protocol.steps.length > 0) {
        const steps = protocol.steps.map((step, index) => ({
          protocol_id: protocolData.id,
          step_index: index + 1,
          duration_sec: step.duration_sec,
          notes: `${step.title}: ${step.reason}`,
        }));

        await supabase.from('areekeera_protocol_steps').insert(steps);
      }

      toast({
        title: "Protocol Saved",
        description: `"${protocol.title}" has been saved to your protocols.`,
      });
    } catch (error) {
      console.error('Error saving protocol:', error);
      toast({
        title: "Error",
        description: "Failed to save the protocol. Please try again.",
        variant: "destructive",
      });
    }
  };

  const sendMessage = useCallback(async (messageText?: string, isInitial?: boolean) => {
    const textToSend = messageText || input.trim();
    if (!textToSend || isStreaming) return;

    const userMessage: Message = { role: 'user', content: textToSend };
    const newMessages = [...messages, userMessage];
    if (!isInitial) {
      setMessages(newMessages);
    } else {
      setMessages([userMessage]);
    }
    setInput('');
    setIsStreaming(true);

    let assistantContent = '';

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({
          title: "Session Expired",
          description: "Please log in again to continue.",
          variant: "destructive",
        });
        navigate('/auth');
        return;
      }

      // Build intake data for the bot
      const intakeData = {
        symptoms: selectedSymptoms.map(s => {
          const symptom = symptoms.find(sym => sym.id === s.symptomId);
          return {
            id: s.symptomId,
            name: symptom?.name || '',
            domain: symptom?.domain || 'physical',
            severity: s.severity,
          };
        }),
        goals,
        sessionTimeMinutes: sessionTime,
      };

      const response = await fetch(CHAT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ 
          messages: isInitial ? [userMessage] : newMessages,
          intake: intakeData,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        if (response.status === 429) {
          toast({
            title: "Rate Limited",
            description: "Please wait a moment before sending another message.",
            variant: "destructive",
          });
          return;
        }
        throw new Error(errorData.error || 'Failed to get response');
      }

      if (!response.body) throw new Error('No response body');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = '';

      const updateAssistant = (content: string) => {
        assistantContent = content;
        setMessages(prev => {
          const last = prev[prev.length - 1];
          if (last?.role === 'assistant') {
            return prev.map((m, i) => (i === prev.length - 1 ? { ...m, content } : m));
          }
          return [...prev, { role: 'assistant', content }];
        });

        // Check for escalation signals
        if (content.includes('[ESCALATION]') || content.includes('urgent care')) {
          setShowEscalation(true);
        }

        // Check for protocol in response
        const protocol = extractProtocol(content);
        if (protocol) {
          setGeneratedProtocol(protocol);
          setPhase('protocol');
        }
      };

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf('\n')) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);

          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (line.startsWith(':') || line.trim() === '') continue;
          if (!line.startsWith('data: ')) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === '[DONE]') break;

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              assistantContent += content;
              updateAssistant(assistantContent);
            }
          } catch {
            textBuffer = line + '\n' + textBuffer;
            break;
          }
        }
      }
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to send message",
        variant: "destructive",
      });
    } finally {
      setIsStreaming(false);
      inputRef.current?.focus();
    }
  }, [input, isStreaming, messages, navigate, toast, selectedSymptoms, symptoms, goals, sessionTime]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const resetConversation = () => {
    setMessages([]);
    setSelectedSymptoms([]);
    setGoals('');
    setSessionTime(15);
    setGeneratedProtocol(null);
    setShowEscalation(false);
    setPhase('consent');
    setInput('');
  };

  const renderMessage = (message: Message, index: number) => {
    const protocol = message.role === 'assistant' ? extractProtocol(message.content) : null;
    const displayContent = protocol 
      ? message.content.replace(/\{"protocol":\s*\{[\s\S]*?\}\}/, '').trim()
      : message.content;

    return (
      <motion.div
        key={index}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'} mb-4`}
      >
        <div
          className={`max-w-[80%] rounded-lg p-4 ${
            message.role === 'user'
              ? 'bg-primary text-primary-foreground'
              : 'bg-card border border-border'
          }`}
        >
          <p className="whitespace-pre-wrap text-sm">{displayContent}</p>
        </div>
      </motion.div>
    );
  };

  const symptomsByDomain = (domain: 'physical' | 'mental' | 'emotional' | 'spiritual') =>
    symptoms.filter(s => s.domain === domain);

  const domains: ('physical' | 'mental' | 'emotional' | 'spiritual')[] = ['physical', 'mental', 'emotional', 'spiritual'];

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-primary font-serif text-xl">
          Connecting to AreekeerA...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <Button
          onClick={() => navigate('/devotion')}
          variant="ghost"
          size="sm"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <h1 className="font-serif text-xl text-foreground">AreekeerA Protocol Guide</h1>
        <div className="flex items-center gap-2">
          <Button
            onClick={resetConversation}
            variant="ghost"
            size="sm"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Start Over
          </Button>
          <ProfileDropdown />
        </div>
      </div>

      {/* Escalation Banner */}
      <AnimatePresence>
        {showEscalation && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-destructive/10 border-b border-destructive/30 px-4 py-3"
          >
            <div className="max-w-3xl mx-auto flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-destructive flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium text-destructive">
                  If you're in crisis or experiencing thoughts of self-harm, please reach out for support.
                </p>
                <a 
                  href="https://988lifeline.org" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-sm text-destructive underline hover:no-underline"
                >
                  988 Suicide & Crisis Lifeline →
                </a>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        {/* Consent Phase */}
        {phase === 'consent' && (
          <div className="h-full flex items-center justify-center p-4">
            <Card className="max-w-lg w-full">
              <CardHeader className="text-center">
                <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                  <Shield className="w-8 h-8 text-primary" />
                </div>
                <CardTitle className="font-serif text-2xl">Welcome to AreekeerA</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground text-center">
                  This is a trauma-informed healing protocol guide designed to support your wellbeing journey.
                </p>
                <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                  <p className="text-sm font-medium flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-yellow-600" />
                    Important Disclaimer
                  </p>
                  <p className="text-sm text-muted-foreground">
                    This is not medical advice and is not a substitute for professional healthcare. 
                    If you're experiencing a crisis or medical emergency, please contact emergency services 
                    or a qualified healthcare provider immediately.
                  </p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    Personalized healing protocols
                  </p>
                  <p className="text-sm flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    Trauma-informed safety guardrails
                  </p>
                  <p className="text-sm flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    Progress tracking & check-ins
                  </p>
                </div>
                <Button onClick={handleConsentAccept} className="w-full" size="lg">
                  I Understand, Continue
                  <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Symptom Intake Phase */}
        {phase === 'symptoms' && (
          <ScrollArea className="h-full">
            <div className="max-w-2xl mx-auto p-4 space-y-6">
              <div className="text-center mb-8">
                <h2 className="font-serif text-2xl mb-2">How are you feeling?</h2>
                <p className="text-muted-foreground">
                  Select the symptoms you're experiencing and rate their intensity.
                </p>
              </div>

              {/* Domain Tabs */}
              <div className="flex justify-center gap-2 mb-6">
                {domains.map(domain => (
                  <Button
                    key={domain}
                    variant={currentDomain === domain ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setCurrentDomain(domain)}
                    className="capitalize"
                  >
                    {domain}
                  </Button>
                ))}
              </div>

              {/* Symptoms for current domain */}
              <Card>
                <CardHeader>
                  <CardTitle className="capitalize text-lg flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${
                      currentDomain === 'physical' ? 'bg-red-500' :
                      currentDomain === 'mental' ? 'bg-blue-500' :
                      currentDomain === 'emotional' ? 'bg-yellow-500' :
                      'bg-purple-500'
                    }`} />
                    {currentDomain} Symptoms
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {symptomsByDomain(currentDomain).length === 0 ? (
                    <p className="text-muted-foreground text-center py-4">
                      No symptoms defined for this domain yet.
                    </p>
                  ) : (
                    symptomsByDomain(currentDomain).map(symptom => {
                      const entry = selectedSymptoms.find(s => s.symptomId === symptom.id);
                      const isSelected = !!entry;

                      return (
                        <div key={symptom.id} className="space-y-2">
                          <div className="flex items-center justify-between">
                            <button
                              onClick={() => handleSymptomToggle(symptom.id)}
                              className={`flex items-center gap-2 text-left ${
                                isSelected ? 'font-medium' : 'text-muted-foreground'
                              }`}
                            >
                              <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                                isSelected 
                                  ? 'bg-primary border-primary' 
                                  : 'border-muted-foreground/30'
                              }`}>
                                {isSelected && <CheckCircle className="w-3 h-3 text-primary-foreground" />}
                              </div>
                              {symptom.name}
                            </button>
                            {isSelected && (
                              <span className="text-sm text-muted-foreground">
                                Severity: {entry.severity}/10
                              </span>
                            )}
                          </div>
                          {isSelected && (
                            <div className="pl-7">
                              <Slider
                                value={[entry.severity]}
                                onValueChange={(v) => handleSeverityChange(symptom.id, v[0])}
                                min={1}
                                max={10}
                                step={1}
                                className="w-full"
                              />
                              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                                <span>Mild</span>
                                <span>Moderate</span>
                                <span>Severe</span>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </CardContent>
              </Card>

              {/* Selected symptoms summary */}
              {selectedSymptoms.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {selectedSymptoms.map(entry => {
                    const symptom = symptoms.find(s => s.id === entry.symptomId);
                    if (!symptom) return null;
                    return (
                      <Badge
                        key={entry.symptomId}
                        variant="outline"
                        className={domainColors[symptom.domain]}
                      >
                        {symptom.name}: {entry.severity}/10
                      </Badge>
                    );
                  })}
                </div>
              )}

              {/* Goals & Session Time */}
              <Card>
                <CardContent className="pt-6 space-y-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      What are your healing goals? (Optional)
                    </label>
                    <Input
                      value={goals}
                      onChange={(e) => setGoals(e.target.value)}
                      placeholder="e.g., reduce anxiety, improve sleep, find peace..."
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      Available session time: {sessionTime} minutes
                    </label>
                    <Slider
                      value={[sessionTime]}
                      onValueChange={(v) => setSessionTime(v[0])}
                      min={5}
                      max={60}
                      step={5}
                    />
                  </div>
                </CardContent>
              </Card>

              <Button 
                onClick={handleStartChat} 
                className="w-full" 
                size="lg"
                disabled={selectedSymptoms.length === 0}
              >
                <Sparkles className="w-4 h-4 mr-2" />
                Generate My Healing Protocol
              </Button>
            </div>
          </ScrollArea>
        )}

        {/* Chat Phase */}
        {phase === 'chat' && (
          <>
            <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center py-12">
                  <Sparkles className="w-12 h-12 text-primary mb-4" />
                  <p className="text-muted-foreground">
                    Preparing your personalized healing protocol...
                  </p>
                </div>
              ) : (
                <div className="max-w-3xl mx-auto">
                  {messages.map((message, index) => renderMessage(message, index))}
                  {isStreaming && messages[messages.length - 1]?.role === 'user' && (
                    <div className="flex justify-start mb-4">
                      <div className="bg-card border border-border rounded-lg p-4">
                        <Loader2 className="w-4 h-4 animate-spin text-primary" />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </ScrollArea>

            {/* Input */}
            <div className="p-4 border-t border-border">
              <div className="max-w-3xl mx-auto flex gap-2">
                <Input
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask a follow-up question..."
                  disabled={isStreaming}
                  className="flex-1"
                />
                <Button
                  onClick={() => sendMessage()}
                  disabled={!input.trim() || isStreaming}
                >
                  {isStreaming ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>
          </>
        )}

        {/* Protocol Display Phase */}
        {phase === 'protocol' && generatedProtocol && (
          <ScrollArea className="h-full">
            <div className="max-w-2xl mx-auto p-4 space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                      <Heart className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="font-serif text-xl">{generatedProtocol.title}</CardTitle>
                      <p className="text-sm text-muted-foreground">Your personalized healing protocol</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-muted-foreground">{generatedProtocol.summary}</p>

                  {generatedProtocol.safety_notes && (
                    <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
                      <p className="text-sm flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-yellow-600" />
                        <span className="font-medium">Safety Note:</span>
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        {generatedProtocol.safety_notes}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Protocol Steps */}
              <div className="space-y-3">
                <h3 className="font-medium text-lg">Your Protocol Steps</h3>
                {generatedProtocol.steps.map((step, index) => (
                  <Card key={step.id || index}>
                    <CardContent className="p-4">
                      <div className="flex items-start gap-4">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <span className="text-sm font-medium text-primary">{index + 1}</span>
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-medium">{step.title}</h4>
                            <Badge variant="secondary" className="text-xs">{step.modality}</Badge>
                            {step.duration_sec && (
                              <Badge variant="outline" className="text-xs">
                                {Math.floor(step.duration_sec / 60)} min
                              </Badge>
                            )}
                          </div>
                          {step.description && (
                            <p className="text-sm text-muted-foreground mb-2">{step.description}</p>
                          )}
                          <p className="text-sm italic text-primary/80">Why: {step.reason}</p>
                        </div>
                        <Button variant="outline" size="icon">
                          <Play className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <div className="flex gap-2">
                <Button 
                  onClick={() => saveProtocol(generatedProtocol)}
                  className="flex-1"
                >
                  <Save className="w-4 h-4 mr-2" />
                  Save to My Protocols
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => navigate('/devotion/protocols')}
                >
                  View All Protocols
                </Button>
              </div>

              {/* Back to Chat */}
              <Button 
                variant="ghost" 
                onClick={() => setPhase('chat')}
                className="w-full"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Continue Conversation
              </Button>
            </div>
          </ScrollArea>
        )}
      </div>
    </div>
  );
};

export default AreekeeraBot;
