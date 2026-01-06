import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ArrowLeft, Trash2, FolderHeart, Sparkles } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface Protocol {
  id: string;
  title: string;
  description: string | null;
  symptoms_addressed: string[];
  created_at: string;
}

interface ProtocolItem {
  id: string;
  notes: string | null;
  healing_content: {
    id: string;
    title: string;
    content_type: string;
    description: string | null;
  } | null;
}

const MyProtocols = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [protocols, setProtocols] = useState<Protocol[]>([]);
  const [selectedProtocol, setSelectedProtocol] = useState<Protocol | null>(null);
  const [protocolItems, setProtocolItems] = useState<ProtocolItem[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate('/auth');
        return;
      }
      fetchProtocols();
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) {
        navigate('/auth');
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const fetchProtocols = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('healing_protocols')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching protocols:', error);
      toast({
        title: "Error",
        description: "Failed to load protocols.",
        variant: "destructive",
      });
    } else {
      setProtocols(data || []);
    }
    setLoading(false);
  };

  const fetchProtocolItems = async (protocolId: string) => {
    setLoadingItems(true);
    const { data, error } = await supabase
      .from('protocol_items')
      .select(`
        id,
        notes,
        healing_content (
          id,
          title,
          content_type,
          description
        )
      `)
      .eq('protocol_id', protocolId);

    if (error) {
      console.error('Error fetching protocol items:', error);
    } else {
      setProtocolItems(data || []);
    }
    setLoadingItems(false);
  };

  const handleProtocolClick = (protocol: Protocol) => {
    setSelectedProtocol(protocol);
    fetchProtocolItems(protocol.id);
  };

  const deleteProtocol = async (protocolId: string) => {
    const { error } = await supabase
      .from('healing_protocols')
      .delete()
      .eq('id', protocolId);

    if (error) {
      console.error('Error deleting protocol:', error);
      toast({
        title: "Error",
        description: "Failed to delete protocol.",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Protocol Deleted",
        description: "The protocol has been removed.",
      });
      setProtocols(protocols.filter(p => p.id !== protocolId));
      if (selectedProtocol?.id === protocolId) {
        setSelectedProtocol(null);
        setProtocolItems([]);
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-primary font-serif text-xl">
          Loading your protocols...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
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
        <h1 className="font-serif text-xl text-foreground">My Protocols</h1>
        <div className="w-20" />
      </div>

      <div className="max-w-6xl mx-auto p-6">
        {protocols.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <FolderHeart className="w-16 h-16 text-muted-foreground mb-4" />
            <h2 className="font-serif text-2xl text-foreground mb-2">No Protocols Yet</h2>
            <p className="text-muted-foreground max-w-md mb-6">
              Start a conversation with your Healing Guide to create personalized protocols.
            </p>
            <Button onClick={() => navigate('/devotion/healing-bot')}>
              <Sparkles className="w-4 h-4 mr-2" />
              Talk to Healing Guide
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Protocol List */}
            <div>
              <h2 className="font-serif text-lg text-foreground mb-4">Your Protocols</h2>
              <ScrollArea className="h-[calc(100vh-200px)]">
                <div className="space-y-3 pr-4">
                  {protocols.map((protocol, index) => (
                    <motion.div
                      key={protocol.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <Card
                        className={`cursor-pointer transition-all ${
                          selectedProtocol?.id === protocol.id
                            ? 'border-primary bg-primary/5'
                            : 'hover:border-primary/30'
                        }`}
                        onClick={() => handleProtocolClick(protocol)}
                      >
                        <CardHeader className="pb-2">
                          <div className="flex items-start justify-between">
                            <CardTitle className="text-base font-serif">{protocol.title}</CardTitle>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Protocol?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    This will permanently delete "{protocol.title}" and all its contents.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => deleteProtocol(protocol.id)}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  >
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                          <CardDescription className="text-xs">
                            {new Date(protocol.created_at).toLocaleDateString()}
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="pt-0">
                          {protocol.symptoms_addressed.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {protocol.symptoms_addressed.slice(0, 3).map((symptom, i) => (
                                <span
                                  key={i}
                                  className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded"
                                >
                                  {symptom}
                                </span>
                              ))}
                              {protocol.symptoms_addressed.length > 3 && (
                                <span className="text-xs text-muted-foreground">
                                  +{protocol.symptoms_addressed.length - 3} more
                                </span>
                              )}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              </ScrollArea>
            </div>

            {/* Protocol Details */}
            <div>
              {selectedProtocol ? (
                <motion.div
                  key={selectedProtocol.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                >
                  <h2 className="font-serif text-lg text-foreground mb-4">Protocol Details</h2>
                  <Card>
                    <CardHeader>
                      <CardTitle className="font-serif">{selectedProtocol.title}</CardTitle>
                      {selectedProtocol.description && (
                        <CardDescription>{selectedProtocol.description}</CardDescription>
                      )}
                    </CardHeader>
                    <CardContent>
                      {selectedProtocol.symptoms_addressed.length > 0 && (
                        <div className="mb-4">
                          <p className="text-sm text-muted-foreground mb-2">Addresses:</p>
                          <div className="flex flex-wrap gap-1">
                            {selectedProtocol.symptoms_addressed.map((symptom, i) => (
                              <span
                                key={i}
                                className="text-sm bg-primary/10 text-primary px-2 py-1 rounded"
                              >
                                {symptom}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="mt-4">
                        <p className="text-sm text-muted-foreground mb-3">Included Content:</p>
                        {loadingItems ? (
                          <div className="text-center py-4 text-muted-foreground">
                            Loading...
                          </div>
                        ) : protocolItems.length === 0 ? (
                          <p className="text-sm text-muted-foreground italic">
                            No specific content linked to this protocol.
                          </p>
                        ) : (
                          <div className="space-y-3">
                            {protocolItems.map((item) => (
                              <div
                                key={item.id}
                                className="p-3 bg-muted/50 rounded-lg"
                              >
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded capitalize">
                                    {item.healing_content?.content_type || 'content'}
                                  </span>
                                  <span className="font-medium text-sm">
                                    {item.healing_content?.title || 'Untitled'}
                                  </span>
                                </div>
                                {item.notes && (
                                  <p className="text-xs text-muted-foreground mt-1">
                                    {item.notes}
                                  </p>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ) : (
                <div className="flex flex-col items-center justify-center h-64 text-center">
                  <FolderHeart className="w-12 h-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">
                    Select a protocol to view its details
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MyProtocols;
