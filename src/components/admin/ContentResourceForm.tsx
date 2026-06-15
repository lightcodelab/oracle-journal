import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Upload, X, FileAudio, FileVideo, File, Image as ImageIcon, Link as LinkIcon, CalendarIcon } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import LinkExtension from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import { SelectableImageExtension } from '@/lib/selectableImageExtension';
import { VimeoEmbed } from '@/components/VimeoEmbed';
import CourseBuilder from './CourseBuilder';
import RichTextEditorToolbar from './RichTextEditorToolbar';
import { useResourceEditLock } from '@/hooks/useResourceEditLock';
import ResourceEditLockWarning from './ResourceEditLockWarning';
import { createStorageFileName, displayStorageFileName } from '@/lib/storageFileNames';

const resourceSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters'),
  slug: z.string().regex(/^[a-z0-9-]+$/, 'Slug must be lowercase letters, numbers, and hyphens only').optional(),
  summary: z.string().max(500, 'Summary must be under 500 characters').optional(),
  resource_type_id: z.string().uuid('Please select a resource type'),
  location_id: z.string().uuid('Please select a location'),
  main_media_kind: z.enum(['file', 'video_embed', 'none']),
  main_media_embed_url: z.string().url().optional().or(z.literal('')),
  status: z.enum(['draft', 'published']),
  is_course: z.boolean(),
});

type ResourceFormData = z.infer<typeof resourceSchema>;

interface Category {
  id: string;
  name: string;
  slug: string;
  type: 'resource_type' | 'location';
}

interface ContentResourceFormProps {
  resourceId?: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

const ContentResourceForm = ({ resourceId, onSuccess, onCancel }: ContentResourceFormProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const [mainMediaUrl, setMainMediaUrl] = useState<string | null>(null);
  const [mainMediaName, setMainMediaName] = useState<string | null>(null);
  const [courseId, setCourseId] = useState<string | null>(null);
  const [scheduledPublishAt, setScheduledPublishAt] = useState<Date | undefined>(undefined);
  const [scheduledTime, setScheduledTime] = useState('12:00');

  // Resource edit lock - prevents simultaneous editing by multiple admins
  const { isLocked, lockedBy, isLoading: lockLoading, acquireLock } = useResourceEditLock({
    resourceType: 'content',
    resourceId,
    enabled: !!resourceId, // Only enable for existing resources
  });

  // Acquire lock when component mounts (for existing resources)
  useEffect(() => {
    if (resourceId && !lockLoading && !isLocked) {
      acquireLock();
    }
  }, [resourceId, lockLoading, isLocked, acquireLock]);

  const form = useForm<ResourceFormData>({
    resolver: zodResolver(resourceSchema),
    defaultValues: {
      title: '',
      slug: '',
      summary: '',
      resource_type_id: '',
      location_id: '',
      main_media_kind: 'none',
      main_media_embed_url: '',
      status: 'draft',
      is_course: false,
    },
  });

  const editor = useEditor({
    extensions: [
      StarterKit,
      LinkExtension.configure({
        openOnClick: false,
      }),
      Placeholder.configure({
        placeholder: 'Start writing your content here...',
      }),
      SelectableImageExtension.configure({
        HTMLAttributes: {
          class: 'max-w-full h-auto rounded-md',
        },
      }),
      Underline,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
    ],
    editorProps: {
      attributes: {
        class: 'prose prose-sm dark:prose-invert max-w-none min-h-[200px] focus:outline-none p-4',
      },
    },
  });

  const isCourse = form.watch('is_course');
  const mainMediaKind = form.watch('main_media_kind');
  const embedUrl = form.watch('main_media_embed_url');

  useEffect(() => {
    fetchCategories();
    if (resourceId) {
      fetchResource();
    }
  }, [resourceId]);

  const fetchCategories = async () => {
    const { data, error } = await supabase
      .from('content_categories')
      .select('*')
      .eq('active', true)
      .order('display_order');

    if (data) {
      setCategories(data as Category[]);
    }
  };

  const fetchResource = async () => {
    if (!resourceId) return;
    setLoading(true);

    const { data: resource, error } = await supabase
      .from('content_resources')
      .select('*')
      .eq('id', resourceId)
      .single();

    if (resource) {
      form.reset({
        title: resource.title,
        slug: resource.slug,
        summary: resource.summary || '',
        resource_type_id: resource.resource_type_id || '',
        location_id: resource.location_id || '',
        main_media_kind: (resource.main_media_kind as 'file' | 'video_embed' | 'none') || 'none',
        main_media_embed_url: resource.main_media_embed_url || '',
        status: (resource.status as 'draft' | 'published') || 'draft',
        is_course: resource.is_course || false,
      });

      setThumbnailUrl(resource.thumbnail_url);
      setMainMediaUrl(resource.main_media_file_url);
      setMainMediaName(displayStorageFileName(resource.main_media_file_url, resource.main_media_file_url || 'Media file'));

      // Load scheduled publish date
      if ((resource as any).scheduled_publish_at) {
        const scheduledDate = new Date((resource as any).scheduled_publish_at);
        setScheduledPublishAt(scheduledDate);
        setScheduledTime(format(scheduledDate, 'HH:mm'));
      }

      if (editor && resource.body_richtext && typeof resource.body_richtext === 'object') {
        editor.commands.setContent(resource.body_richtext as Record<string, unknown>);
      }

      // Check if this resource has a course record
      if (resource.is_course) {
        const { data: course } = await supabase
          .from('content_courses')
          .select('id')
          .eq('resource_id', resourceId)
          .single();
        
        if (course) {
          setCourseId(course.id);
        }
      }
    }

    setLoading(false);
  };

  const generateSlug = (title: string) => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  };

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const title = e.target.value;
    form.setValue('title', title);
    
    if (!resourceId && !form.getValues('slug')) {
      form.setValue('slug', generateSlug(title));
    }
  };

  const handleFileUpload = async (
    file: File,
    bucket: string,
    setUrl: (url: string | null) => void,
    setDisplayName?: (name: string | null) => void
  ) => {
    setUploading(true);

    try {
      // Compress images before upload
      const { compressImage, isCompressibleImage } = await import('@/lib/imageCompression');
      const processedFile = isCompressibleImage(file) ? await compressImage(file) : file;

      const fileName = createStorageFileName(processedFile.name || file.name);
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(filePath, processedFile);

      if (uploadError) throw uploadError;

      setUrl(filePath);
      setDisplayName?.(file.name);
      toast({
        title: 'Uploaded',
        description: 'File uploaded successfully.',
      });
    } catch (error) {
      console.error('Error uploading file:', error);
      toast({
        title: 'Error',
        description: 'Failed to upload file.',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  const extractVideoId = (url: string): { platform: string; id: string } | null => {
    // Vimeo
    const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
    if (vimeoMatch) return { platform: 'vimeo', id: vimeoMatch[1] };

    // YouTube
    const youtubeMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/);
    if (youtubeMatch) return { platform: 'youtube', id: youtubeMatch[1] };

    return null;
  };

  const onSubmit = async (data: ResourceFormData) => {
    setSaving(true);

    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) {
        toast({ title: 'Error', description: 'Not authenticated', variant: 'destructive' });
        return;
      }

      // Calculate scheduled publish timestamp
      let scheduledTimestamp: string | null = null;
      if (data.status === 'draft' && scheduledPublishAt) {
        const [hours, minutes] = scheduledTime.split(':').map(Number);
        const scheduled = new Date(scheduledPublishAt);
        scheduled.setHours(hours, minutes, 0, 0);
        scheduledTimestamp = scheduled.toISOString();
      }

      const payload = {
        title: data.title,
        slug: data.slug || generateSlug(data.title),
        summary: data.summary || null,
        resource_type_id: data.resource_type_id,
        location_id: data.location_id,
        body_richtext: editor?.getJSON() || null,
        main_media_kind: data.main_media_kind,
        main_media_file_url: mainMediaUrl,
        main_media_embed_url: data.main_media_kind === 'video_embed' ? data.main_media_embed_url : null,
        thumbnail_url: thumbnailUrl,
        status: data.status,
        is_course: data.is_course,
        created_by: session.session.user.id,
        scheduled_publish_at: scheduledTimestamp,
      };

      let savedResourceId = resourceId;

      if (resourceId) {
        const { error } = await supabase
          .from('content_resources')
          .update(payload)
          .eq('id', resourceId);

        if (error) throw error;
      } else {
        const { data: newResource, error } = await supabase
          .from('content_resources')
          .insert(payload)
          .select()
          .single();

        if (error) throw error;
        savedResourceId = newResource.id;
      }

      // Handle course record creation/deletion
      if (data.is_course && savedResourceId) {
        const { data: existingCourse } = await supabase
          .from('content_courses')
          .select('id')
          .eq('resource_id', savedResourceId)
          .single();

        if (!existingCourse) {
          const { data: newCourse, error: courseError } = await supabase
            .from('content_courses')
            .insert({
              resource_id: savedResourceId,
              status: data.status,
            })
            .select()
            .single();

          if (courseError) throw courseError;
          setCourseId(newCourse.id);
        } else {
          await supabase
            .from('content_courses')
            .update({ status: data.status })
            .eq('id', existingCourse.id);
        }
      }

      toast({
        title: resourceId ? 'Updated' : 'Created',
        description: `Resource has been ${resourceId ? 'updated' : 'created'}.`,
      });

      onSuccess?.();
    } catch (error: any) {
      console.error('Error saving resource:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to save resource.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const getFileIcon = (url: string) => {
    if (url.match(/\.(mp3|wav|ogg|m4a)$/i)) return FileAudio;
    if (url.match(/\.(mp4|webm|mov)$/i)) return FileVideo;
    if (url.match(/\.(jpg|jpeg|png|gif|webp)$/i)) return ImageIcon;
    return File;
  };

  if (loading || lockLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  // Show lock warning if another admin is editing
  if (isLocked && lockedBy && onCancel) {
    return <ResourceEditLockWarning lockedBy={lockedBy} onGoBack={onCancel} />;
  }

  const resourceTypes = categories.filter(c => c.type === 'resource_type');
  const locations = categories.filter(c => c.type === 'location');

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <Tabs defaultValue="details" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="content">Content</TabsTrigger>
            <TabsTrigger value="media">Media</TabsTrigger>
            <TabsTrigger value="publishing">Publishing</TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="space-y-4 mt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title *</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        onChange={handleTitleChange}
                        placeholder="Enter title"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="slug"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Slug</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="auto-generated-slug" />
                    </FormControl>
                    <FormDescription>URL-friendly identifier</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="summary"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Summary</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder="Brief description (max 500 characters)"
                      rows={3}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="resource_type_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Resource Type *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {resourceTypes.map((cat) => (
                          <SelectItem key={cat.id} value={cat.id}>
                            {cat.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="location_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Location *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select location" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {locations.map((cat) => (
                          <SelectItem key={cat.id} value={cat.id}>
                            {cat.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="space-y-2">
              <Label>Thumbnail</Label>
              {thumbnailUrl ? (
                <div className="flex items-center gap-2 p-3 bg-muted rounded-md">
                  <ImageIcon className="w-5 h-5 text-primary" />
                  <span className="flex-1 text-sm truncate">{thumbnailUrl}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setThumbnailUrl(null)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileUpload(file, 'content-thumbnails', setThumbnailUrl);
                    }}
                    disabled={uploading}
                    className="flex-1"
                  />
                  {uploading && <Loader2 className="w-4 h-4 animate-spin" />}
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="content" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Body Content</Label>
              <div className="border rounded-md overflow-hidden">
                {editor && <RichTextEditorToolbar editor={editor} />}
                <EditorContent editor={editor} />
              </div>
            </div>

            <FormField
              control={form.control}
              name="is_course"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">This is a Course</FormLabel>
                    <FormDescription>
                      Enable to add modules and lessons
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            {isCourse && courseId && (
              <Card>
                <CardHeader>
                  <CardTitle>Course Builder</CardTitle>
                  <CardDescription>Organize modules and lessons</CardDescription>
                </CardHeader>
                <CardContent>
                  <CourseBuilder courseId={courseId} />
                </CardContent>
              </Card>
            )}

            {isCourse && !courseId && (
              <Card>
                <CardContent className="pt-6">
                  <p className="text-muted-foreground text-sm">
                    Save the resource first to enable the course builder.
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="media" className="space-y-4 mt-4">
            <FormField
              control={form.control}
              name="main_media_kind"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Main Media Type</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="none">No media</SelectItem>
                      <SelectItem value="file">Upload file</SelectItem>
                      <SelectItem value="video_embed">Video embed (YouTube/Vimeo)</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {mainMediaKind === 'file' && (
              <div className="space-y-2">
                <Label>Upload Main Media</Label>
                {mainMediaUrl ? (
                  <div className="flex items-center gap-2 p-3 bg-muted rounded-md">
                    {(() => {
                      const FileIcon = getFileIcon(mainMediaUrl);
                      return <FileIcon className="w-5 h-5 text-primary" />;
                    })()}
                    <span className="flex-1 text-sm truncate">{mainMediaUrl}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setMainMediaUrl(null)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Input
                      type="file"
                      accept="image/*,audio/*,video/*,.pdf"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleFileUpload(file, 'content-main-media', setMainMediaUrl);
                      }}
                      disabled={uploading}
                      className="flex-1"
                    />
                    {uploading && <Loader2 className="w-4 h-4 animate-spin" />}
                  </div>
                )}
              </div>
            )}

            {mainMediaKind === 'video_embed' && (
              <FormField
                control={form.control}
                name="main_media_embed_url"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Video URL</FormLabel>
                    <FormControl>
                      <div className="flex items-center gap-2">
                        <LinkIcon className="w-4 h-4 text-muted-foreground" />
                        <Input
                          {...field}
                          placeholder="https://vimeo.com/123456789 or https://youtube.com/watch?v=..."
                        />
                      </div>
                    </FormControl>
                    <FormDescription>
                      Paste a YouTube or Vimeo URL
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {mainMediaKind === 'video_embed' && embedUrl && extractVideoId(embedUrl)?.platform === 'vimeo' && (
              <div className="mt-4">
                <Label className="mb-2 block">Preview</Label>
                <VimeoEmbed videoId={extractVideoId(embedUrl)!.id} />
              </div>
            )}
          </TabsContent>

          <TabsContent value="publishing" className="space-y-4 mt-4">
            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select 
                    onValueChange={(value) => {
                      field.onChange(value);
                      // Clear schedule when publishing immediately
                      if (value === 'published') {
                        setScheduledPublishAt(undefined);
                      }
                    }} 
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="published">Published</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Only published resources are visible to users
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {form.watch('status') === 'draft' && (
              <div className="space-y-4 p-4 border border-dashed rounded-lg">
                <div className="flex items-center gap-2">
                  <CalendarIcon className="w-4 h-4 text-muted-foreground" />
                  <Label>Schedule Publishing (Optional)</Label>
                </div>
                <p className="text-sm text-muted-foreground">
                  Set a future date and time to automatically publish this content.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1 block">Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !scheduledPublishAt && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {scheduledPublishAt ? format(scheduledPublishAt, "PPP") : "Pick a date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={scheduledPublishAt}
                          onSelect={setScheduledPublishAt}
                          disabled={(date) => date < new Date()}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1 block">Time</Label>
                    <Input
                      type="time"
                      value={scheduledTime}
                      onChange={(e) => setScheduledTime(e.target.value)}
                      className="w-full"
                    />
                  </div>
                </div>
                {scheduledPublishAt && (
                  <div className="flex items-center justify-between p-3 bg-primary/10 rounded-md">
                    <p className="text-sm">
                      Scheduled for: <strong>{format(scheduledPublishAt, "PPP")} at {scheduledTime}</strong>
                    </p>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setScheduledPublishAt(undefined)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </div>
            )}
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-2 pt-4 border-t">
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          )}
          <Button type="submit" disabled={saving}>
            {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {resourceId ? 'Update Resource' : 'Create Resource'}
          </Button>
        </div>
      </form>
    </Form>
  );
};

export default ContentResourceForm;
