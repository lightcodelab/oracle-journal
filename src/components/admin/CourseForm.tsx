import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, X, Image as ImageIcon } from 'lucide-react';
import CourseLessonEditor from './CourseLessonEditor';
import CourseTagPicker from './CourseTagPicker';

interface Category {
  id: string;
  name: string;
  type: string;
}

interface CourseFormProps {
  courseId?: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

const CourseForm = ({ courseId, onSuccess, onCancel }: CourseFormProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [locations, setLocations] = useState<Category[]>([]);

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [locationId, setLocationId] = useState<string>('');
  const [displayOrder, setDisplayOrder] = useState<number>(0);
  const [isPublished, setIsPublished] = useState(false);
  const [savedCourseId, setSavedCourseId] = useState<string | null>(courseId || null);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);

  useEffect(() => {
    fetchLocations();
    if (courseId) {
      fetchCourse();
      fetchCourseTags(courseId);
    }
  }, [courseId]);

  const fetchCourseTags = async (id: string) => {
    const { data } = await supabase
      .from('course_tag_assignments')
      .select('tag_id')
      .eq('course_id', id);
    if (data) setSelectedTagIds(data.map((row: any) => row.tag_id));
  };

  const syncCourseTags = async (id: string) => {
    // Replace strategy: delete all then insert current selection
    await supabase.from('course_tag_assignments').delete().eq('course_id', id);
    if (selectedTagIds.length > 0) {
      const rows = selectedTagIds.map((tag_id) => ({ course_id: id, tag_id }));
      await supabase.from('course_tag_assignments').insert(rows);
    }
  };

  const fetchLocations = async () => {
    const { data } = await supabase
      .from('content_categories')
      .select('*')
      .eq('active', true)
      .eq('type', 'location')
      .order('name');
    if (data) setLocations(data as Category[]);
  };

  const fetchCourse = async () => {
    if (!courseId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('courses')
      .select('*')
      .eq('id', courseId)
      .single();

    if (data) {
      setTitle(data.title);
      setDescription(data.description || '');
      setImageUrl(data.image_url);
      setLocationId(data.location_id || '');
      setDisplayOrder(data.display_order ?? 0);
      setIsPublished(data.is_published ?? false);
      setSavedCourseId(data.id);
    }
    setLoading(false);
  };

  const handleImageUpload = async (file: File) => {
    setUploading(true);
    try {
      const { compressImage, isCompressibleImage } = await import('@/lib/imageCompression');
      const processedFile = isCompressibleImage(file) ? await compressImage(file) : file;
      const fileExt = processedFile.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('content-images')
        .upload(fileName, processedFile);
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('content-images')
        .getPublicUrl(fileName);

      setImageUrl(publicUrl);
      toast({ title: 'Uploaded', description: 'Image uploaded successfully.' });
    } catch (error: any) {
      toast({ title: 'Error', description: 'Failed to upload image.', variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!title.trim()) {
      toast({ title: 'Error', description: 'Title is required.', variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      const payload = {
        title: title.trim(),
        description: description.trim() || null,
        image_url: imageUrl,
        location_id: locationId || null,
        display_order: displayOrder,
        is_published: isPublished,
        updated_at: new Date().toISOString(),
      };

      if (savedCourseId) {
        const { error } = await supabase.from('courses').update(payload).eq('id', savedCourseId);
        if (error) throw error;
        await syncCourseTags(savedCourseId);
        toast({ title: 'Updated', description: 'Course updated successfully.' });
        onSuccess?.();
      } else {
        const { data, error } = await supabase.from('courses').insert(payload).select().single();
        if (error) throw error;
        setSavedCourseId(data.id);
        await syncCourseTags(data.id);
        toast({ title: 'Created', description: 'Course created. You can now add lessons below.' });
      }
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || 'Failed to save course.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="details" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="lessons" disabled={!savedCourseId}>
            Lessons {!savedCourseId && '(save first)'}
          </TabsTrigger>
          <TabsTrigger value="publishing">Publishing</TabsTrigger>
        </TabsList>

        <TabsContent value="details" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Title *</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Course title" />
            </div>
            <div className="space-y-2">
              <Label>Location</Label>
              <Select value={locationId} onValueChange={setLocationId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select location" />
                </SelectTrigger>
                <SelectContent>
                  {locations.map((loc) => (
                    <SelectItem key={loc.id} value={loc.id}>{loc.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of the course"
              rows={3}
            />
          </div>

          <CourseTagPicker
            selectedTagIds={selectedTagIds}
            onChange={setSelectedTagIds}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Display Order</Label>
              <Input
                type="number"
                value={displayOrder}
                onChange={(e) => setDisplayOrder(parseInt(e.target.value) || 0)}
              />
            </div>
            <div className="space-y-2">
              <Label>Course Image</Label>
              {imageUrl ? (
                <div className="flex items-center gap-2 p-3 bg-muted rounded-md">
                  <ImageIcon className="w-5 h-5 text-primary flex-shrink-0" />
                  <span className="flex-1 text-sm truncate">{imageUrl}</span>
                  <Button type="button" variant="ghost" size="sm" onClick={() => setImageUrl(null)}>
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
                      if (file) handleImageUpload(file);
                    }}
                    disabled={uploading}
                    className="flex-1"
                  />
                  {uploading && <Loader2 className="w-4 h-4 animate-spin" />}
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="lessons" className="mt-4">
          {savedCourseId ? (
            <CourseLessonEditor courseId={savedCourseId} />
          ) : (
            <Card>
              <CardContent className="pt-6">
                <p className="text-muted-foreground text-sm text-center">
                  Save the course first to add lessons.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="publishing" className="space-y-4 mt-4">
          <div className="flex flex-row items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <Label className="text-base">Published</Label>
              <p className="text-sm text-muted-foreground">
                Only published courses are visible to users
              </p>
            </div>
            <Switch checked={isPublished} onCheckedChange={setIsPublished} />
          </div>
        </TabsContent>
      </Tabs>

      <div className="flex justify-end gap-2 pt-4 border-t">
        {onCancel && (
          <Button variant="outline" onClick={onCancel}>Cancel</Button>
        )}
        <Button onClick={handleSave} disabled={saving}>
          {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          {savedCourseId ? 'Update Course' : 'Create Course'}
        </Button>
      </div>
    </div>
  );
};

export default CourseForm;
