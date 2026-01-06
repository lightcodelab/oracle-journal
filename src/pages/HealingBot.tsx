import { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ArrowLeft, Send, Loader2, RefreshCw, Save, Sparkles } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface ProtocolData {
  title: string;
  description: string;
  symptoms: string[];
  items: { id: string; title: string; reason: string }[];
}

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/healing-bot`;

const HealingBot = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate('/auth');
        return;
      }
      setUserId(session.user.id);
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
      const { data: protocolData, error: protocolError } = await supabase
        .from('healing_protocols')
        .insert({
          user_id: userId,
          title: protocol.title,
          description: protocol.description,
          symptoms_addressed: protocol.symptoms,
        })
        .select()
        .single();

      if (protocolError) throw protocolError;

      // Add protocol items
      if (protocol.items.length > 0 && protocolData) {
        const items = protocol.items.map(item => ({
          protocol_id: protocolData.id,
          content_id: item.id,
          notes: item.reason,
        }));

        const { error: itemsError } = await supabase
          .from('protocol_items')
          .insert(items);

        if (itemsError) {
          console.error('Error saving protocol items:', itemsError);
        }
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

  const sendMessage = useCallback(async () => {
    if (!input.trim() || isStreaming) return;

    const userMessage: Message = { role: 'user', content: input.trim() };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');
    setIsStreaming(true);

    let assistantContent = '';

    try {
      const response = await fetch(CHAT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ messages: newMessages, userId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
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
  }, [input, isStreaming, messages, userId, toast]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const resetConversation = () => {
    setMessages([]);
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
          
          {protocol && (
            <div className="mt-4 p-4 bg-primary/10 rounded-lg border border-primary/20">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-4 h-4 text-primary" />
                <h4 className="font-serif font-semibold text-primary">{protocol.title}</h4>
              </div>
              <p className="text-sm text-muted-foreground mb-3">{protocol.description}</p>
              
              {protocol.symptoms.length > 0 && (
                <div className="mb-3">
                  <p className="text-xs text-muted-foreground mb-1">Addresses:</p>
                  <div className="flex flex-wrap gap-1">
                    {protocol.symptoms.map((symptom, i) => (
                      <span key={i} className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded">
                        {symptom}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {protocol.items.length > 0 && (
                <div className="space-y-2 mb-3">
                  {protocol.items.map((item, i) => (
                    <div key={i} className="text-sm">
                      <span className="font-medium">{item.title}</span>
                      <p className="text-xs text-muted-foreground">{item.reason}</p>
                    </div>
                  ))}
                </div>
              )}

              <Button
                size="sm"
                onClick={() => saveProtocol(protocol)}
                className="w-full mt-2"
              >
                <Save className="w-4 h-4 mr-2" />
                Save Protocol
              </Button>
            </div>
          )}
        </div>
      </motion.div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-primary font-serif text-xl">
          Connecting to your Healing Guide...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <Button
          onClick={() => navigate('/communion')}
          variant="ghost"
          size="sm"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <h1 className="font-serif text-xl text-foreground">Healing Guide</h1>
        <Button
          onClick={resetConversation}
          variant="ghost"
          size="sm"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          New Chat
        </Button>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-12">
            <Sparkles className="w-12 h-12 text-primary mb-4" />
            <h2 className="font-serif text-2xl text-foreground mb-2">Welcome to Your Healing Guide</h2>
            <p className="text-muted-foreground max-w-md mb-6">
              Share what you're experiencing—physically, emotionally, or spiritually—and I'll help create a personalized healing protocol just for you.
            </p>
            <div className="flex flex-wrap gap-2 justify-center max-w-lg">
              {[
                "I've been feeling anxious lately",
                "I'm experiencing low energy",
                "I need help with emotional healing",
                "I'm seeking spiritual guidance",
              ].map((suggestion) => (
                <Button
                  key={suggestion}
                  variant="outline"
                  size="sm"
                  onClick={() => setInput(suggestion)}
                  className="text-xs"
                >
                  {suggestion}
                </Button>
              ))}
            </div>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto">
            {messages.map((message, index) => renderMessage(message, index))}
            {isStreaming && (
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
            placeholder="Describe your symptoms or how you're feeling..."
            disabled={isStreaming}
            className="flex-1"
          />
          <Button
            onClick={sendMessage}
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
    </div>
  );
};

export default HealingBot;
