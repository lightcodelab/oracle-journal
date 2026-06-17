import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Trash2, FolderHeart, Sparkles, ArrowRight } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import ProfileDropdown from '@/components/ProfileDropdown';
import PageBreadcrumb from '@/components/PageBreadcrumb';
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
  summary: string | null;
  safety_notes: string | null;
  created_at: string | null;
  step_count?: number;
}

const MyProtocols = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [protocols, setProtocols] = useState<Protocol[]>([]);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate('/auth');
        return;
      }
      fetchProtocols(session.user.id);
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) {
        navigate('/auth');
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const fetchProtocols = async (userId: string) => {
    setLoading(true);
    
    // Fetch user's protocols with step counts
    const { data: userProtocols, error: upError } = await supabase
      .from('user_areekeera_protocols')
      .select('protocol_id')
      .eq('user_id', userId);

    if (upError) {
      console.error('Error fetching user protocols:', upError);
      setLoading(false);
      return;
    }

    const protocolIds = userProtocols?.map(up => up.protocol_id) || [];
    
    if (protocolIds.length === 0) {
      setProtocols([]);
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from('areekeera_protocols')
      .select(`
        id,
        title,
        summary,
        safety_notes,
        created_at,
        areekeera_protocol_steps (id)
      `)
      .in('id', protocolIds)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching protocols:', error);
      toast({
        title: "Error",
        description: "Failed to load protocols.",
        variant: "destructive",
      });
    } else {
      const protocolsWithCounts = (data || []).map(p => ({
        ...p,
        step_count: p.areekeera_protocol_steps?.length || 0,
      }));
      setProtocols(protocolsWithCounts);
    }
    setLoading(false);
  };

  const deleteProtocol = async (protocolId: string) => {
    // First delete from user_areekeera_protocols
    const { error: linkError } = await supabase
      .from('user_areekeera_protocols')
      .delete()
      .eq('protocol_id', protocolId);

    if (linkError) {
      console.error('Error deleting protocol link:', linkError);
    }

    // Then delete the protocol itself (cascade should handle steps)
    const { error } = await supabase
      .from('areekeera_protocols')
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
        <PageBreadcrumb 
          items={[
            { label: 'The Door of Devotion', href: '/devotion' },
            { label: 'My Protocols' }
          ]} 
        />
        <ProfileDropdown />
      </div>

      <div className="max-w-4xl mx-auto p-6">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-serif text-2xl text-foreground">My Protocols</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Your personalized healing protocols from AreekeerA Protocol Guide
            </p>
          </div>
          <Button onClick={() => navigate('/devotion/areekeera')}>
            <Sparkles className="w-4 h-4 mr-2" />
            Create New Protocol
          </Button>
        </div>

        {protocols.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <FolderHeart className="w-16 h-16 text-muted-foreground mb-4" />
            <h2 className="font-serif text-2xl text-foreground mb-2">No Protocols Yet</h2>
            <p className="text-muted-foreground max-w-md mb-6">
              Start a conversation with the AreekeerA Protocol Guide to create personalized healing protocols.
            </p>
            <Button onClick={() => navigate('/devotion/areekeera')}>
              <Sparkles className="w-4 h-4 mr-2" />
              Create Your First Protocol
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {protocols.map((protocol, index) => (
              <motion.div
                key={protocol.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card className="h-full hover:border-primary/30 transition-all group">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-base font-serif group-hover:text-primary transition-colors">
                          {protocol.title}
                        </CardTitle>
                        <CardDescription className="text-xs mt-1">
                          {protocol.created_at && new Date(protocol.created_at).toLocaleDateString()}
                          {protocol.step_count !== undefined && ` • ${protocol.step_count} steps`}
                        </CardDescription>
                      </div>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
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
                  </CardHeader>
                  <CardContent className="pt-0">
                    {protocol.summary && (
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                        {protocol.summary}
                      </p>
                    )}
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full"
                      onClick={() => navigate(`/devotion/protocols/${protocol.id}`)}
                    >
                      View Protocol
                      <ArrowRight className="w-3 h-3 ml-2" />
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MyProtocols;
