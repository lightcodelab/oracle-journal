import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { Plus, Video, Loader2, Pencil, Trash2, Upload, ExternalLink } from 'lucide-react';
import ProfileDropdown from '@/components/ProfileDropdown';
import PageBreadcrumb from '@/components/PageBreadcrumb';
import { format } from 'date-fns';

interface SessionReplay {
  id: string;
  session_id: string | null;
  title: string;
  description: string | null;
  replay_type: 'reading' | 'class' | 'workshop';
  video_url: string | null;
  video_file_path: string | null;
  thumbnail_url: string | null;
  duration_minutes: number | null;
  is_published: boolean;
  published_at: string | null;
  created_at: string;
}

interface LiveSession {
  id: string;
  title: string;
  session_type: string;
  scheduled_at: string;
  status: string;
}

export default function AdminSessionReplays() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isAdmin } = useAuth();
  const queryClient = useQueryClient();
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingReplay, setEditingReplay] = useState<SessionReplay | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  
  const preselectedSessionId = searchParams.get('sessionId');
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    replayType: 'class' as 'reading' | 'class' | 'workshop',
    videoUrl: '',
    videoFilePath: '',
    thumbnailUrl: '',
    durationMinutes: '',
    isPublished: false,
    sessionId: '',
  });

  // Fetch completed sessions for linking
  const { data: completedSessions } = useQuery({
    queryKey: ['completed-sessions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('live_sessions')
        .select('id, title, session_type, scheduled_at, status')
        .eq('status', 'completed')
        .order('scheduled_at', { ascending: false });
      
      if (error) throw error;
      return data as LiveSession[];
    },
  });

  // Fetch replays
  const { data: replays, isLoading } = useQuery({
    queryKey: ['admin-session-replays'],
    enabled: !!isAdmin,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('session_replays')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as SessionReplay[];
    },
  });

  // Pre-fill form when coming from a session
  useEffect(() => {
    if (preselectedSessionId && completedSessions) {
      const session = completedSessions.find(s => s.id === preselectedSessionId);
      if (session) {
        setFormData(prev => ({
          ...prev,
          sessionId: session.id,
          title: `${session.title} - Replay`,
          replayType: (session.session_type || 'class') as 'reading' | 'class' | 'workshop',
        }));
        setIsDialogOpen(true);
      }
    }
  }, [preselectedSessionId, completedSessions]);

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      replayType: 'class',
      videoUrl: '',
      videoFilePath: '',
      thumbnailUrl: '',
      durationMinutes: '',
      isPublished: false,
      sessionId: '',
    });
    setEditingReplay(null);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `replays/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('session-replays')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      setFormData(prev => ({ ...prev, videoFilePath: filePath }));
      toast.success('Video uploaded successfully');
    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error('Failed to upload video');
    } finally {
      setIsUploading(false);
    }
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      setIsSaving(true);
      
      const payload = {
        title: formData.title,
        description: formData.description || null,
        replay_type: formData.replayType,
        video_url: formData.videoUrl || null,
        video_file_path: formData.videoFilePath || null,
        thumbnail_url: formData.thumbnailUrl || null,
        duration_minutes: formData.durationMinutes ? parseInt(formData.durationMinutes) : null,
        is_published: formData.isPublished,
        published_at: formData.isPublished ? new Date().toISOString() : null,
        session_id: formData.sessionId || null,
      };

      if (editingReplay) {
        const { error } = await supabase
          .from('session_replays')
          .update(payload)
          .eq('id', editingReplay.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('session_replays')
          .insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-session-replays'] });
      toast.success(editingReplay ? 'Replay updated!' : 'Replay created!');
      setIsDialogOpen(false);
      resetForm();
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
    onSettled: () => {
      setIsSaving(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('session_replays')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-session-replays'] });
      toast.success('Replay deleted');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const openEditDialog = (replay: SessionReplay) => {
    setEditingReplay(replay);
    setFormData({
      title: replay.title,
      description: replay.description || '',
      replayType: replay.replay_type,
      videoUrl: replay.video_url || '',
      videoFilePath: replay.video_file_path || '',
      thumbnailUrl: replay.thumbnail_url || '',
      durationMinutes: replay.duration_minutes?.toString() || '',
      isPublished: replay.is_published,
      sessionId: replay.session_id || '',
    });
    setIsDialogOpen(true);
  };

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Admin access required</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="flex items-center justify-between p-4 border-b border-border">
        <PageBreadcrumb items={[
          { label: 'Admin Dashboard', href: '/devotion/admin' },
          { label: 'Session Replays' }
        ]} />
        <ProfileDropdown />
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-serif flex items-center gap-3">
              <Video className="h-8 w-8 text-primary" />
              Manage Session Replays
            </h1>
            <p className="text-muted-foreground mt-1">
              Upload and manage replays of completed live sessions
            </p>
          </div>

          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Replay
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="font-serif">
                  {editingReplay ? 'Edit Replay' : 'Add New Replay'}
                </DialogTitle>
              </DialogHeader>
              
              <form onSubmit={(e) => { e.preventDefault(); saveMutation.mutate(); }} className="space-y-4">
                <div>
                  <Label htmlFor="title">Title *</Label>
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

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Replay Type</Label>
                    <Select
                      value={formData.replayType}
                      onValueChange={(value: 'reading' | 'class' | 'workshop') => 
                        setFormData({ ...formData, replayType: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="reading">Reading Replay</SelectItem>
                        <SelectItem value="class">Class Replay</SelectItem>
                        <SelectItem value="workshop">Workshop Replay</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Link to Session (optional)</Label>
                    <Select
                      value={formData.sessionId}
                      onValueChange={(value) => setFormData({ ...formData, sessionId: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select session" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">None</SelectItem>
                        {completedSessions?.map((session) => (
                          <SelectItem key={session.id} value={session.id}>
                            {session.title} ({format(new Date(session.scheduled_at), 'MMM d')})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="videoUrl">Video URL (YouTube/Vimeo)</Label>
                  <Input
                    id="videoUrl"
                    value={formData.videoUrl}
                    onChange={(e) => setFormData({ ...formData, videoUrl: e.target.value })}
                    placeholder="https://vimeo.com/..."
                  />
                </div>

                <div>
                  <Label>Or Upload Video File</Label>
                  {formData.videoFilePath ? (
                    <div className="flex items-center gap-2 p-3 bg-muted rounded-md">
                      <Video className="w-5 h-5 text-primary" />
                      <span className="flex-1 text-sm truncate">{formData.videoFilePath}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setFormData({ ...formData, videoFilePath: '' })}
                      >
                        Remove
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Input
                        type="file"
                        accept="video/*"
                        onChange={handleFileUpload}
                        disabled={isUploading}
                      />
                      {isUploading && <Loader2 className="w-4 h-4 animate-spin" />}
                    </div>
                  )}
                </div>

                <div>
                  <Label htmlFor="thumbnailUrl">Thumbnail URL (optional)</Label>
                  <Input
                    id="thumbnailUrl"
                    value={formData.thumbnailUrl}
                    onChange={(e) => setFormData({ ...formData, thumbnailUrl: e.target.value })}
                    placeholder="https://..."
                  />
                </div>

                <div>
                  <Label htmlFor="duration">Duration (minutes)</Label>
                  <Input
                    id="duration"
                    type="number"
                    value={formData.durationMinutes}
                    onChange={(e) => setFormData({ ...formData, durationMinutes: e.target.value })}
                    placeholder="60"
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="published"
                    checked={formData.isPublished}
                    onCheckedChange={(checked) => setFormData({ ...formData, isPublished: checked })}
                  />
                  <Label htmlFor="published">Published (visible to users)</Label>
                </div>

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isSaving}>
                    {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    {editingReplay ? 'Update' : 'Create'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : replays && replays.length > 0 ? (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {replays.map((replay) => (
                  <TableRow key={replay.id}>
                    <TableCell className="font-medium">{replay.title}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {replay.replay_type}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {replay.duration_minutes ? `${replay.duration_minutes} min` : '-'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={replay.is_published ? 'default' : 'secondary'}>
                        {replay.is_published ? 'Published' : 'Draft'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {format(new Date(replay.created_at), 'MMM d, yyyy')}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => openEditDialog(replay)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-destructive"
                          onClick={() => {
                            if (confirm('Delete this replay?')) {
                              deleteMutation.mutate(replay.id);
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <Card>
            <CardContent className="text-center py-16">
              <Video className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h2 className="text-xl font-serif mb-2">No replays yet</h2>
              <p className="text-muted-foreground mb-4">
                Upload your first session replay to get started
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
