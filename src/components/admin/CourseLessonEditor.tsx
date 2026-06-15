import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useToast } from '@/hooks/use-toast';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import LinkExtension from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import { SelectableImageExtension } from '@/lib/selectableImageExtension';
import RichTextEditorToolbar from './RichTextEditorToolbar';
import { VimeoEmbed } from '@/components/VimeoEmbed';
import {
  Plus, Trash2, ChevronDown, ChevronRight, Loader2, FileText, Save, X,
  Link as LinkIcon, FileAudio, BookOpen, FolderPlus,
} from 'lucide-react';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import AudioFileList from './AudioFileList';
import LessonFormBuilder from './LessonFormBuilder';
import { LessonFormQuestion, legacyToFormQuestions } from '@/lib/lessonFormTypes';

interface Lesson {
  id: string;
  course_id: string;
  lesson_number: number;
  title: string;
  description: string | null;
  content: string;
  audio_url: string | null;
  audio_timestamp: string | null;
  survey_question: string | null;
  survey_options: string[] | null;
  form_questions: LessonFormQuestion[] | null;
  body_richtext: any;
  main_media_embed_url: string | null;
  main_media_kind: string | null;
  main_media_file_url: string | null;
  module_title: string | null;
  module_order: number | null;
}

interface Module {
  title: string;
  order: number;
}

interface CourseLessonEditorProps {
  courseId: string;
}

interface AudioFile {
  id?: string;
  file_url: string;
  file_name: string;
  display_order: number;
}

const LessonEditorPanel = ({
  lesson,
  modules,
  onSave,
  onDelete,
}: {
  lesson: Lesson;
  modules: Module[];
  onSave: (id: string, data: Partial<Lesson>, audioFiles: AudioFile[]) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) => {
  const { toast } = useToast();
  const [expanded, setExpanded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadingAudio, setUploadingAudio] = useState(false);
  const [title, setTitle] = useState(lesson.title);
  const [moduleTitle, setModuleTitle] = useState(lesson.module_title || '');
  const [description, setDescription] = useState(lesson.description || '');
  const [audioFiles, setAudioFiles] = useState<AudioFile[]>([]);
  const [audioTimestamp, setAudioTimestamp] = useState(lesson.audio_timestamp || '');
  const [surveyQuestion, setSurveyQuestion] = useState(lesson.survey_question || '');
  const [surveyOptions, setSurveyOptions] = useState<string[]>(
    Array.isArray(lesson.survey_options) ? lesson.survey_options : []
  );
  const [formQuestions, setFormQuestions] = useState<LessonFormQuestion[]>(
    Array.isArray(lesson.form_questions) && lesson.form_questions.length > 0
      ? (lesson.form_questions as LessonFormQuestion[])
      : (legacyToFormQuestions(lesson.survey_question, Array.isArray(lesson.survey_options) ? lesson.survey_options : null) || [])
  );
  const [mediaKind, setMediaKind] = useState(lesson.main_media_kind || 'none');
  const [mediaEmbedUrl, setMediaEmbedUrl] = useState(lesson.main_media_embed_url || '');
  const [mediaFileUrl, setMediaFileUrl] = useState(lesson.main_media_file_url || '');

  // Load audio files when expanded
  useEffect(() => {
    if (expanded && lesson.id) {
      supabase
        .from('lesson_audio_files')
        .select('*')
        .eq('lesson_id', lesson.id)
        .order('display_order')
        .then(({ data }) => {
          if (data && data.length > 0) {
            setAudioFiles(data.map(a => ({ id: a.id, file_url: a.file_url, file_name: a.file_name, display_order: a.display_order })));
          } else if (lesson.audio_url) {
            // Legacy fallback
            setAudioFiles([{ file_url: lesson.audio_url, file_name: lesson.audio_url.split('/').pop() || 'Audio', display_order: 0 }]);
          }
        });
    }
  }, [expanded, lesson.id]);

  const getAudioPublicUrl = (path: string) => {
    if (path.startsWith('http')) return path;
    if (path.startsWith('/')) return path;
    return supabase.storage.from('content-main-media').getPublicUrl(path).data.publicUrl;
  };

  const editor = useEditor({
    extensions: [
      StarterKit,
      LinkExtension.configure({ openOnClick: false }),
      Placeholder.configure({ placeholder: 'Write your lesson content here...' }),
      SelectableImageExtension.configure({
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
    content: lesson.body_richtext || (lesson.content ? `<p>${lesson.content}</p>` : ''),
  });

  const handleSave = async () => {
    setSaving(true);
    await onSave(lesson.id, {
      title,
      description: description || null,
      content: editor?.getText() || '',
      body_richtext: editor?.getJSON() || null,
      audio_url: audioFiles.length > 0 ? audioFiles[0].file_url : null,
      audio_timestamp: audioTimestamp || null,
      survey_question: surveyQuestion || null,
      survey_options: surveyOptions.length > 0 ? surveyOptions : null,
      form_questions: formQuestions.length > 0 ? formQuestions : null,
      main_media_kind: mediaKind,
      main_media_embed_url: mediaKind === 'video_embed' ? mediaEmbedUrl : null,
      main_media_file_url: mediaKind === 'file' ? mediaFileUrl : null,
      module_title: moduleTitle || null,
    }, audioFiles);
    setSaving(false);
  };

  const handleAudioUpload = async (file: File) => {
    setUploadingAudio(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const { error } = await supabase.storage.from('content-main-media').upload(fileName, file);
      if (error) throw error;
      const displayName = file.name.replace(/\.[^.]+$/, '');
      setAudioFiles(prev => [...prev, { file_url: fileName, file_name: displayName, display_order: prev.length }]);
      toast({ title: 'Uploaded', description: 'Audio file uploaded.' });
    } catch {
      toast({ title: 'Error', description: 'Audio upload failed.', variant: 'destructive' });
    } finally {
      setUploadingAudio(false);
    }
  };

  const handleFileUpload = async (file: File) => {
    setUploading(true);
    try {
      const { compressImage, isCompressibleImage } = await import('@/lib/imageCompression');
      const processedFile = isCompressibleImage(file) ? await compressImage(file) : file;
      const fileExt = processedFile.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

      const { error } = await supabase.storage.from('content-main-media').upload(fileName, processedFile);
      if (error) throw error;

      setMediaFileUrl(fileName);
      toast({ title: 'Uploaded', description: 'File uploaded.' });
    } catch (error: any) {
      toast({ title: 'Error', description: 'Upload failed.', variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  const extractVideoId = (url: string) => {
    const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
    if (vimeoMatch) return { platform: 'vimeo', id: vimeoMatch[1] };
    return null;
  };

  return (
    <Card>
      <Collapsible open={expanded} onOpenChange={setExpanded}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors py-3">
            <div className="flex items-center gap-3">
              {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              <FileText className="w-4 h-4 text-primary" />
              <CardTitle className="text-base font-medium flex-1">
                Lesson {lesson.lesson_number}: {title || 'Untitled'}
              </CardTitle>
              <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Lesson?</AlertDialogTitle>
                      <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={() => onDelete(lesson.id)}>Delete</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="space-y-6 pt-0">
            {/* Basic Info */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Lesson Title *</Label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Lesson title" />
              </div>
              <div className="space-y-2">
                <Label>Lesson Number</Label>
                <Input type="number" value={lesson.lesson_number} disabled className="bg-muted" />
              </div>
              <div className="space-y-2">
                <Label>Module (Optional)</Label>
                <Select value={moduleTitle || '__none__'} onValueChange={(v) => setModuleTitle(v === '__none__' ? '' : v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="No module" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">No module</SelectItem>
                    {modules.map((m) => (
                      <SelectItem key={m.title} value={m.title}>{m.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Short Description</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief lesson description"
                rows={2}
              />
            </div>

            {/* Rich Text Content */}
            <div className="space-y-2">
              <Label>Lesson Content</Label>
              <div className="border rounded-md overflow-hidden">
                {editor && <RichTextEditorToolbar editor={editor} />}
                <EditorContent editor={editor} />
              </div>
            </div>

            {/* Audio Files (Multiple) */}
            <div className="space-y-2">
              <Label>Audio Files</Label>
              
              <AudioFileList
                audioFiles={audioFiles}
                onChange={setAudioFiles}
                getPublicUrl={getAudioPublicUrl}
              />

              <div className="flex items-center gap-2">
                <Input
                  type="file"
                  accept="audio/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleAudioUpload(file);
                  }}
                  disabled={uploadingAudio}
                  className="flex-1"
                />
                {uploadingAudio && <Loader2 className="w-4 h-4 animate-spin" />}
              </div>
              <p className="text-xs text-muted-foreground">
                Upload multiple audio files. Each displays as a separate player.
              </p>
            </div>

            {/* Media */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Main Media Type</Label>
                <Select value={mediaKind} onValueChange={setMediaKind}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No media</SelectItem>
                    <SelectItem value="file">Upload file</SelectItem>
                    <SelectItem value="video_embed">Video embed (YouTube/Vimeo)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {mediaKind === 'file' && (
                <div className="space-y-2">
                  <Label>Upload Media File</Label>
                  {mediaFileUrl ? (
                    <div className="flex items-center gap-2 p-3 bg-muted rounded-md">
                      <FileAudio className="w-5 h-5 text-primary" />
                      <span className="flex-1 text-sm truncate">{mediaFileUrl}</span>
                      <Button variant="ghost" size="sm" onClick={() => setMediaFileUrl('')}>
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
                          if (file) handleFileUpload(file);
                        }}
                        disabled={uploading}
                        className="flex-1"
                      />
                      {uploading && <Loader2 className="w-4 h-4 animate-spin" />}
                    </div>
                  )}
                </div>
              )}

              {mediaKind === 'video_embed' && (
                <div className="space-y-2">
                  <Label>Video URL</Label>
                  <div className="flex items-center gap-2">
                    <LinkIcon className="w-4 h-4 text-muted-foreground" />
                    <Input
                      value={mediaEmbedUrl}
                      onChange={(e) => setMediaEmbedUrl(e.target.value)}
                      placeholder="https://vimeo.com/123456789"
                    />
                  </div>
                  {mediaEmbedUrl && extractVideoId(mediaEmbedUrl)?.platform === 'vimeo' && (
                    <div className="mt-2">
                      <VimeoEmbed videoId={extractVideoId(mediaEmbedUrl)!.id} />
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Lesson Form (Google Forms–style) */}
            <div className="space-y-4 p-4 border border-dashed rounded-lg">
              <div>
                <Label className="text-base">Lesson Prompts (Optional)</Label>
                <p className="text-xs text-muted-foreground mt-1">
                  Add one or more questions. Supports short answer, paragraph, multiple choice,
                  checkboxes, dropdown, linear scale, date, time, number, and email.
                </p>
              </div>
              <LessonFormBuilder questions={formQuestions} onChange={setFormQuestions} />
            </div>

            {/* Save Button */}
            <div className="flex justify-end">
              <Button onClick={handleSave} disabled={saving}>
                {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                Save Lesson
              </Button>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};

const CourseLessonEditor = ({ courseId }: CourseLessonEditorProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [newLessonTitle, setNewLessonTitle] = useState('');
  const [newModuleTitle, setNewModuleTitle] = useState('');
  const [showModuleInput, setShowModuleInput] = useState(false);

  // Derive modules from lesson data
  const modules: Module[] = Array.from(
    new Set(lessons.filter(l => l.module_title).map(l => l.module_title!))
  ).map((title, i) => ({
    title,
    order: lessons.find(l => l.module_title === title)?.module_order ?? i,
  })).sort((a, b) => a.order - b.order);

  useEffect(() => {
    fetchLessons();
  }, [courseId]);

  const fetchLessons = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('lessons')
      .select('*')
      .eq('course_id', courseId)
      .order('module_order', { ascending: true })
      .order('lesson_number', { ascending: true });

    if (data) setLessons(data as unknown as Lesson[]);
    setLoading(false);
  };

  const addModule = () => {
    if (!newModuleTitle.trim()) return;
    // Module is just a label — it's created when a lesson is assigned to it.
    // We add a placeholder so it shows in the selector immediately.
    const exists = modules.some(m => m.title === newModuleTitle.trim());
    if (exists) {
      toast({ title: 'Exists', description: 'A module with that name already exists.' });
      return;
    }
    // We'll store the module by creating a new lesson in it, or just track it locally
    // For now, just show it in the UI and it persists once a lesson uses it
    toast({ title: 'Module created', description: `"${newModuleTitle.trim()}" is now available. Assign lessons to it.` });
    // Add a temp module entry by updating modules derived state
    // We need to force it into the list — easiest: create a hidden "marker"
    // Actually let's just keep it simple and add it to the modules list via state
    setTempModules(prev => [...prev, { title: newModuleTitle.trim(), order: modules.length + prev.length }]);
    setNewModuleTitle('');
    setShowModuleInput(false);
  };

  const [tempModules, setTempModules] = useState<Module[]>([]);
  const allModules = [
    ...modules,
    ...tempModules.filter(tm => !modules.some(m => m.title === tm.title)),
  ];

  const addLesson = async () => {
    if (!newLessonTitle.trim()) return;

    const maxNumber = lessons.length > 0 ? Math.max(...lessons.map(l => l.lesson_number)) : 0;

    const { data, error } = await supabase
      .from('lessons')
      .insert({
        course_id: courseId,
        title: newLessonTitle.trim(),
        lesson_number: maxNumber + 1,
        content: '',
      })
      .select()
      .single();

    if (error) {
      toast({ title: 'Error', description: 'Failed to add lesson.', variant: 'destructive' });
      return;
    }

    setLessons([...lessons, data as unknown as Lesson]);
    setNewLessonTitle('');
    toast({ title: 'Added', description: 'Lesson added. Expand it to add content.' });
  };

  const saveLesson = async (id: string, data: Partial<Lesson>, lessonAudioFiles?: AudioFile[]) => {
    const { error } = await supabase.from('lessons').update(data as any).eq('id', id);
    if (error) {
      toast({ title: 'Error', description: 'Failed to save lesson.', variant: 'destructive' });
      return;
    }

    // Save audio files
    if (lessonAudioFiles) {
      await supabase.from('lesson_audio_files').delete().eq('lesson_id', id);
      if (lessonAudioFiles.length > 0) {
        await supabase.from('lesson_audio_files').insert(
          lessonAudioFiles.map((af, idx) => ({
            lesson_id: id,
            file_url: af.file_url,
            file_name: af.file_name,
            display_order: idx,
          }))
        );
      }
    }

    setLessons(lessons.map(l => l.id === id ? { ...l, ...data } : l));
    toast({ title: 'Saved', description: 'Lesson saved successfully.' });
  };

  const deleteLesson = async (id: string) => {
    const { error } = await supabase.from('lessons').delete().eq('id', id);
    if (error) {
      toast({ title: 'Error', description: 'Failed to delete lesson.', variant: 'destructive' });
      return;
    }
    setLessons(lessons.filter(l => l.id !== id));
    toast({ title: 'Deleted', description: 'Lesson deleted.' });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  // Group lessons: unassigned first, then by module
  const unassignedLessons = lessons.filter(l => !l.module_title);
  const groupedByModule = allModules.map(m => ({
    module: m,
    lessons: lessons.filter(l => l.module_title === m.title),
  }));

  return (
    <div className="space-y-6">
      {/* Actions bar */}
      <div className="flex flex-wrap gap-2">
        <div className="flex gap-2 flex-1 min-w-[200px]">
          <Input
            placeholder="New lesson title"
            value={newLessonTitle}
            onChange={(e) => setNewLessonTitle(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addLesson()}
          />
          <Button onClick={addLesson} disabled={!newLessonTitle.trim()}>
            <Plus className="w-4 h-4 mr-2" />
            Add Lesson
          </Button>
        </div>
        {showModuleInput ? (
          <div className="flex gap-2">
            <Input
              placeholder="Module name"
              value={newModuleTitle}
              onChange={(e) => setNewModuleTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') addModule();
                if (e.key === 'Escape') { setShowModuleInput(false); setNewModuleTitle(''); }
              }}
              autoFocus
              className="w-48"
            />
            <Button onClick={addModule} disabled={!newModuleTitle.trim()} size="sm">Add</Button>
            <Button variant="ghost" size="sm" onClick={() => { setShowModuleInput(false); setNewModuleTitle(''); }}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        ) : (
          <Button variant="outline" onClick={() => setShowModuleInput(true)}>
            <FolderPlus className="w-4 h-4 mr-2" />
            Add Module
          </Button>
        )}
      </div>

      {/* Unassigned lessons */}
      {unassignedLessons.length > 0 && (
        <div className="space-y-3">
          {groupedByModule.length > 0 && (
            <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
              Unassigned Lessons
            </h3>
          )}
          {unassignedLessons.map((lesson) => (
            <LessonEditorPanel
              key={lesson.id}
              lesson={lesson}
              modules={allModules}
              onSave={saveLesson}
              onDelete={deleteLesson}
            />
          ))}
        </div>
      )}

      {/* Module groups */}
      {groupedByModule.map(({ module, lessons: moduleLessons }) => (
        <div key={module.title} className="space-y-3">
          <div className="flex items-center gap-2 pb-1 border-b border-border">
            <BookOpen className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">{module.title}</h3>
            <span className="text-xs text-muted-foreground">({moduleLessons.length} lessons)</span>
          </div>
          {moduleLessons.length === 0 ? (
            <p className="text-sm text-muted-foreground pl-6 py-2">
              No lessons assigned to this module yet.
            </p>
          ) : (
            moduleLessons.map((lesson) => (
              <LessonEditorPanel
                key={lesson.id}
                lesson={lesson}
                modules={allModules}
                onSave={saveLesson}
                onDelete={deleteLesson}
              />
            ))
          )}
        </div>
      ))}

      {lessons.length === 0 && (
        <p className="text-center text-muted-foreground py-8">
          No lessons yet. Add your first lesson above.
        </p>
      )}
    </div>
  );
};

export default CourseLessonEditor;
