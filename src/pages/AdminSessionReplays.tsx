import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Plus, Video, Loader2, Pencil, Trash2, CalendarIcon } from 'lucide-react';
import ProfileDropdown from '@/components/ProfileDropdown';
import PageBreadcrumb from '@/components/PageBreadcrumb';
import JournalEditor from '@/components/journal/JournalEditor';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import type { Json } from '@/integrations/supabase/types';

interface SessionReplay {
  id: string;
  session_id: string | null;
  title: string;
  description: string | null;
  replay_type: 'reading' | 'class' | 'workshop' | 'meditation';
  video_url: string | null;
  video_file_path: string | null;
  thumbnail_url: string | null;
  duration_minutes: number | null;
  is_published: boolean;
  published_at: string | null;
  created_at: string;
  content_richtext: Json | null;
  original_session_date: string | null;
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
    replayType: 'class' as 'reading' | 'class' | 'workshop' | 'meditation',
    videoUrl: '',
    videoFilePath: '',
    thumbnailUrl: '',
    durationMinutes: '',
    isPublished: false,
    sessionId: '',
  });
  
  const [contentRichtext, setContentRichtext] = useState<Json | null>(null);
  const [originalSessionDate, setOriginalSessionDate] = useState<Date | undefined>();
  const [originalSessionTime, setOriginalSessionTime] = useState('12:00');

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
        const sessionDate = new Date(session.scheduled_at);
        setFormData(prev => ({
          ...prev,
          sessionId: session.id,
          title: `${session.title} - Replay`,
          replayType: (session.session_type || 'class') as 'reading' | 'class' | 'workshop' | 'meditation',
        }));
        setOriginalSessionDate(sessionDate);
        setOriginalSessionTime(format(sessionDate, 'HH:mm'));
        setIsDialogOpen(true);
      }
    }
  }, [preselectedSessionId, completedSessions]);

  const resetForm = () => {
    setFormData({
      title: '',
      replayType: 'class',
      videoUrl: '',
      videoFilePath: '',
      thumbnailUrl: '',
      durationMinutes: '',
      isPublished: false,
      sessionId: '',
    });
    setContentRichtext(null);
    setOriginalSessionDate(undefined);
    setOriginalSessionTime('12:00');
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

  const getOriginalSessionDateTime = () => {
    if (!originalSessionDate) return null;
    const [hours, minutes] = originalSessionTime.split(':').map(Number);
    const dateTime = new Date(originalSessionDate);
    dateTime.setHours(hours, minutes, 0, 0);
    return dateTime;
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      setIsSaving(true);
      
      const originalDateTime = getOriginalSessionDateTime();
      
      const payload = {
        title: formData.title,
        description: null, // Replaced by content_richtext
        replay_type: formData.replayType,
        video_url: formData.videoUrl || null,
        video_file_path: formData.videoFilePath || null,
        thumbnail_url: formData.thumbnailUrl || null,
        duration_minutes: formData.durationMinutes ? parseInt(formData.durationMinutes) : null,
        is_published: formData.isPublished,
        published_at: formData.isPublished ? new Date().toISOString() : null,
        session_id: formData.sessionId || null,
        content_richtext: contentRichtext,
        original_session_date: originalDateTime?.toISOString() || null,
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
      replayType: replay.replay_type,
      videoUrl: replay.video_url || '',
      videoFilePath: replay.video_file_path || '',
      thumbnailUrl: replay.thumbnail_url || '',
      durationMinutes: replay.duration_minutes?.toString() || '',
      isPublished: replay.is_published,
      sessionId: replay.session_id || '',
    });
    setContentRichtext(replay.content_richtext);
    if (replay.original_session_date) {
      const date = new Date(replay.original_session_date);
      setOriginalSessionDate(date);
      setOriginalSessionTime(format(date, 'HH:mm'));
    } else {
      setOriginalSessionDate(undefined);
      setOriginalSessionTime('12:00');
    }
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
          { label: 'Admin Dashboard', href: '/admin' },
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
            <Button onClick={() => setIsDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Replay
            </Button>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="font-serif">
                  {editingReplay ? 'Edit Replay' : 'Add New Replay'}
                </DialogTitle>
              </DialogHeader>
              
              <form onSubmit={(e) => { e.preventDefault(); saveMutation.mutate(); }} className="space-y-4">
                <div>
                  <Label htmlFor="title">Class Name *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="e.g., Sacred Breathwork Session"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Replay Type</Label>
                    <Select
                      value={formData.replayType}
                      onValueChange={(value: 'reading' | 'class' | 'workshop' | 'meditation') => 
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
                        <SelectItem value="meditation">Meditation Replay</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Link to Session (optional)</Label>
                    <Select
                      value={formData.sessionId || '__none__'}
                      onValueChange={(value) => setFormData({ ...formData, sessionId: value === '__none__' ? '' : value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select session" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">None</SelectItem>
                        {completedSessions?.map((session) => (
                          <SelectItem key={session.id} value={session.id}>
                            {session.title} ({format(new Date(session.scheduled_at), 'MMM d')})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Original Session Date & Time */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Original Class Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !originalSessionDate && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {originalSessionDate ? format(originalSessionDate, "PPP") : <span>Pick a date</span>}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0 bg-background border z-50" align="start">
                        <CalendarComponent
                          mode="single"
                          selected={originalSessionDate}
                          onSelect={setOriginalSessionDate}
                          initialFocus
                          className="p-3 pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  
                  <div>
                    <Label htmlFor="sessionTime">Original Class Time</Label>
                    <Input
                      id="sessionTime"
                      type="time"
                      value={originalSessionTime}
                      onChange={(e) => setOriginalSessionTime(e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="videoUrl">Vimeo Embed Link</Label>
                  <Input
                    id="videoUrl"
                    value={formData.videoUrl}
                    onChange={(e) => setFormData({ ...formData, videoUrl: e.target.value })}
                    placeholder="https://vimeo.com/123456789"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Paste the Vimeo video URL (e.g., https://vimeo.com/123456789)
                  </p>
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
                  <Label>Text Content</Label>
                  <p className="text-xs text-muted-foreground mb-2">
                    Add description, notes, or supporting materials for this replay
                  </p>
                  <JournalEditor
                    initialContent={contentRichtext || undefined}
                    onAutoSave={(content) => setContentRichtext(content)}
                    placeholder="Add class description, notes, or supporting materials..."
                    showToolbar={true}
                    className="min-h-[150px]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
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
                  <TableHead>Original Date</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Status</TableHead>
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
                      {replay.original_session_date 
                        ? format(new Date(replay.original_session_date), 'MMM d, yyyy h:mm a')
                        : '-'
                      }
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
          <div className="text-center py-16 border rounded-lg">
            <Video className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-serif mb-2">No replays yet</h2>
            <p className="text-muted-foreground mb-4">
              Upload your first session replay
            </p>
            <Button onClick={() => setIsDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Replay
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
