import { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { ArrowRight, RotateCcw, ChevronLeft, ChevronRight, ListMusic, DoorOpen, Download, FileText, Loader2, CheckCircle2 } from 'lucide-react';
import ResourceAudioPlayers from '@/components/ResourceAudioPlayers';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import ProfileDropdown from '@/components/ProfileDropdown';
import PageBreadcrumb from '@/components/PageBreadcrumb';
import ReflectionFooter from '@/components/temple/living/ReflectionFooter';
import CourseSessionNav from '@/components/CourseSessionNav';
import AddToPlaylistDialog from '@/components/AddToPlaylistDialog';
import DOMPurify from 'dompurify';
import LessonFormRenderer from '@/components/lesson/LessonFormRenderer';
import {
  LessonFormQuestion,
  LessonFormResponses,
  legacyToFormQuestions,
} from '@/lib/lessonFormTypes';
import { displayStorageFileName, titleFileNameFallback } from '@/lib/storageFileNames';
import { useCreateJournalEntry } from '@/hooks/useJournalEntries';
import { useRecordLastActivity } from '@/hooks/useRecordLastActivity';

interface Lesson {
  id: string;
  title: string;
  description: string | null;
  content: string;
  audio_url: string | null;
  audio_timestamp: string | null;
  lesson_number: number;
  course_id: string;
  survey_question: string | null;
  survey_options: string[] | null;
  form_questions: LessonFormQuestion[] | null;
  body_richtext: any;
  downloadable_files: Array<{ file_url: string; file_name: string }> | null;
  main_media_kind: string | null;
  main_media_file_url: string | null;
}

interface JournalEntry {
  id: string;
  journal_text: string | null;
  selected_answer: number | null;
  audio_position: number | null;
  form_responses: LessonFormResponses | null;
  completed_at: string | null;
}

const safeDownloadFileName = (fileName: string) =>
  fileName.replace(/[<>:"/\\|?*]+/g, '-').replace(/\s+/g, ' ').trim() || 'Downloadable file';

const DevotionLessonPage = () => {
  const navigate = useNavigate();
  const { courseId, lessonId } = useParams<{ courseId: string; lessonId: string }>();
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [journalText, setJournalText] = useState('');
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [formResponses, setFormResponses] = useState<LessonFormResponses>({});
  const [audioPosition, setAudioPosition] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [playlistDialogOpen, setPlaylistDialogOpen] = useState(false);
  const [downloadingFileUrl, setDownloadingFileUrl] = useState<string | null>(null);
  const [submittingPrompts, setSubmittingPrompts] = useState(false);
  const [promptsSaved, setPromptsSaved] = useState(false);

  const toggleCompleteMutation = useMutation({
    mutationFn: async (nextCompleted: boolean) => {
      if (!userId || !lessonId) throw new Error('Missing required data');
      const completed_at = nextCompleted ? new Date().toISOString() : null;

      if (journalEntry) {
        const { error } = await supabase
          .from('lesson_journal_entries')
          .update({ completed_at, updated_at: new Date().toISOString() } as any)
          .eq('id', journalEntry.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('lesson_journal_entries')
          .insert({
            user_id: userId,
            lesson_id: lessonId,
            completed_at,
          } as any);
        if (error) throw error;
      }
    },
    onSuccess: (_, nextCompleted) => {
      queryClient.invalidateQueries({ queryKey: ['devotion-journal-entry', lessonId, userId] });
      queryClient.invalidateQueries({ queryKey: ['devotion-lesson-progress-nav', courseId, userId] });
      queryClient.invalidateQueries({ queryKey: ['devotion-lesson-progress', courseId, userId] });
      toast({
        title: nextCompleted ? 'Lesson marked complete' : 'Marked as incomplete',
        description: nextCompleted ? 'Your progress has been updated.' : 'You can revisit it any time.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Could not update',
        description: error?.message || 'Please try again.',
        variant: 'destructive',
      });
    },
  });

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate('/auth');
        return;
      }
      setUserId(session.user.id);
      setLoading(false);
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) {
        navigate('/auth');
      } else {
        setUserId(session.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const { data: course } = useQuery({
    queryKey: ['devotion-course-for-lesson', courseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('courses')
        .select('title, location:content_categories!courses_location_id_fkey(id, name, slug)')
        .eq('id', courseId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !loading && !!courseId,
  });

  const { data: lesson, isLoading: lessonLoading } = useQuery({
    queryKey: ['devotion-lesson', lessonId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lessons')
        .select('*')
        .eq('id', lessonId)
        .single();

      if (error) throw error;
      return data as unknown as Lesson;
    },
    enabled: !loading && !!lessonId,
  });

  useRecordLastActivity('lesson', {
    id: lessonId,
    title: lesson?.title ? `${course?.title ? `${course.title} — ` : ''}${lesson.title}` : null,
    href: courseId && lessonId ? `/devotion/course/${courseId}/lesson/${lessonId}` : null,
  });


  const { data: allLessons } = useQuery({
    queryKey: ['devotion-all-lessons', courseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lessons')
        .select('id, lesson_number, title, module_title, module_order')
        .eq('course_id', courseId)
        .order('module_order', { ascending: true, nullsFirst: false })
        .order('lesson_number', { ascending: true });

      if (error) throw error;
      return data;
    },
    enabled: !loading && !!courseId,
  });

  const { data: journalEntry, isLoading: journalLoading } = useQuery({
    queryKey: ['devotion-journal-entry', lessonId, userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lesson_journal_entries')
        .select('*')
        .eq('lesson_id', lessonId)
        .eq('user_id', userId)
        .maybeSingle();

      if (error) throw error;
      return data as JournalEntry | null;
    },
    enabled: !loading && !!lessonId && !!userId,
  });

  // Fetch completed lesson IDs for the nav
  const { data: completedLessonIds } = useQuery({
    queryKey: ['devotion-lesson-progress-nav', courseId, userId],
    queryFn: async () => {
      if (!userId || !allLessons) return [];
      
      const lessonIds = allLessons.map(l => l.id);
      const { data, error } = await supabase
        .from('lesson_journal_entries')
        .select('lesson_id')
        .eq('user_id', userId)
        .not('completed_at', 'is', null)
        .in('lesson_id', lessonIds);

      if (error) throw error;
      return data?.map(e => e.lesson_id) || [];
    },
    enabled: !loading && !!userId && !!allLessons && allLessons.length > 0,
  });

  // Initialize form state from journal entry
  useEffect(() => {
    if (journalEntry) {
      setJournalText(journalEntry.journal_text || '');
      setSelectedAnswer(journalEntry.selected_answer);
      setAudioPosition(journalEntry.audio_position || 0);
      setFormResponses((journalEntry.form_responses as LessonFormResponses) || {});
    }
  }, [journalEntry]);

  // Set audio position when loaded
  useEffect(() => {
    if (audioRef.current && audioPosition > 0 && !journalLoading) {
      audioRef.current.currentTime = audioPosition;
    }
  }, [audioPosition, journalLoading]);

  const saveJournalMutation = useMutation({
    mutationFn: async (data: { journal_text?: string; selected_answer?: number | null; audio_position?: number; form_responses?: LessonFormResponses }) => {
      if (!userId || !lessonId) throw new Error('Missing required data');

      const payload = {
        user_id: userId,
        lesson_id: lessonId,
        ...data,
        updated_at: new Date().toISOString(),
      } as any;

      if (journalEntry) {
        const { error } = await supabase
          .from('lesson_journal_entries')
          .update(payload)
          .eq('id', journalEntry.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('lesson_journal_entries')
          .insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['devotion-journal-entry', lessonId, userId] });
    },
  });

  const debouncedSave = useCallback((data: { journal_text?: string; selected_answer?: number | null; audio_position?: number; form_responses?: LessonFormResponses }) => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = setTimeout(() => {
      saveJournalMutation.mutate(data);
    }, 1000);
  }, [saveJournalMutation]);

  const handleFormResponsesChange = (next: LessonFormResponses) => {
    setFormResponses(next);
    debouncedSave({ form_responses: next });
  };

  const handleSavePromptResponses = async (questions: LessonFormQuestion[]) => {
    const answered = questions.filter((q) => {
      const v = formResponses[q.id];
      if (v === null || v === undefined || v === '') return false;
      if (Array.isArray(v) && v.length === 0) return false;
      return true;
    });

    if (answered.length === 0) {
      toast({
        title: 'Nothing to save',
        description: 'Please answer at least one prompt before saving.',
        variant: 'destructive',
      });
      return;
    }

    setSubmittingPrompts(true);
    try {
      // Persist answers only to the owner-only lesson record
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      await saveJournalMutation.mutateAsync({ form_responses: formResponses });

      setPromptsSaved(true);
      toast({
        title: 'Saved privately with this lesson.',
      });
    } catch (err: any) {
      toast({
        title: 'Could not save',
        description: err?.message || 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setSubmittingPrompts(false);
    }
  };

  const handleJournalChange = (text: string) => {
    setJournalText(text);
    debouncedSave({ journal_text: text, selected_answer: selectedAnswer });
  };

  const handleAnswerChange = (value: string) => {
    const answer = parseInt(value);
    setSelectedAnswer(answer);
    debouncedSave({ journal_text: journalText, selected_answer: answer });
  };

  const handleAudioTimeUpdate = () => {
    if (audioRef.current) {
      const currentTime = audioRef.current.currentTime;
      // Save position every 10 seconds
      if (Math.floor(currentTime) % 10 === 0 && currentTime > 0) {
        debouncedSave({ journal_text: journalText, selected_answer: selectedAnswer, audio_position: currentTime });
      }
    }
  };

  const handleDownloadFile = async (file: { file_url: string; file_name: string }) => {
    setDownloadingFileUrl(file.file_url);
    try {
      const fileName = safeDownloadFileName(
        displayStorageFileName(file.file_name || file.file_url, titleFileNameFallback(lesson?.title, file.file_url))
      );
      let blob: Blob;

      if (!file.file_url.startsWith('http')) {
        const { data: signedUrlData, error: signedUrlError } = await supabase.storage
          .from('content-main-media')
          .createSignedUrl(file.file_url, 60, { download: fileName });

        if (!signedUrlError && signedUrlData?.signedUrl) {
          const link = document.createElement('a');
          link.href = signedUrlData.signedUrl;
          link.download = fileName;
          link.rel = 'noopener noreferrer';
          document.body.appendChild(link);
          link.click();
          link.remove();
          return;
        }
      }

      if (file.file_url.startsWith('http')) {
        const response = await fetch(file.file_url);
        if (!response.ok) throw new Error('Unable to download file');
        blob = await response.blob();
      } else {
        const { data, error } = await supabase.storage.from('content-main-media').download(file.file_url);
        if (error || !data) throw error || new Error('Unable to download file');
        blob = data;
      }

      const downloadBlob = new Blob([blob], { type: 'application/octet-stream' });
      const objectUrl = URL.createObjectURL(downloadBlob);
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = fileName;
      link.rel = 'noopener noreferrer';
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
    } catch (error) {
      toast({ title: 'Download failed', description: 'Please try again.', variant: 'destructive' });
    } finally {
      setDownloadingFileUrl(null);
    }
  };

  const handleRestartAudio = () => {
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play();
    }
  };

  const currentLessonIndex = allLessons?.findIndex(l => l.id === lessonId) ?? -1;
  const prevLesson = currentLessonIndex > 0 ? allLessons?.[currentLessonIndex - 1] : null;
  const nextLesson = currentLessonIndex < (allLessons?.length ?? 0) - 1 ? allLessons?.[currentLessonIndex + 1] : null;

  if (loading || lessonLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-primary font-serif text-xl">
          Loading session...
        </div>
      </div>
    );
  }

  if (!lesson) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground font-serif text-xl">
          Session not found
        </div>
      </div>
    );
  }

  const surveyOptions = Array.isArray(lesson.survey_options) ? lesson.survey_options : [];
  const formQuestions: LessonFormQuestion[] =
    Array.isArray(lesson.form_questions) && lesson.form_questions.length > 0
      ? lesson.form_questions
      : legacyToFormQuestions(lesson.survey_question, surveyOptions) || [];
  const savedDownloadableFiles = Array.isArray(lesson.downloadable_files)
    ? lesson.downloadable_files
        .filter((file) => file?.file_url)
        .map((file) => ({
          file_url: file.file_url,
          file_name: displayStorageFileName(
            file.file_name || file.file_url,
            titleFileNameFallback(lesson.title, file.file_url)
          ),
        }))
    : [];
  const legacyDownloadableFile = lesson.main_media_kind === 'file' && lesson.main_media_file_url
    ? [{
        file_url: lesson.main_media_file_url,
        file_name: displayStorageFileName(
          lesson.main_media_file_url,
          titleFileNameFallback(lesson.title, lesson.main_media_file_url)
        ),
      }]
    : [];
  const downloadableFiles = [
    ...savedDownloadableFiles,
    ...legacyDownloadableFile.filter(
      (legacyFile) => !savedDownloadableFiles.some((file) => file.file_url === legacyFile.file_url)
    ),
  ];

  const isDeepeningCourse = (course as any)?.location?.name === 'Deepening Courses';

  return (
    <div className="min-h-screen bg-background">
      {/* Fixed Sidebar */}
      {allLessons && allLessons.length > 0 && courseId && (
        <CourseSessionNav
          lessons={allLessons}
          completedLessonIds={completedLessonIds || []}
          courseId={courseId}
          currentLessonId={lessonId}
          courseTitle={course?.title}
        />
      )}

      {/* Main Content Area - offset by sidebar width on desktop */}
      <div className="ml-0 md:ml-72">
        {/* Navigation Header */}
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border pl-14 pr-4 py-3 md:px-4 flex items-center justify-between">
          {(() => {
            const locName = (course as any)?.location?.name as string | undefined;
            const locSlug = (course as any)?.location?.slug as string | undefined;
            const isRemembrance = locName === 'The Alchemy of Becoming' || locName === 'The Rites of Remembrance' || locName === 'Deepening Courses';
            const isDeepening = locName === 'Deepening Courses';
            const doorCrumb = isRemembrance
              ? { label: 'The Door of Remembrance', href: '/remembrance', icon: DoorOpen }
              : { label: 'The Door of Devotion', href: '/devotion', icon: DoorOpen };
            const sectionCrumb = locName
              ? {
                  label: isDeepening ? 'Companion Courses' : locName,
                  href: isDeepening
                    ? '/remembrance/companion-courses'
                    : isRemembrance
                      ? `/remembrance/section/${locSlug?.replace(/^loc-/, '') ?? ''}`
                      : `/devotion/section/${locSlug?.replace(/^loc-/, '') ?? ''}`,
                }
              : null;
            return (
              <PageBreadcrumb
                items={[
                  doorCrumb,
                  ...(sectionCrumb ? [sectionCrumb] : []),
                  { label: course?.title || 'Course', href: `/devotion/course/${courseId}` },
                ]}
              />
            );
          })()}
          <ProfileDropdown />
        </div>

        {/* Content */}
        <div className="px-4 py-8 max-w-3xl mx-auto">
          {/* Session Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center mb-8"
          >
            {!isDeepeningCourse && (
              <p className="text-primary font-sans text-sm uppercase tracking-wider mb-2">
                Session {lesson.lesson_number}
              </p>
            )}
            <h1 className="font-serif text-3xl md:text-4xl text-foreground mb-4">
              {lesson.title}
            </h1>
          </motion.div>

          {/* Audio Players (Multi-audio) */}
          {lesson.id && (
            <ResourceAudioPlayers
              resourceId={lesson.id}
              bucket="content-main-media"
              table="lesson_audio_files"
              foreignKey="lesson_id"
              legacyAudioUrl={lesson.audio_url}
              delayOffset={0.2}
              renderActions={() => (
                <Button
                  onClick={() => setPlaylistDialogOpen(true)}
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground hover:text-foreground"
                >
                  <ListMusic className="w-4 h-4 mr-2" />
                  Add to Playlist
                </Button>
              )}
            />
          )}

          {/* Lesson Content */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="max-w-none mb-8"
          >
            {lesson.body_richtext ? (
              <div 
                className={`text-foreground/90 font-sans leading-relaxed ProseMirror${isDeepeningCourse ? ' companion-lesson-content' : ''}`}
                dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(
                  (() => {
                    // Render TipTap JSON to HTML (simplified)
                    try {
                      const renderNode = (node: any): string => {
                        if (!node) return '';
                        if (node.type === 'text') {
                          let text = node.text || '';
                          if (node.marks) {
                            for (const mark of node.marks) {
                              if (mark.type === 'bold') text = `<strong>${text}</strong>`;
                              if (mark.type === 'italic') text = `<em>${text}</em>`;
                              if (mark.type === 'underline') text = `<u>${text}</u>`;
                              if (mark.type === 'link') text = `<a href="${mark.attrs?.href || ''}" target="_blank" rel="noopener">${text}</a>`;
                            }
                          }
                          return text;
                        }
                        const children = (node.content || []).map(renderNode).join('');
                        const style = node.attrs?.textAlign ? ` style="text-align: ${node.attrs.textAlign}"` : '';
                        switch (node.type) {
                          case 'doc': return children;
                          case 'paragraph': return `<p${style}>${children || '<br>'}</p>`;
                          case 'heading': return `<h${node.attrs?.level || 2}${style}>${children}</h${node.attrs?.level || 2}>`;
                          case 'bulletList': return `<ul>${children}</ul>`;
                          case 'orderedList': return `<ol>${children}</ol>`;
                          case 'listItem': return `<li>${children}</li>`;
                          case 'blockquote': return `<blockquote>${children}</blockquote>`;
                          case 'horizontalRule': return '<hr>';
                          case 'hardBreak': return '<br>';
                          case 'image': return `<img src="${node.attrs?.src || ''}" alt="${node.attrs?.alt || ''}" />`;
                          default: return children;
                        }
                      };
                      return renderNode(lesson.body_richtext);
                    } catch { return lesson.content || ''; }
                  })()
                ) }}
              />
            ) : (
              <div 
                className={`text-foreground/90 font-sans leading-relaxed whitespace-pre-wrap${isDeepeningCourse ? ' companion-lesson-content' : ''}`}
                dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(lesson.content) }}
              />
            )}
          </motion.div>

          {/* Downloadables */}
          {downloadableFiles.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.35 }}
              className="mb-8"
            >
              <div className="bg-card border border-border rounded-lg p-6">
                <h2 className="font-serif text-2xl text-foreground mb-4">Downloadables</h2>
                <div className="space-y-2">
                  {downloadableFiles.map((f, i) => {
                    const isDownloading = downloadingFileUrl === f.file_url;
                    return (
                      <div
                        key={i}
                        className="flex items-center gap-3 p-4 bg-background border border-border rounded-lg"
                      >
                        <FileText className="w-5 h-5 text-primary flex-shrink-0" />
                        <span className="flex-1 text-sm text-foreground truncate">{f.file_name}</span>
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-shrink-0"
                          onClick={() => handleDownloadFile(f)}
                          disabled={isDownloading}
                        >
                          {isDownloading ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          ) : (
                            <Download className="w-4 h-4 mr-2" />
                          )}
                          Download
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          )}

          {/* Lesson Form (Journal Prompts) */}
          {formQuestions.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="mb-8"
            >
              <div className="bg-card border border-border rounded-lg p-6">
                <h2 className="font-serif text-2xl text-foreground mb-4">Journal Prompts</h2>
                <LessonFormRenderer
                  questions={formQuestions}
                  responses={formResponses}
                  onChange={handleFormResponsesChange}
                />
                <div className="mt-6 flex flex-wrap items-center justify-end gap-3">
                  {promptsSaved && !submittingPrompts && (
                    <p
                      role="status"
                      aria-live="polite"
                      className="text-sm text-muted-foreground"
                    >
                      Saved privately with this lesson.
                    </p>
                  )}
                  <Button
                    onClick={() => handleSavePromptResponses(formQuestions)}
                    disabled={submittingPrompts}
                    className="bg-primary text-primary-foreground hover:bg-primary/90"
                  >
                    {submittingPrompts ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Saving…
                      </>
                    ) : (
                      <>
                        <FileText className="w-4 h-4 mr-2" />
                        Save your response
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </motion.div>
          )}

          {/* Lesson-level reflection — Field Notes for eligible members, legacy Journal otherwise */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.55 }}
            className="mb-12"
          >
            <ReflectionFooter
              resourceFamily="lesson"
              resourceId={lessonId || ''}
              contextType="lesson"
              contextId={lessonId || ''}
              contextTitle={`Session ${lesson.lesson_number}: ${lesson.title}`}
              placeholder="Add deeper reflections, insights, or notes to your digital journal..."
              startLabel="Make this a small experiment"
              attachLabel="Add this as support in an experiment I already have"
            />
          </motion.div>


          {/* Mark Complete */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.58 }}
            className="mb-8 flex justify-center"
          >
            {(() => {
              const isCompleted = !!journalEntry?.completed_at;
              return (
                <Button
                  onClick={() => toggleCompleteMutation.mutate(!isCompleted)}
                  disabled={toggleCompleteMutation.isPending}
                  variant={isCompleted ? 'outline' : 'default'}
                  className={isCompleted
                    ? 'border-primary/40 text-primary hover:bg-primary/10'
                    : 'bg-primary text-primary-foreground hover:bg-primary/90'}
                >
                  {toggleCompleteMutation.isPending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                  )}
                  {isCompleted ? 'Completed — Mark Incomplete' : 'Mark Lesson as Completed'}
                </Button>
              );
            })()}
          </motion.div>

          {/* Navigation Footer */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.6 }}
            className="flex items-center justify-between border-t border-border pt-8"
          >
            {prevLesson ? (
              <Button
                onClick={() => navigate(`/devotion/course/${courseId}/lesson/${prevLesson.id}`)}
                variant="ghost"
                className="text-foreground/70 hover:text-foreground"
              >
                <ChevronLeft className="w-4 h-4 mr-2" />
                {isDeepeningCourse ? prevLesson.title : `Session ${prevLesson.lesson_number}`}
              </Button>
            ) : (
              <div />
            )}
            
            {nextLesson ? (
              <Button
                onClick={() => navigate(`/devotion/course/${courseId}/lesson/${nextLesson.id}`)}
                variant="ghost"
                className="text-foreground/70 hover:text-foreground"
              >
                {isDeepeningCourse ? nextLesson.title : `Session ${nextLesson.lesson_number}`}
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            ) : (
              <Button
                onClick={() => navigate(`/devotion/course/${courseId}`)}
                className="bg-primary text-primary-foreground hover:bg-primary/90"
              >
                Complete Course
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            )}
          </motion.div>
        </div>
      </div>

      {/* Playlist Dialog */}
      {lesson && lesson.audio_url && (
        <AddToPlaylistDialog
          open={playlistDialogOpen}
          onOpenChange={setPlaylistDialogOpen}
          lessonId={lesson.id}
          resourceTitle={lesson.title}
        />
      )}
    </div>
  );
};

export default DevotionLessonPage;
