import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useToast } from '@/hooks/use-toast';
import { 
  Plus, 
  Trash2, 
  GripVertical, 
  ChevronDown, 
  ChevronRight,
  Loader2,
  BookOpen,
  FileText
} from 'lucide-react';
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

interface Module {
  id: string;
  title: string;
  order_index: number;
  status: 'draft' | 'published';
}

interface Lesson {
  id: string;
  module_id: string;
  title: string;
  order_index: number;
  status: 'draft' | 'published';
}

interface CourseBuilderProps {
  courseId: string;
}

const CourseBuilder = ({ courseId }: CourseBuilderProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [modules, setModules] = useState<Module[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());
  const [editingModule, setEditingModule] = useState<string | null>(null);
  const [editingLesson, setEditingLesson] = useState<string | null>(null);
  const [newModuleTitle, setNewModuleTitle] = useState('');
  const [newLessonTitle, setNewLessonTitle] = useState('');
  const [addingLessonTo, setAddingLessonTo] = useState<string | null>(null);

  useEffect(() => {
    fetchModulesAndLessons();
  }, [courseId]);

  const fetchModulesAndLessons = async () => {
    setLoading(true);

    const [modulesRes, lessonsRes] = await Promise.all([
      supabase
        .from('content_modules')
        .select('*')
        .eq('course_id', courseId)
        .order('order_index'),
      supabase
        .from('content_lessons')
        .select('*')
        .in(
          'module_id',
          (await supabase.from('content_modules').select('id').eq('course_id', courseId)).data?.map(m => m.id) || []
        )
        .order('order_index'),
    ]);

    if (modulesRes.data) {
      setModules(modulesRes.data as Module[]);
      // Expand all modules by default
      setExpandedModules(new Set(modulesRes.data.map(m => m.id)));
    }
    if (lessonsRes.data) {
      setLessons(lessonsRes.data as Lesson[]);
    }

    setLoading(false);
  };

  const addModule = async () => {
    if (!newModuleTitle.trim()) return;

    const maxOrder = modules.length > 0 ? Math.max(...modules.map(m => m.order_index)) : -1;

    const { data, error } = await supabase
      .from('content_modules')
      .insert({
        course_id: courseId,
        title: newModuleTitle.trim(),
        order_index: maxOrder + 1,
        status: 'draft',
      })
      .select()
      .single();

    if (error) {
      toast({ title: 'Error', description: 'Failed to add module', variant: 'destructive' });
      return;
    }

    setModules([...modules, data as Module]);
    setExpandedModules(prev => new Set([...prev, data.id]));
    setNewModuleTitle('');
    toast({ title: 'Added', description: 'Module added successfully' });
  };

  const updateModule = async (moduleId: string, updates: Partial<Module>) => {
    const { error } = await supabase
      .from('content_modules')
      .update(updates)
      .eq('id', moduleId);

    if (error) {
      toast({ title: 'Error', description: 'Failed to update module', variant: 'destructive' });
      return;
    }

    setModules(modules.map(m => m.id === moduleId ? { ...m, ...updates } : m));
    setEditingModule(null);
  };

  const deleteModule = async (moduleId: string) => {
    const { error } = await supabase
      .from('content_modules')
      .delete()
      .eq('id', moduleId);

    if (error) {
      toast({ title: 'Error', description: 'Failed to delete module', variant: 'destructive' });
      return;
    }

    setModules(modules.filter(m => m.id !== moduleId));
    setLessons(lessons.filter(l => l.module_id !== moduleId));
    toast({ title: 'Deleted', description: 'Module deleted' });
  };

  const addLesson = async (moduleId: string) => {
    if (!newLessonTitle.trim()) return;

    const moduleLessons = lessons.filter(l => l.module_id === moduleId);
    const maxOrder = moduleLessons.length > 0 ? Math.max(...moduleLessons.map(l => l.order_index)) : -1;

    const { data, error } = await supabase
      .from('content_lessons')
      .insert({
        module_id: moduleId,
        title: newLessonTitle.trim(),
        order_index: maxOrder + 1,
        status: 'draft',
      })
      .select()
      .single();

    if (error) {
      toast({ title: 'Error', description: 'Failed to add lesson', variant: 'destructive' });
      return;
    }

    setLessons([...lessons, data as Lesson]);
    setNewLessonTitle('');
    setAddingLessonTo(null);
    toast({ title: 'Added', description: 'Lesson added successfully' });
  };

  const updateLesson = async (lessonId: string, updates: Partial<Lesson>) => {
    const { error } = await supabase
      .from('content_lessons')
      .update(updates)
      .eq('id', lessonId);

    if (error) {
      toast({ title: 'Error', description: 'Failed to update lesson', variant: 'destructive' });
      return;
    }

    setLessons(lessons.map(l => l.id === lessonId ? { ...l, ...updates } : l));
    setEditingLesson(null);
  };

  const deleteLesson = async (lessonId: string) => {
    const { error } = await supabase
      .from('content_lessons')
      .delete()
      .eq('id', lessonId);

    if (error) {
      toast({ title: 'Error', description: 'Failed to delete lesson', variant: 'destructive' });
      return;
    }

    setLessons(lessons.filter(l => l.id !== lessonId));
    toast({ title: 'Deleted', description: 'Lesson deleted' });
  };

  const toggleModuleExpand = (moduleId: string) => {
    setExpandedModules(prev => {
      const next = new Set(prev);
      if (next.has(moduleId)) {
        next.delete(moduleId);
      } else {
        next.add(moduleId);
      }
      return next;
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Add Module */}
      <div className="flex gap-2">
        <Input
          placeholder="New module title"
          value={newModuleTitle}
          onChange={(e) => setNewModuleTitle(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addModule()}
        />
        <Button onClick={addModule} disabled={!newModuleTitle.trim()}>
          <Plus className="w-4 h-4 mr-2" />
          Add Module
        </Button>
      </div>

      {/* Modules List */}
      <div className="space-y-3">
        {modules.map((module, moduleIndex) => {
          const moduleLessons = lessons.filter(l => l.module_id === module.id);
          const isExpanded = expandedModules.has(module.id);

          return (
            <Card key={module.id} className="overflow-hidden">
              <Collapsible open={isExpanded} onOpenChange={() => toggleModuleExpand(module.id)}>
                <CollapsibleTrigger asChild>
                  <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors py-3">
                    <div className="flex items-center gap-3">
                      <GripVertical className="w-4 h-4 text-muted-foreground cursor-grab" />
                      {isExpanded ? (
                        <ChevronDown className="w-4 h-4" />
                      ) : (
                        <ChevronRight className="w-4 h-4" />
                      )}
                      <BookOpen className="w-4 h-4 text-primary" />
                      
                      {editingModule === module.id ? (
                        <Input
                          value={module.title}
                          onChange={(e) => setModules(modules.map(m => 
                            m.id === module.id ? { ...m, title: e.target.value } : m
                          ))}
                          onBlur={() => updateModule(module.id, { title: module.title })}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              updateModule(module.id, { title: module.title });
                            }
                            if (e.key === 'Escape') {
                              setEditingModule(null);
                              fetchModulesAndLessons();
                            }
                          }}
                          onClick={(e) => e.stopPropagation()}
                          autoFocus
                          className="h-7"
                        />
                      ) : (
                        <CardTitle 
                          className="text-base font-medium flex-1"
                          onDoubleClick={(e) => {
                            e.stopPropagation();
                            setEditingModule(module.id);
                          }}
                        >
                          {module.title}
                        </CardTitle>
                      )}

                      <div className="flex items-center gap-2 ml-auto" onClick={(e) => e.stopPropagation()}>
                        <Select
                          value={module.status}
                          onValueChange={(value: 'draft' | 'published') => updateModule(module.id, { status: value })}
                        >
                          <SelectTrigger className="w-24 h-7 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="draft">Draft</SelectItem>
                            <SelectItem value="published">Published</SelectItem>
                          </SelectContent>
                        </Select>

                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Module?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will permanently delete the module and all its lessons.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => deleteModule(module.id)}>
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  </CardHeader>
                </CollapsibleTrigger>

                <CollapsibleContent>
                  <CardContent className="pt-0 pb-4">
                    <div className="pl-8 space-y-2">
                      {/* Lessons */}
                      {moduleLessons.map((lesson) => (
                        <div
                          key={lesson.id}
                          className="flex items-center gap-2 p-2 rounded-md bg-muted/30 hover:bg-muted/50 transition-colors"
                        >
                          <GripVertical className="w-3 h-3 text-muted-foreground cursor-grab" />
                          <FileText className="w-4 h-4 text-muted-foreground" />
                          
                          {editingLesson === lesson.id ? (
                            <Input
                              value={lesson.title}
                              onChange={(e) => setLessons(lessons.map(l => 
                                l.id === lesson.id ? { ...l, title: e.target.value } : l
                              ))}
                              onBlur={() => updateLesson(lesson.id, { title: lesson.title })}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  updateLesson(lesson.id, { title: lesson.title });
                                }
                                if (e.key === 'Escape') {
                                  setEditingLesson(null);
                                  fetchModulesAndLessons();
                                }
                              }}
                              autoFocus
                              className="h-7 flex-1"
                            />
                          ) : (
                            <span 
                              className="flex-1 text-sm cursor-pointer"
                              onDoubleClick={() => setEditingLesson(lesson.id)}
                            >
                              {lesson.title}
                            </span>
                          )}

                          <Select
                            value={lesson.status}
                            onValueChange={(value: 'draft' | 'published') => updateLesson(lesson.id, { status: value })}
                          >
                            <SelectTrigger className="w-20 h-6 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="draft">Draft</SelectItem>
                              <SelectItem value="published">Published</SelectItem>
                            </SelectContent>
                          </Select>

                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                                <Trash2 className="w-3 h-3 text-destructive" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Lesson?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => deleteLesson(lesson.id)}>
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      ))}

                      {/* Add Lesson */}
                      {addingLessonTo === module.id ? (
                        <div className="flex gap-2 mt-2">
                          <Input
                            placeholder="Lesson title"
                            value={newLessonTitle}
                            onChange={(e) => setNewLessonTitle(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') addLesson(module.id);
                              if (e.key === 'Escape') {
                                setAddingLessonTo(null);
                                setNewLessonTitle('');
                              }
                            }}
                            autoFocus
                            className="h-8"
                          />
                          <Button size="sm" onClick={() => addLesson(module.id)}>
                            Add
                          </Button>
                          <Button 
                            size="sm" 
                            variant="ghost"
                            onClick={() => {
                              setAddingLessonTo(null);
                              setNewLessonTitle('');
                            }}
                          >
                            Cancel
                          </Button>
                        </div>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full justify-start text-muted-foreground mt-2"
                          onClick={() => setAddingLessonTo(module.id)}
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          Add Lesson
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </CollapsibleContent>
              </Collapsible>
            </Card>
          );
        })}
      </div>

      {modules.length === 0 && (
        <p className="text-center text-muted-foreground py-8">
          No modules yet. Add your first module above.
        </p>
      )}
    </div>
  );
};

export default CourseBuilder;
