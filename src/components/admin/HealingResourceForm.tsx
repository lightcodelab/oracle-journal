import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Loader2, Upload, X, ImageIcon, Link as LinkIcon, Sparkles, Eye, BookOpen, Users, AlertTriangle, Plus } from 'lucide-react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import LinkExtension from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import Image from '@tiptap/extension-image';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import RichTextEditorToolbar from './RichTextEditorToolbar';
import { VimeoEmbed } from '@/components/VimeoEmbed';

type Modality = 'meditation' | 'visualisation' | 'ritual' | 'somatic' | 'process';
type ResourceStatus = 'draft' | 'review' | 'published';

interface Symptom {
  id: string;
  name: string;
  domain: 'physical' | 'mental' | 'emotional' | 'spiritual';
  description: string | null;
}

interface HealingResourceFormProps {
  resourceId?: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

const modalityOptions: { value: Modality; label: string; icon: React.ReactNode }[] = [
  { value: 'meditation', label: 'Meditation', icon: <Sparkles className="w-4 h-4" /> },
  { value: 'visualisation', label: 'Visualisation', icon: <Eye className="w-4 h-4" /> },
  { value: 'ritual', label: 'Ritual', icon: <BookOpen className="w-4 h-4" /> },
  { value: 'somatic', label: 'Somatic', icon: <Users className="w-4 h-4" /> },
  { value: 'process', label: 'Process', icon: <AlertTriangle className="w-4 h-4" /> },
];

const domainColors: Record<string, string> = {
  physical: 'bg-green-500/20 text-green-700 dark:text-green-400',
  mental: 'bg-blue-500/20 text-blue-700 dark:text-blue-400',
  emotional: 'bg-purple-500/20 text-purple-700 dark:text-purple-400',
  spiritual: 'bg-amber-500/20 text-amber-700 dark:text-amber-400',
};

const HealingResourceForm = ({ resourceId, onSuccess, onCancel }: HealingResourceFormProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  
  // Form state
  const [title, setTitle] = useState('');
  const [modality, setModality] = useState<Modality>('meditation');
  const [intensity, setIntensity] = useState(3);
  const [durationSec, setDurationSec] = useState(0);
  const [status, setStatus] = useState<ResourceStatus>('draft');
  const [displayImageUrl, setDisplayImageUrl] = useState<string | null>(null);
  const [vimeoEmbedUrl, setVimeoEmbedUrl] = useState('');
  
  // Symptoms state
  const [symptoms, setSymptoms] = useState<Symptom[]>([]);
  const [selectedSymptomIds, setSelectedSymptomIds] = useState<string[]>([]);
  const [addSymptomOpen, setAddSymptomOpen] = useState(false);
  const [newSymptomName, setNewSymptomName] = useState('');
  const [newSymptomDomain, setNewSymptomDomain] = useState<'physical' | 'mental' | 'emotional' | 'spiritual'>('physical');
  const [newSymptomDescription, setNewSymptomDescription] = useState('');
  const [addingSymptom, setAddingSymptom] = useState(false);
  const [symptomSearch, setSymptomSearch] = useState('');

  const editor = useEditor({
    extensions: [
      StarterKit,
      LinkExtension.configure({ openOnClick: false }),
      Placeholder.configure({ placeholder: 'Describe the healing practice and its benefits...' }),
      Image.configure({
        HTMLAttributes: { class: 'max-w-full h-auto rounded-md' },
      }),
      Underline,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
    ],
    editorProps: {
      attributes: {
        class: 'prose prose-sm dark:prose-invert max-w-none min-h-[200px] focus:outline-none p-4',
      },
    },
  });

  useEffect(() => {
    loadSymptoms();
    if (resourceId) {
      loadResource();
    }
  }, [resourceId]);

  const loadSymptoms = async () => {
    const { data, error } = await supabase
      .from('symptoms')
      .select('*')
      .order('domain', { ascending: true });
    
    if (data) {
      setSymptoms(data);
    }
  };

  const handleAddSymptom = async () => {
    if (!newSymptomName.trim()) {
      toast({
        title: 'Name required',
        description: 'Please enter a symptom name.',
        variant: 'destructive',
      });
      return;
    }

    setAddingSymptom(true);

    try {
      const { data: newSymptom, error } = await supabase
        .from('symptoms')
        .insert({
          name: newSymptomName.trim(),
          domain: newSymptomDomain,
          description: newSymptomDescription.trim() || null,
        })
        .select()
        .single();

      if (error) throw error;

      // Add to local symptoms list
      setSymptoms(prev => [...prev, newSymptom]);
      
      // Auto-select the new symptom for this resource
      setSelectedSymptomIds(prev => [...prev, newSymptom.id]);

      toast({ title: 'Symptom added and linked to resource' });

      // Reset form and close dialog
      setNewSymptomName('');
      setNewSymptomDomain('physical');
      setNewSymptomDescription('');
      setAddSymptomOpen(false);
    } catch (error: any) {
      console.error('Error adding symptom:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to add symptom.',
        variant: 'destructive',
      });
    } finally {
      setAddingSymptom(false);
    }
  };

  const loadResource = async () => {
    if (!resourceId) return;
    setLoading(true);

    const { data: resource, error } = await supabase
      .from('healing_resources')
      .select('*')
      .eq('id', resourceId)
      .single();

    if (resource) {
      setTitle(resource.title);
      setModality(resource.modality as Modality);
      setIntensity(resource.intensity || 3);
      setDurationSec(resource.duration_sec || 0);
      setStatus(resource.status as ResourceStatus);
      setDisplayImageUrl(resource.display_image_url);
      setVimeoEmbedUrl(resource.vimeo_embed_url || '');
      
      if (editor && resource.body_richtext && typeof resource.body_richtext === 'object') {
        editor.commands.setContent(resource.body_richtext as Record<string, unknown>);
      }

      // Load linked symptoms
      const { data: mappings } = await supabase
        .from('resource_symptom_mappings')
        .select('symptom_id')
        .eq('resource_id', resourceId);
      
      if (mappings) {
        setSelectedSymptomIds(mappings.map(m => m.symptom_id));
      }
    }

    setLoading(false);
  };

  const handleImageUpload = async (file: File) => {
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Invalid file type',
        description: 'Please select an image file.',
        variant: 'destructive',
      });
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: 'File too large',
        description: 'Images must be under 10MB.',
        variant: 'destructive',
      });
      return;
    }

    setUploading(true);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('healing-resource-images')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      setDisplayImageUrl(fileName);
      toast({ title: 'Image uploaded' });
    } catch (error: any) {
      console.error('Error uploading image:', error);
      toast({
        title: 'Upload failed',
        description: error.message || 'Failed to upload image.',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  const extractVimeoId = (url: string): string | null => {
    const match = url.match(/vimeo\.com\/(\d+)/);
    return match ? match[1] : null;
  };

  const handleSave = async () => {
    if (!title.trim()) {
      toast({
        title: 'Title required',
        description: 'Please enter a title for the resource.',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);

    try {
      const payload = {
        title,
        modality,
        intensity,
        duration_sec: durationSec || null,
        status,
        display_image_url: displayImageUrl,
        vimeo_embed_url: vimeoEmbedUrl || null,
        body_richtext: editor?.getJSON() as any || null,
        locale: 'en',
        tier: 'paid' as const, // No free tier for the bot
      };

      let savedResourceId = resourceId;

      if (resourceId) {
        const { error } = await supabase
          .from('healing_resources')
          .update(payload)
          .eq('id', resourceId);

        if (error) throw error;
      } else {
        const { data: newResource, error } = await supabase
          .from('healing_resources')
          .insert(payload)
          .select()
          .single();

        if (error) throw error;
        savedResourceId = newResource.id;
      }

      // Update symptom mappings
      if (savedResourceId) {
        // Delete existing mappings
        await supabase
          .from('resource_symptom_mappings')
          .delete()
          .eq('resource_id', savedResourceId);

        // Insert new mappings
        if (selectedSymptomIds.length > 0) {
          const mappings = selectedSymptomIds.map(symptomId => ({
            resource_id: savedResourceId,
            symptom_id: symptomId,
          }));

          const { error: mappingError } = await supabase
            .from('resource_symptom_mappings')
            .insert(mappings);

          if (mappingError) {
            console.error('Error saving symptom mappings:', mappingError);
          }
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

  const toggleSymptom = (symptomId: string) => {
    setSelectedSymptomIds(prev => 
      prev.includes(symptomId)
        ? prev.filter(id => id !== symptomId)
        : [...prev, symptomId]
    );
  };

  const filteredSymptoms = symptoms.filter(s =>
    s.name.toLowerCase().includes(symptomSearch.toLowerCase())
  );

  const groupedSymptoms = filteredSymptoms.reduce((acc, symptom) => {
    if (!acc[symptom.domain]) {
      acc[symptom.domain] = [];
    }
    acc[symptom.domain].push(symptom);
    return acc;
  }, {} as Record<string, Symptom[]>);

  const getImageUrl = (path: string | null) => {
    if (!path) return null;
    if (path.startsWith('http')) return path;
    return supabase.storage.from('healing-resource-images').getPublicUrl(path).data.publicUrl;
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
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="content">Content</TabsTrigger>
          <TabsTrigger value="symptoms">Symptoms</TabsTrigger>
          <TabsTrigger value="media">Media</TabsTrigger>
        </TabsList>

        {/* Details Tab */}
        <TabsContent value="details" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter resource title"
              />
            </div>

            <div>
              <Label htmlFor="modality">Modality *</Label>
              <Select value={modality} onValueChange={(v) => setModality(v as Modality)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {modalityOptions.map(m => (
                    <SelectItem key={m.value} value={m.value}>
                      <div className="flex items-center gap-2">
                        {m.icon}
                        {m.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="status">Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as ResourceStatus)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="review">Review</SelectItem>
                  <SelectItem value="published">Published</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="col-span-2">
              <Label>Intensity: {intensity}</Label>
              <Slider
                value={[intensity]}
                onValueChange={(v) => setIntensity(v[0])}
                min={1}
                max={5}
                step={1}
                className="mt-2"
              />
              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                <span>Gentle</span>
                <span>Moderate</span>
                <span>Intense</span>
              </div>
            </div>

            <div>
              <Label htmlFor="duration">Duration (seconds)</Label>
              <Input
                id="duration"
                type="number"
                value={durationSec}
                onChange={(e) => setDurationSec(parseInt(e.target.value) || 0)}
                placeholder="e.g., 600 for 10 minutes"
              />
            </div>
          </div>
        </TabsContent>

        {/* Content Tab - Rich Text Editor */}
        <TabsContent value="content" className="space-y-4 mt-4">
          <div>
            <Label>Teaching Description</Label>
            <div className="border rounded-md mt-2 overflow-hidden">
              {editor && <RichTextEditorToolbar editor={editor} />}
              <EditorContent editor={editor} />
            </div>
          </div>
        </TabsContent>

        {/* Symptoms Tab */}
        <TabsContent value="symptoms" className="space-y-4 mt-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label>Link Symptoms to Resource</Label>
              <Dialog open={addSymptomOpen} onOpenChange={setAddSymptomOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Plus className="w-4 h-4 mr-2" />
                    Add a new Symptom
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add New Symptom</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 pt-4">
                    <div>
                      <Label htmlFor="symptomName">Symptom Name *</Label>
                      <Input
                        id="symptomName"
                        value={newSymptomName}
                        onChange={(e) => setNewSymptomName(e.target.value)}
                        placeholder="e.g., Anxiety, Fatigue, Grief"
                      />
                    </div>
                    <div>
                      <Label htmlFor="symptomDomain">Domain *</Label>
                      <Select value={newSymptomDomain} onValueChange={(v) => setNewSymptomDomain(v as any)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="physical">Physical</SelectItem>
                          <SelectItem value="mental">Mental</SelectItem>
                          <SelectItem value="emotional">Emotional</SelectItem>
                          <SelectItem value="spiritual">Spiritual</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="symptomDescription">Description (optional)</Label>
                      <Input
                        id="symptomDescription"
                        value={newSymptomDescription}
                        onChange={(e) => setNewSymptomDescription(e.target.value)}
                        placeholder="Brief description of the symptom"
                      />
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                      <Button variant="outline" onClick={() => setAddSymptomOpen(false)}>
                        Cancel
                      </Button>
                      <Button onClick={handleAddSymptom} disabled={addingSymptom}>
                        {addingSymptom && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                        Add Symptom
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Select the symptoms this resource helps address. This powers the recommendation engine.
            </p>
            
            <Input
              placeholder="Search symptoms..."
              value={symptomSearch}
              onChange={(e) => setSymptomSearch(e.target.value)}
              className="mb-4"
            />

            {selectedSymptomIds.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-4 p-3 bg-muted/50 rounded-md">
                <span className="text-sm text-muted-foreground">Selected:</span>
                {selectedSymptomIds.map(id => {
                  const symptom = symptoms.find(s => s.id === id);
                  return symptom ? (
                    <Badge 
                      key={id} 
                      variant="secondary"
                      className="cursor-pointer"
                      onClick={() => toggleSymptom(id)}
                    >
                      {symptom.name}
                      <X className="w-3 h-3 ml-1" />
                    </Badge>
                  ) : null;
                })}
              </div>
            )}

            <ScrollArea className="h-[400px] pr-4">
              {Object.entries(groupedSymptoms).map(([domain, domainSymptoms]) => (
                <div key={domain} className="mb-6">
                  <h4 className="font-medium capitalize mb-2 flex items-center gap-2">
                    <Badge className={domainColors[domain]}>{domain}</Badge>
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {domainSymptoms.map(symptom => (
                      <div
                        key={symptom.id}
                        className={`flex items-center space-x-3 p-2 rounded-md cursor-pointer transition-colors ${
                          selectedSymptomIds.includes(symptom.id)
                            ? 'bg-primary/10 border border-primary/30'
                            : 'hover:bg-muted'
                        }`}
                        onClick={() => toggleSymptom(symptom.id)}
                      >
                        <Checkbox
                          checked={selectedSymptomIds.includes(symptom.id)}
                          onCheckedChange={() => toggleSymptom(symptom.id)}
                        />
                        <span className="text-sm">{symptom.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              {filteredSymptoms.length === 0 && (
                <p className="text-center text-muted-foreground py-8">
                  No symptoms found. Add symptoms in the Symptoms tab.
                </p>
              )}
            </ScrollArea>
          </div>
        </TabsContent>

        {/* Media Tab */}
        <TabsContent value="media" className="space-y-6 mt-4">
          {/* Image Upload */}
          <div>
            <Label>Display Image</Label>
            {displayImageUrl ? (
              <div className="mt-2 space-y-2">
                <img
                  src={getImageUrl(displayImageUrl) || ''}
                  alt="Resource preview"
                  className="w-full max-w-md h-48 object-cover rounded-md"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setDisplayImageUrl(null)}
                >
                  <X className="w-4 h-4 mr-2" />
                  Remove Image
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2 mt-2">
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

          {/* Vimeo Embed */}
          <div>
            <Label htmlFor="vimeoUrl">Vimeo Video Embed URL</Label>
            <div className="flex gap-2 mt-2">
              <Input
                id="vimeoUrl"
                value={vimeoEmbedUrl}
                onChange={(e) => setVimeoEmbedUrl(e.target.value)}
                placeholder="https://vimeo.com/123456789"
                className="flex-1"
              />
              <LinkIcon className="w-5 h-5 text-muted-foreground self-center" />
            </div>
            {vimeoEmbedUrl && extractVimeoId(vimeoEmbedUrl) && (
              <div className="mt-4">
                <Label className="text-sm text-muted-foreground">Preview:</Label>
                <div className="mt-2 max-w-md">
                  <VimeoEmbed videoId={extractVimeoId(vimeoEmbedUrl)!} title="Video preview" />
                </div>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Action Buttons */}
      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={handleSave} disabled={saving}>
          {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          {resourceId ? 'Update Resource' : 'Create Resource'}
        </Button>
      </div>
    </div>
  );
};

export default HealingResourceForm;
