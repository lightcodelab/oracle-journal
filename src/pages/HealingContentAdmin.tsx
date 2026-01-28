import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Plus, Trash2, Save, Loader2, Search, Upload, X, FileAudio, FileVideo, File } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import ProfileDropdown from '@/components/ProfileDropdown';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
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

interface HealingContent {
  id: string;
  title: string;
  description: string | null;
  content_type: string;
  content_url: string | null;
  content_text: string | null;
  symptom_tags: string[];
  duration_minutes: number | null;
  is_published: boolean;
  display_order: number;
  created_at: string;
}

const CONTENT_TYPES = ['template', 'meditation', 'audio', 'video', 'guide'];

const HealingContentAdmin = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState<HealingContent[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingContent, setEditingContent] = useState<HealingContent | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadedFileUrl, setUploadedFileUrl] = useState<string | null>(null);

  // Form state
  const [form, setForm] = useState({
    title: '',
    description: '',
    content_type: 'template',
    content_url: '',
    content_text: '',
    symptom_tags: '',
    duration_minutes: '',
    is_published: false,
    display_order: 0,
  });

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate('/auth');
        return;
      }

      // Check if user is admin
      const { data: roles } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', session.user.id)
        .eq('role', 'admin')
        .single();

      if (!roles) {
        navigate('/devotion');
        return;
      }

      fetchContent();
    };

    checkAuth();
  }, [navigate]);

  const fetchContent = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('healing_content')
      .select('*')
      .order('display_order', { ascending: true });

    if (error) {
      console.error('Error fetching content:', error);
      toast({
        title: "Error",
        description: "Failed to load content.",
        variant: "destructive",
      });
    } else {
      setContent(data || []);
    }
    setLoading(false);
  };

  const resetForm = () => {
    setForm({
      title: '',
      description: '',
      content_type: 'template',
      content_url: '',
      content_text: '',
      symptom_tags: '',
      duration_minutes: '',
      is_published: false,
      display_order: 0,
    });
    setEditingContent(null);
    setUploadedFileUrl(null);
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `${form.content_type}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('healing-content')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Use signed URL since bucket is now private (admin-only)
      const { data: signedUrlData, error: signedUrlError } = await supabase.storage
        .from('healing-content')
        .createSignedUrl(filePath, 60 * 60 * 24 * 365); // 1 year expiry for stored URLs

      if (signedUrlError) throw signedUrlError;

      const signedUrl = signedUrlData.signedUrl;
      setUploadedFileUrl(signedUrl);
      setForm({ ...form, content_url: signedUrl });

      toast({
        title: "Uploaded",
        description: "File uploaded successfully.",
      });
    } catch (error) {
      console.error('Error uploading file:', error);
      toast({
        title: "Error",
        description: "Failed to upload file.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const removeUploadedFile = () => {
    setUploadedFileUrl(null);
    setForm({ ...form, content_url: '' });
  };

  const getFileIcon = (url: string) => {
    if (url.match(/\.(mp3|wav|ogg|m4a)$/i)) return FileAudio;
    if (url.match(/\.(mp4|webm|mov)$/i)) return FileVideo;
    return File;
  };

  const openEditDialog = (item: HealingContent) => {
    setEditingContent(item);
    setForm({
      title: item.title,
      description: item.description || '',
      content_type: item.content_type,
      content_url: item.content_url || '',
      content_text: item.content_text || '',
      symptom_tags: item.symptom_tags.join(', '),
      duration_minutes: item.duration_minutes?.toString() || '',
      is_published: item.is_published,
      display_order: item.display_order,
    });
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.title.trim()) {
      toast({
        title: "Error",
        description: "Title is required.",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);

    const payload = {
      title: form.title.trim(),
      description: form.description.trim() || null,
      content_type: form.content_type,
      content_url: form.content_url.trim() || null,
      content_text: form.content_text.trim() || null,
      symptom_tags: form.symptom_tags.split(',').map(t => t.trim()).filter(Boolean),
      duration_minutes: form.duration_minutes ? parseInt(form.duration_minutes) : null,
      is_published: form.is_published,
      display_order: form.display_order,
    };

    try {
      if (editingContent) {
        const { error } = await supabase
          .from('healing_content')
          .update(payload)
          .eq('id', editingContent.id);

        if (error) throw error;

        toast({
          title: "Updated",
          description: "Content has been updated.",
        });
      } else {
        const { error } = await supabase
          .from('healing_content')
          .insert(payload);

        if (error) throw error;

        toast({
          title: "Created",
          description: "New content has been added.",
        });
      }

      setIsDialogOpen(false);
      resetForm();
      fetchContent();
    } catch (error) {
      console.error('Error saving content:', error);
      toast({
        title: "Error",
        description: "Failed to save content.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase
      .from('healing_content')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting content:', error);
      toast({
        title: "Error",
        description: "Failed to delete content.",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Deleted",
        description: "Content has been removed.",
      });
      fetchContent();
    }
  };

  const togglePublished = async (item: HealingContent) => {
    const { error } = await supabase
      .from('healing_content')
      .update({ is_published: !item.is_published })
      .eq('id', item.id);

    if (error) {
      console.error('Error toggling published:', error);
    } else {
      fetchContent();
    }
  };

  const filteredContent = content.filter(item => {
    const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.symptom_tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesType = filterType === 'all' || item.content_type === filterType;
    return matchesSearch && matchesType;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-primary font-serif text-xl">
          Loading admin dashboard...
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
        <h1 className="font-serif text-xl text-foreground">Healing Content Admin</h1>
        <div className="flex items-center gap-2">
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Add Content
              </Button>
            </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingContent ? 'Edit Content' : 'Add New Content'}</DialogTitle>
              <DialogDescription>
                {editingContent ? 'Update the healing content details.' : 'Add a new healing template or meditation.'}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Title *</Label>
                  <Input
                    id="title"
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    placeholder="Enter title"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="type">Type *</Label>
                  <Select
                    value={form.content_type}
                    onValueChange={(value) => setForm({ ...form, content_type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CONTENT_TYPES.map((type) => (
                        <SelectItem key={type} value={type} className="capitalize">
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Brief description of the content"
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="symptom_tags">Symptom Tags (comma-separated)</Label>
                <Input
                  id="symptom_tags"
                  value={form.symptom_tags}
                  onChange={(e) => setForm({ ...form, symptom_tags: e.target.value })}
                  placeholder="anxiety, stress, insomnia, grief..."
                />
              </div>

              <div className="space-y-2">
                <Label>Upload File (audio/video)</Label>
                {uploadedFileUrl || form.content_url ? (
                  <div className="flex items-center gap-2 p-3 bg-muted rounded-md">
                    {(() => {
                      const FileIcon = getFileIcon(form.content_url || '');
                      return <FileIcon className="w-5 h-5 text-primary" />;
                    })()}
                    <span className="flex-1 text-sm truncate">{form.content_url}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={removeUploadedFile}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Input
                      type="file"
                      accept="audio/*,video/*"
                      onChange={handleFileUpload}
                      disabled={uploading}
                      className="flex-1"
                    />
                    {uploading && <Loader2 className="w-4 h-4 animate-spin" />}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="content_url">Or paste URL directly</Label>
                <Input
                  id="content_url"
                  value={form.content_url}
                  onChange={(e) => setForm({ ...form, content_url: e.target.value })}
                  placeholder="https://..."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="content_text">Content Text (for templates/guides)</Label>
                <Textarea
                  id="content_text"
                  value={form.content_text}
                  onChange={(e) => setForm({ ...form, content_text: e.target.value })}
                  placeholder="Full text content..."
                  rows={5}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="duration">Duration (minutes)</Label>
                  <Input
                    id="duration"
                    type="number"
                    value={form.duration_minutes}
                    onChange={(e) => setForm({ ...form, duration_minutes: e.target.value })}
                    placeholder="15"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="order">Display Order</Label>
                  <Input
                    id="order"
                    type="number"
                    value={form.display_order}
                    onChange={(e) => setForm({ ...form, display_order: parseInt(e.target.value) || 0 })}
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="published"
                  checked={form.is_published}
                  onCheckedChange={(checked) => setForm({ ...form, is_published: checked })}
                />
                <Label htmlFor="published">Published (visible to users)</Label>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                {editingContent ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        <ProfileDropdown />
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-6">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by title or symptom tags..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {CONTENT_TYPES.map((type) => (
                <SelectItem key={type} value={type} className="capitalize">
                  {type}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <p className="text-2xl font-bold text-foreground">{content.length}</p>
              <p className="text-sm text-muted-foreground">Total Content</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-2xl font-bold text-primary">{content.filter(c => c.is_published).length}</p>
              <p className="text-sm text-muted-foreground">Published</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-2xl font-bold text-muted-foreground">{content.filter(c => !c.is_published).length}</p>
              <p className="text-sm text-muted-foreground">Drafts</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-2xl font-bold text-foreground">
                {new Set(content.flatMap(c => c.symptom_tags)).size}
              </p>
              <p className="text-sm text-muted-foreground">Unique Tags</p>
            </CardContent>
          </Card>
        </div>

        {/* Content List */}
        <ScrollArea className="h-[calc(100vh-350px)]">
          <div className="space-y-3">
            {filteredContent.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">No content found.</p>
              </div>
            ) : (
              filteredContent.map((item, index) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.02 }}
                >
                  <Card className="hover:border-primary/30 transition-colors">
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`text-xs px-2 py-0.5 rounded capitalize ${
                              item.is_published 
                                ? 'bg-green-500/20 text-green-500' 
                                : 'bg-muted text-muted-foreground'
                            }`}>
                              {item.is_published ? 'Published' : 'Draft'}
                            </span>
                            <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded capitalize">
                              {item.content_type}
                            </span>
                          </div>
                          <CardTitle className="text-base">{item.title}</CardTitle>
                          {item.description && (
                            <CardDescription className="line-clamp-2">{item.description}</CardDescription>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={item.is_published}
                            onCheckedChange={() => togglePublished(item)}
                          />
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditDialog(item)}
                          >
                            Edit
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-destructive hover:text-destructive"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Content?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This will permanently delete "{item.title}".
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDelete(item.id)}
                                  className="bg-destructive text-destructive-foreground"
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      {item.symptom_tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {item.symptom_tags.map((tag, i) => (
                            <span
                              key={i}
                              className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              ))
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
};

export default HealingContentAdmin;
