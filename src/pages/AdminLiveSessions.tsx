import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Plus, Calendar, Loader2, Video, CalendarIcon, Pencil } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { SessionType } from '@/hooks/useLiveSessions';
import ProfileDropdown from '@/components/ProfileDropdown';
import PageBreadcrumb from '@/components/PageBreadcrumb';

interface LiveSession {
  id: string;
  title: string;
  description: string | null;
  session_type: string;
  scheduled_at: string;
  duration_minutes: number;
  capacity: number | null;
  status: string;
  zoom_meeting_id: string | null;
  zoom_join_url: string | null;
  zoom_start_url: string | null;
  zoom_password: string | null;
}

export default function AdminLiveSessions() {
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingSession, setEditingSession] = useState<LiveSession | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [selectedTime, setSelectedTime] = useState('12:00');
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    sessionType: 'class' as SessionType,
    durationMinutes: 60,
    capacity: 100,
  });

  const [editFormData, setEditFormData] = useState({
    title: '',
    description: '',
    sessionType: 'class' as SessionType,
    durationMinutes: 60,
    capacity: 100,
  });
  const [editDate, setEditDate] = useState<Date | undefined>();
  const [editTime, setEditTime] = useState('12:00');

  const { data: sessions, isLoading } = useQuery({
    queryKey: ['admin-live-sessions'],
    enabled: !!isAdmin,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('live_sessions')
        .select('*')
        .order('scheduled_at', { ascending: false });

      if (error) throw error;
      return data as LiveSession[];
    },
  });

  const getScheduledDateTime = () => {
    if (!selectedDate) return null;
    const [hours, minutes] = selectedTime.split(':').map(Number);
    const dateTime = new Date(selectedDate);
    dateTime.setHours(hours, minutes, 0, 0);
    return dateTime;
  };

  const getEditScheduledDateTime = () => {
    if (!editDate) return null;
    const [hours, minutes] = editTime.split(':').map(Number);
    const dateTime = new Date(editDate);
    dateTime.setHours(hours, minutes, 0, 0);
    return dateTime;
  };

  const createSessionMutation = useMutation({
    mutationFn: async () => {
      const scheduledDateTime = getScheduledDateTime();
      if (!scheduledDateTime) {
        throw new Error('Please select a date and time');
      }

      setIsCreating(true);
      
      const { data, error } = await supabase.functions.invoke('zoom-create-meeting', {
        body: {
          title: formData.title,
          description: formData.description,
          sessionType: formData.sessionType,
          scheduledAt: scheduledDateTime.toISOString(),
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
      setIsCreateDialogOpen(false);
      setFormData({
        title: '',
        description: '',
        sessionType: 'class',
        durationMinutes: 60,
        capacity: 100,
      });
      setSelectedDate(undefined);
      setSelectedTime('12:00');
    },
    onError: (error: Error) => {
      console.error('Error creating session:', error);
      toast.error(error.message || 'Failed to create session');
    },
    onSettled: () => {
      setIsCreating(false);
    },
  });

  const updateSessionMutation = useMutation({
    mutationFn: async () => {
      if (!editingSession) throw new Error('No session selected');
      
      const scheduledDateTime = getEditScheduledDateTime();
      if (!scheduledDateTime) {
        throw new Error('Please select a date and time');
      }

      setIsSaving(true);
      
      const { error } = await supabase
        .from('live_sessions')
        .update({
          title: editFormData.title,
          description: editFormData.description || null,
          session_type: editFormData.sessionType,
          scheduled_at: scheduledDateTime.toISOString(),
          duration_minutes: editFormData.durationMinutes,
          capacity: editFormData.capacity,
        })
        .eq('id', editingSession.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-live-sessions'] });
      queryClient.invalidateQueries({ queryKey: ['live-sessions'] });
      toast.success('Session updated successfully!');
      setIsEditDialogOpen(false);
      setEditingSession(null);
    },
    onError: (error: Error) => {
      console.error('Error updating session:', error);
      toast.error(error.message || 'Failed to update session');
    },
    onSettled: () => {
      setIsSaving(false);
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
      queryClient.invalidateQueries({ queryKey: ['live-sessions'] });
      toast.success('Session status updated');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const openEditDialog = (session: LiveSession) => {
    setEditingSession(session);
    const scheduledDate = new Date(session.scheduled_at);
    setEditDate(scheduledDate);
    setEditTime(format(scheduledDate, 'HH:mm'));
    setEditFormData({
      title: session.title,
      description: session.description || '',
      sessionType: (session.session_type || 'class') as SessionType,
      durationMinutes: session.duration_minutes,
      capacity: session.capacity || 100,
    });
    setIsEditDialogOpen(true);
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
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <PageBreadcrumb items={[
          { label: 'Admin Dashboard', href: '/devotion/admin' },
          { label: 'Live Sessions' }
        ]} />
        <ProfileDropdown />
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-serif flex items-center gap-3">
              <Calendar className="h-8 w-8 text-primary" />
              Manage Live Sessions
            </h1>
          </div>

          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create Session
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle className="font-serif">Create New Live Session</DialogTitle>
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
                  <Label>Session Type</Label>
                  <Select
                    value={formData.sessionType}
                    onValueChange={(value: SessionType) => setFormData({ ...formData, sessionType: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="reading">Live Reading</SelectItem>
                      <SelectItem value="class">Live Class</SelectItem>
                      <SelectItem value="workshop">Live Workshop</SelectItem>
                      <SelectItem value="meditation">Live Meditation</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !selectedDate && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {selectedDate ? format(selectedDate, "PPP") : <span>Pick a date</span>}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0 bg-background border z-50" align="start">
                        <CalendarComponent
                          mode="single"
                          selected={selectedDate}
                          onSelect={setSelectedDate}
                          disabled={(date) => date < new Date()}
                          initialFocus
                          className="p-3 pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  
                  <div>
                    <Label htmlFor="time">Time</Label>
                    <Input
                      id="time"
                      type="time"
                      value={selectedTime}
                      onChange={(e) => setSelectedTime(e.target.value)}
                      required
                    />
                  </div>
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
                
                <Button type="submit" className="w-full" disabled={isCreating || !selectedDate}>
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

        {/* Edit Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="font-serif">Edit Live Session</DialogTitle>
            </DialogHeader>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                updateSessionMutation.mutate();
              }}
              className="space-y-4"
            >
              <div>
                <Label htmlFor="edit-title">Title</Label>
                <Input
                  id="edit-title"
                  value={editFormData.title}
                  onChange={(e) => setEditFormData({ ...editFormData, title: e.target.value })}
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="edit-description">Description</Label>
                <Textarea
                  id="edit-description"
                  value={editFormData.description}
                  onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                  rows={3}
                />
              </div>

              <div>
                <Label>Session Type</Label>
                <Select
                  value={editFormData.sessionType}
                  onValueChange={(value: SessionType) => setEditFormData({ ...editFormData, sessionType: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="reading">Live Reading</SelectItem>
                    <SelectItem value="class">Live Class</SelectItem>
                    <SelectItem value="workshop">Live Workshop</SelectItem>
                    <SelectItem value="meditation">Live Meditation</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !editDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {editDate ? format(editDate, "PPP") : <span>Pick a date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 bg-background border z-50" align="start">
                      <CalendarComponent
                        mode="single"
                        selected={editDate}
                        onSelect={setEditDate}
                        initialFocus
                        className="p-3 pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                
                <div>
                  <Label htmlFor="edit-time">Time</Label>
                  <Input
                    id="edit-time"
                    type="time"
                    value={editTime}
                    onChange={(e) => setEditTime(e.target.value)}
                    required
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-duration">Duration (minutes)</Label>
                  <Input
                    id="edit-duration"
                    type="number"
                    min={15}
                    max={480}
                    value={editFormData.durationMinutes}
                    onChange={(e) => setEditFormData({ ...editFormData, durationMinutes: parseInt(e.target.value) })}
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="edit-capacity">Capacity</Label>
                  <Input
                    id="edit-capacity"
                    type="number"
                    min={1}
                    max={1000}
                    value={editFormData.capacity}
                    onChange={(e) => setEditFormData({ ...editFormData, capacity: parseInt(e.target.value) })}
                    required
                  />
                </div>
              </div>
              
              <Button type="submit" className="w-full" disabled={isSaving || !editDate}>
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Changes'
                )}
              </Button>
            </form>
          </DialogContent>
        </Dialog>

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
                  <TableHead>Type</TableHead>
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
                      <Badge variant="outline" className="capitalize">
                        {session.session_type || 'class'}
                      </Badge>
                    </TableCell>
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
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => openEditDialog(session)}
                          title="Edit session"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
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
            <h2 className="text-xl font-serif mb-2">No sessions yet</h2>
            <p className="text-muted-foreground font-sans mb-4">
              Create your first live session to get started
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
