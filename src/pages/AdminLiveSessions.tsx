import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Plus, Calendar, Users, Loader2, ArrowLeft, Video } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function AdminLiveSessions() {
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    scheduledAt: '',
    durationMinutes: 60,
    capacity: 100,
  });

  const { data: sessions, isLoading } = useQuery({
    queryKey: ['admin-live-sessions'],
    enabled: !!isAdmin,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('live_sessions')
        .select('*')
        .order('scheduled_at', { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  const createSessionMutation = useMutation({
    mutationFn: async () => {
      setIsCreating(true);
      
      const { data, error } = await supabase.functions.invoke('zoom-create-meeting', {
        body: {
          title: formData.title,
          description: formData.description,
          scheduledAt: new Date(formData.scheduledAt).toISOString(),
          durationMinutes: formData.durationMinutes,
          capacity: formData.capacity,
        },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);
      
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-live-sessions'] });
      toast.success('Live session created successfully!');
      setIsDialogOpen(false);
      setFormData({
        title: '',
        description: '',
        scheduledAt: '',
        durationMinutes: 60,
        capacity: 100,
      });
    },
    onError: (error: Error) => {
      console.error('Error creating session:', error);
      toast.error(error.message || 'Failed to create session');
    },
    onSettled: () => {
      setIsCreating(false);
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ sessionId, status }: { sessionId: string; status: string }) => {
      const { error } = await supabase
        .from('live_sessions')
        .update({ status })
        .eq('id', sessionId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-live-sessions'] });
      toast.success('Session status updated');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Admin access required</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate('/live-sessions')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Calendar className="h-8 w-8 text-primary" />
              Manage Live Sessions
            </h1>
          </div>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Session
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Create New Live Session</DialogTitle>
            </DialogHeader>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                createSessionMutation.mutate();
              }}
              className="space-y-4"
            >
              <div>
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                />
              </div>
              
              <div>
                <Label htmlFor="scheduledAt">Date & Time</Label>
                <Input
                  id="scheduledAt"
                  type="datetime-local"
                  value={formData.scheduledAt}
                  onChange={(e) => setFormData({ ...formData, scheduledAt: e.target.value })}
                  required
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="duration">Duration (minutes)</Label>
                  <Input
                    id="duration"
                    type="number"
                    min={15}
                    max={480}
                    value={formData.durationMinutes}
                    onChange={(e) => setFormData({ ...formData, durationMinutes: parseInt(e.target.value) })}
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="capacity">Capacity</Label>
                  <Input
                    id="capacity"
                    type="number"
                    min={1}
                    max={1000}
                    value={formData.capacity}
                    onChange={(e) => setFormData({ ...formData, capacity: parseInt(e.target.value) })}
                    required
                  />
                </div>
              </div>
              
              <Button type="submit" className="w-full" disabled={isCreating}>
                {isCreating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating with Zoom...
                  </>
                ) : (
                  <>
                    <Video className="h-4 w-4 mr-2" />
                    Create Session
                  </>
                )}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : sessions && sessions.length > 0 ? (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Date & Time</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sessions.map((session) => (
                <TableRow key={session.id}>
                  <TableCell className="font-medium">{session.title}</TableCell>
                  <TableCell>
                    {format(new Date(session.scheduled_at), 'PPp')}
                  </TableCell>
                  <TableCell>{session.duration_minutes} min</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        session.status === 'live'
                          ? 'destructive'
                          : session.status === 'completed'
                          ? 'secondary'
                          : 'default'
                      }
                    >
                      {session.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      {session.status === 'scheduled' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateStatusMutation.mutate({ 
                            sessionId: session.id, 
                            status: 'live' 
                          })}
                        >
                          Go Live
                        </Button>
                      )}
                      {session.status === 'live' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateStatusMutation.mutate({ 
                            sessionId: session.id, 
                            status: 'completed' 
                          })}
                        >
                          End Session
                        </Button>
                      )}
                      {session.status === 'scheduled' && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => updateStatusMutation.mutate({ 
                            sessionId: session.id, 
                            status: 'cancelled' 
                          })}
                        >
                          Cancel
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="text-center py-16 border rounded-lg">
          <Calendar className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-xl font-medium mb-2">No sessions yet</h2>
          <p className="text-muted-foreground mb-4">
            Create your first live session to get started
          </p>
        </div>
      )}
    </div>
  );
}
