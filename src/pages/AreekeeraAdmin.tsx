import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import ProfileDropdown from '@/components/ProfileDropdown';
import PageBreadcrumb from '@/components/PageBreadcrumb';
import HealingResourceLibrary from '@/components/admin/HealingResourceLibrary';
import HealingResourceForm from '@/components/admin/HealingResourceForm';
import { 
  Plus, Search, Save, Trash2, Edit2, 
  BookOpen, Users, Tag, AlertTriangle, ArrowLeft, Heart
} from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { MoreVertical } from 'lucide-react';

interface Symptom {
  id: string;
  name: string;
  domain: 'physical' | 'mental' | 'emotional' | 'spiritual';
  description: string | null;
}

interface Condition {
  id: string;
  name: string;
  description: string | null;
}

interface Teacher {
  id: string;
  name: string;
  bio: string | null;
  avatar_url: string | null;
}

interface ResourceTag {
  id: string;
  name: string;
  category: string | null;
}

const domainColors: Record<string, string> = {
  physical: 'bg-green-500/20 text-green-700 dark:text-green-400',
  mental: 'bg-blue-500/20 text-blue-700 dark:text-blue-400',
  emotional: 'bg-purple-500/20 text-purple-700 dark:text-purple-400',
  spiritual: 'bg-amber-500/20 text-amber-700 dark:text-amber-400',
};

type View = 'library' | 'form';

const AreekeeraAdmin = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [activeTab, setActiveTab] = useState('resources');
  const [view, setView] = useState<View>('library');
  const [editingResourceId, setEditingResourceId] = useState<string | null>(null);
  
  // Symptoms state
  const [symptoms, setSymptoms] = useState<Symptom[]>([]);
  const [symptomSearch, setSymptomSearch] = useState('');
  const [isSymptomDialogOpen, setIsSymptomDialogOpen] = useState(false);
  const [editingSymptom, setEditingSymptom] = useState<Symptom | null>(null);
  const [symptomForm, setSymptomForm] = useState({
    name: '',
    domain: 'physical' as 'physical' | 'mental' | 'emotional' | 'spiritual',
    description: '',
  });

  // Conditions state
  const [conditions, setConditions] = useState<Condition[]>([]);
  const [conditionSearch, setConditionSearch] = useState('');
  const [isConditionDialogOpen, setIsConditionDialogOpen] = useState(false);
  const [editingCondition, setEditingCondition] = useState<Condition | null>(null);
  const [conditionForm, setConditionForm] = useState({
    name: '',
    description: '',
  });
  
  // Teachers state
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [isTeacherDialogOpen, setIsTeacherDialogOpen] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);
  const [teacherForm, setTeacherForm] = useState({
    name: '',
    bio: '',
    avatar_url: '',
  });
  
  // Tags state
  const [tags, setTags] = useState<ResourceTag[]>([]);
  const [isTagDialogOpen, setIsTagDialogOpen] = useState(false);
  const [editingTag, setEditingTag] = useState<ResourceTag | null>(null);
  const [tagForm, setTagForm] = useState({
    name: '',
    category: '',
  });

  // Handle ?edit=resourceId query parameter
  useEffect(() => {
    const editId = searchParams.get('edit');
    if (editId && !loading) {
      setEditingResourceId(editId);
      setView('form');
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, loading, setSearchParams]);

  useEffect(() => {
    checkAdminAccess();
  }, []);

  const checkAdminAccess = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate('/auth');
      return;
    }

    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', session.user.id)
      .eq('role', 'admin')
      .single();

    if (!roleData) {
      toast({
        title: "Access Denied",
        description: "You don't have admin privileges.",
        variant: "destructive",
      });
      navigate('/devotion');
      return;
    }

    setIsAdmin(true);
    await loadAllData();
    setLoading(false);
  };

  const loadAllData = async () => {
    await Promise.all([
      loadSymptoms(),
      loadConditions(),
      loadTeachers(),
      loadTags(),
    ]);
  };

  const loadSymptoms = async () => {
    const { data, error } = await supabase
      .from('symptoms')
      .select('*')
      .order('domain', { ascending: true });
    
    if (error) {
      console.error('Error loading symptoms:', error);
      return;
    }
    setSymptoms(data || []);
  };

  const loadConditions = async () => {
    const { data, error } = await supabase
      .from('conditions')
      .select('*')
      .order('name', { ascending: true });
    
    if (error) {
      console.error('Error loading conditions:', error);
      return;
    }
    setConditions(data || []);
  };

  const loadTeachers = async () => {
    const { data, error } = await supabase
      .from('teachers')
      .select('*')
      .order('name', { ascending: true });
    
    if (error) {
      console.error('Error loading teachers:', error);
      return;
    }
    setTeachers(data || []);
  };

  const loadTags = async () => {
    const { data, error } = await supabase
      .from('resource_tags')
      .select('*')
      .order('category', { ascending: true });
    
    if (error) {
      console.error('Error loading tags:', error);
      return;
    }
    setTags(data || []);
  };

  // Resource handlers
  const handleEditResource = (resourceId: string) => {
    setEditingResourceId(resourceId);
    setView('form');
  };

  const handleNewResource = () => {
    setEditingResourceId(null);
    setView('form');
  };

  const handleFormSuccess = () => {
    setEditingResourceId(null);
    setView('library');
  };

  const handleFormCancel = () => {
    setEditingResourceId(null);
    setView('library');
  };

  // Symptom CRUD
  const handleSaveSymptom = async () => {
    try {
      if (editingSymptom) {
        const { error } = await supabase
          .from('symptoms')
          .update({
            name: symptomForm.name,
            domain: symptomForm.domain,
            description: symptomForm.description || null,
          })
          .eq('id', editingSymptom.id);
        
        if (error) throw error;
        toast({ title: "Symptom updated successfully" });
      } else {
        const { error } = await supabase
          .from('symptoms')
          .insert({
            name: symptomForm.name,
            domain: symptomForm.domain,
            description: symptomForm.description || null,
          });
        
        if (error) throw error;
        toast({ title: "Symptom created successfully" });
      }
      
      setIsSymptomDialogOpen(false);
      setEditingSymptom(null);
      resetSymptomForm();
      await loadSymptoms();
    } catch (error) {
      console.error('Error saving symptom:', error);
      toast({
        title: "Error saving symptom",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    }
  };

  const handleDeleteSymptom = async (id: string) => {
    try {
      const { error } = await supabase
        .from('symptoms')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      toast({ title: "Symptom deleted" });
      await loadSymptoms();
    } catch (error) {
      console.error('Error deleting symptom:', error);
      toast({
        title: "Error deleting symptom",
        variant: "destructive",
      });
    }
  };

  // Condition CRUD
  const handleSaveCondition = async () => {
    try {
      if (editingCondition) {
        const { error } = await supabase
          .from('conditions')
          .update({
            name: conditionForm.name,
            description: conditionForm.description || null,
          })
          .eq('id', editingCondition.id);
        
        if (error) throw error;
        toast({ title: "Condition updated successfully" });
      } else {
        const { error } = await supabase
          .from('conditions')
          .insert({
            name: conditionForm.name,
            description: conditionForm.description || null,
          });
        
        if (error) throw error;
        toast({ title: "Condition created successfully" });
      }
      
      setIsConditionDialogOpen(false);
      setEditingCondition(null);
      resetConditionForm();
      await loadConditions();
    } catch (error) {
      console.error('Error saving condition:', error);
      toast({
        title: "Error saving condition",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    }
  };

  const handleDeleteCondition = async (id: string) => {
    try {
      const { error } = await supabase
        .from('conditions')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      toast({ title: "Condition deleted" });
      await loadConditions();
    } catch (error) {
      console.error('Error deleting condition:', error);
      toast({
        title: "Error deleting condition",
        variant: "destructive",
      });
    }
  };

  // Teacher CRUD
  const handleSaveTeacher = async () => {
    try {
      if (editingTeacher) {
        const { error } = await supabase
          .from('teachers')
          .update({
            name: teacherForm.name,
            bio: teacherForm.bio || null,
            avatar_url: teacherForm.avatar_url || null,
          })
          .eq('id', editingTeacher.id);
        
        if (error) throw error;
        toast({ title: "Teacher updated successfully" });
      } else {
        const { error } = await supabase
          .from('teachers')
          .insert({
            name: teacherForm.name,
            bio: teacherForm.bio || null,
            avatar_url: teacherForm.avatar_url || null,
          });
        
        if (error) throw error;
        toast({ title: "Teacher created successfully" });
      }
      
      setIsTeacherDialogOpen(false);
      setEditingTeacher(null);
      resetTeacherForm();
      await loadTeachers();
    } catch (error) {
      console.error('Error saving teacher:', error);
      toast({
        title: "Error saving teacher",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    }
  };

  const handleDeleteTeacher = async (id: string) => {
    try {
      const { error } = await supabase
        .from('teachers')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      toast({ title: "Teacher deleted" });
      await loadTeachers();
    } catch (error) {
      console.error('Error deleting teacher:', error);
      toast({
        title: "Error deleting teacher",
        variant: "destructive",
      });
    }
  };

  // Tag CRUD
  const handleSaveTag = async () => {
    try {
      if (editingTag) {
        const { error } = await supabase
          .from('resource_tags')
          .update({
            name: tagForm.name,
            category: tagForm.category || null,
          })
          .eq('id', editingTag.id);
        
        if (error) throw error;
        toast({ title: "Tag updated successfully" });
      } else {
        const { error } = await supabase
          .from('resource_tags')
          .insert({
            name: tagForm.name,
            category: tagForm.category || null,
          });
        
        if (error) throw error;
        toast({ title: "Tag created successfully" });
      }
      
      setIsTagDialogOpen(false);
      setEditingTag(null);
      resetTagForm();
      await loadTags();
    } catch (error) {
      console.error('Error saving tag:', error);
      toast({
        title: "Error saving tag",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    }
  };

  const handleDeleteTag = async (id: string) => {
    try {
      const { error } = await supabase
        .from('resource_tags')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      toast({ title: "Tag deleted" });
      await loadTags();
    } catch (error) {
      console.error('Error deleting tag:', error);
      toast({
        title: "Error deleting tag",
        variant: "destructive",
      });
    }
  };

  // Form reset helpers
  const resetSymptomForm = () => {
    setSymptomForm({
      name: '',
      domain: 'physical',
      description: '',
    });
  };

  const resetConditionForm = () => {
    setConditionForm({
      name: '',
      description: '',
    });
  };

  const resetTeacherForm = () => {
    setTeacherForm({
      name: '',
      bio: '',
      avatar_url: '',
    });
  };

  const resetTagForm = () => {
    setTagForm({
      name: '',
      category: '',
    });
  };

  // Edit helpers
  const openEditSymptom = (symptom: Symptom) => {
    setEditingSymptom(symptom);
    setSymptomForm({
      name: symptom.name,
      domain: symptom.domain,
      description: symptom.description || '',
    });
    setIsSymptomDialogOpen(true);
  };

  const openEditTeacher = (teacher: Teacher) => {
    setEditingTeacher(teacher);
    setTeacherForm({
      name: teacher.name,
      bio: teacher.bio || '',
      avatar_url: teacher.avatar_url || '',
    });
    setIsTeacherDialogOpen(true);
  };

  const openEditTag = (tag: ResourceTag) => {
    setEditingTag(tag);
    setTagForm({
      name: tag.name,
      category: tag.category || '',
    });
    setIsTagDialogOpen(true);
  };

  const openEditCondition = (condition: Condition) => {
    setEditingCondition(condition);
    setConditionForm({
      name: condition.name,
      description: condition.description || '',
    });
    setIsConditionDialogOpen(true);
  };

  // Filtered data
  const filteredSymptoms = symptoms.filter(s => 
    s.name.toLowerCase().includes(symptomSearch.toLowerCase())
  );

  const filteredConditions = conditions.filter(c => 
    c.name.toLowerCase().includes(conditionSearch.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-primary font-serif text-xl">
          Loading Admin Panel...
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border">
        <div className="flex items-center justify-between p-4">
          <PageBreadcrumb 
            items={[
              { label: 'Admin', href: '/admin' },
              { label: 'AreekeerA®' }
            ]} 
          />
          <ProfileDropdown />
        </div>
        <div className="max-w-6xl mx-auto px-6 pb-4">
          <h1 className="text-2xl font-serif text-foreground">AreekeerA® Admin</h1>
          <p className="text-sm text-muted-foreground">Manage healing resources, symptoms, and protocols</p>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto p-6">
        {view === 'library' && (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-grid">
              <TabsTrigger value="resources" className="gap-2">
                <BookOpen className="w-4 h-4" />
                <span className="hidden sm:inline">Resources</span>
              </TabsTrigger>
              <TabsTrigger value="symptoms" className="gap-2">
                <AlertTriangle className="w-4 h-4" />
                <span className="hidden sm:inline">Symptoms</span>
              </TabsTrigger>
              <TabsTrigger value="teachers" className="gap-2">
                <Users className="w-4 h-4" />
                <span className="hidden sm:inline">Teachers</span>
              </TabsTrigger>
              <TabsTrigger value="tags" className="gap-2">
                <Tag className="w-4 h-4" />
                <span className="hidden sm:inline">Tags</span>
              </TabsTrigger>
            </TabsList>

            {/* Resources Tab */}
            <TabsContent value="resources">
              <HealingResourceLibrary 
                onEdit={handleEditResource} 
                onNew={handleNewResource} 
              />
            </TabsContent>

            {/* Symptoms Tab */}
            <TabsContent value="symptoms" className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                <div className="relative flex-1 sm:max-w-xs">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search symptoms..."
                    value={symptomSearch}
                    onChange={(e) => setSymptomSearch(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <Dialog open={isSymptomDialogOpen} onOpenChange={(open) => {
                  setIsSymptomDialogOpen(open);
                  if (!open) {
                    setEditingSymptom(null);
                    resetSymptomForm();
                  }
                }}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="w-4 h-4 mr-2" />
                      Add Symptom
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>{editingSymptom ? 'Edit Symptom' : 'Add New Symptom'}</DialogTitle>
                      <DialogDescription>
                        Define symptoms that users can report during intake.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div>
                        <Label htmlFor="symptom-name">Name *</Label>
                        <Input
                          id="symptom-name"
                          value={symptomForm.name}
                          onChange={(e) => setSymptomForm({ ...symptomForm, name: e.target.value })}
                          placeholder="e.g., Anxiety, Chronic Pain"
                        />
                      </div>
                      <div>
                        <Label htmlFor="symptom-domain">Domain *</Label>
                        <Select value={symptomForm.domain} onValueChange={(v) => setSymptomForm({ ...symptomForm, domain: v as typeof symptomForm.domain })}>
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
                        <Label htmlFor="symptom-description">Description</Label>
                        <Textarea
                          id="symptom-description"
                          value={symptomForm.description}
                          onChange={(e) => setSymptomForm({ ...symptomForm, description: e.target.value })}
                          placeholder="Optional description of this symptom..."
                          rows={3}
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setIsSymptomDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button onClick={handleSaveSymptom} disabled={!symptomForm.name}>
                        <Save className="w-4 h-4 mr-2" />
                        {editingSymptom ? 'Update' : 'Create'}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>

              <div className="grid gap-2">
                {filteredSymptoms.length === 0 ? (
                  <Card>
                    <CardContent className="py-12 text-center text-muted-foreground">
                      <AlertTriangle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>No symptoms found. Create symptoms for the recommendation engine.</p>
                    </CardContent>
                  </Card>
                ) : (
                  filteredSymptoms.map((symptom) => (
                    <Card key={symptom.id} className="hover:border-primary/50 transition-colors">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-medium">{symptom.name}</h3>
                              <Badge className={domainColors[symptom.domain]}>
                                {symptom.domain}
                              </Badge>
                            </div>
                            {symptom.description && (
                              <p className="text-sm text-muted-foreground line-clamp-2">
                                {symptom.description}
                              </p>
                            )}
                          </div>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => openEditSymptom(symptom)}>
                                <Edit2 className="w-4 h-4 mr-2" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => handleDeleteSymptom(symptom.id)}
                                className="text-destructive"
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>

              {/* Conditions Section */}
              <Separator className="my-8" />
              
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-4">
                  <Heart className="w-5 h-5 text-primary" />
                  <h2 className="text-lg font-serif">Health Conditions</h2>
                </div>
                <p className="text-sm text-muted-foreground -mt-2 mb-4">
                  Broader health conditions (e.g., Lupus, Cancer, Eczema). Resources mapped to conditions are prioritized in protocol generation.
                </p>
                
                <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                  <div className="relative flex-1 sm:max-w-xs">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Search conditions..."
                      value={conditionSearch}
                      onChange={(e) => setConditionSearch(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                  <Dialog open={isConditionDialogOpen} onOpenChange={(open) => {
                    setIsConditionDialogOpen(open);
                    if (!open) {
                      setEditingCondition(null);
                      resetConditionForm();
                    }
                  }}>
                    <DialogTrigger asChild>
                      <Button>
                        <Plus className="w-4 h-4 mr-2" />
                        Add Condition
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>{editingCondition ? 'Edit Condition' : 'Add New Condition'}</DialogTitle>
                        <DialogDescription>
                          Define broader health conditions for priority resource matching.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div>
                          <Label htmlFor="condition-name">Name *</Label>
                          <Input
                            id="condition-name"
                            value={conditionForm.name}
                            onChange={(e) => setConditionForm({ ...conditionForm, name: e.target.value })}
                            placeholder="e.g., Lupus, Cancer, Eczema"
                          />
                        </div>
                        <div>
                          <Label htmlFor="condition-description">Description</Label>
                          <Textarea
                            id="condition-description"
                            value={conditionForm.description}
                            onChange={(e) => setConditionForm({ ...conditionForm, description: e.target.value })}
                            placeholder="Optional description of this condition..."
                            rows={3}
                          />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setIsConditionDialogOpen(false)}>
                          Cancel
                        </Button>
                        <Button onClick={handleSaveCondition} disabled={!conditionForm.name}>
                          <Save className="w-4 h-4 mr-2" />
                          {editingCondition ? 'Update' : 'Create'}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>

                <div className="grid gap-2">
                  {filteredConditions.length === 0 ? (
                    <Card>
                      <CardContent className="py-12 text-center text-muted-foreground">
                        <Heart className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p>No conditions found. Add conditions for priority-based protocol generation.</p>
                      </CardContent>
                    </Card>
                  ) : (
                    filteredConditions.map((condition) => (
                      <Card key={condition.id} className="hover:border-primary/50 transition-colors">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <h3 className="font-medium">{condition.name}</h3>
                                <Badge variant="secondary" className="bg-pink-500/20 text-pink-700 dark:text-pink-400">
                                  Condition
                                </Badge>
                              </div>
                              {condition.description && (
                                <p className="text-sm text-muted-foreground line-clamp-2">
                                  {condition.description}
                                </p>
                              )}
                            </div>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <MoreVertical className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => openEditCondition(condition)}>
                                  <Edit2 className="w-4 h-4 mr-2" />
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  onClick={() => handleDeleteCondition(condition.id)}
                                  className="text-destructive"
                                >
                                  <Trash2 className="w-4 h-4 mr-2" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </div>
            </TabsContent>

            {/* Teachers Tab */}
            <TabsContent value="teachers" className="space-y-4">
              <div className="flex justify-end">
                <Dialog open={isTeacherDialogOpen} onOpenChange={(open) => {
                  setIsTeacherDialogOpen(open);
                  if (!open) {
                    setEditingTeacher(null);
                    resetTeacherForm();
                  }
                }}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="w-4 h-4 mr-2" />
                      Add Teacher
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>{editingTeacher ? 'Edit Teacher' : 'Add New Teacher'}</DialogTitle>
                      <DialogDescription>
                        Add teachers who guide healing sessions.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div>
                        <Label htmlFor="teacher-name">Name *</Label>
                        <Input
                          id="teacher-name"
                          value={teacherForm.name}
                          onChange={(e) => setTeacherForm({ ...teacherForm, name: e.target.value })}
                          placeholder="Teacher name"
                        />
                      </div>
                      <div>
                        <Label htmlFor="teacher-bio">Bio</Label>
                        <Textarea
                          id="teacher-bio"
                          value={teacherForm.bio}
                          onChange={(e) => setTeacherForm({ ...teacherForm, bio: e.target.value })}
                          placeholder="Brief biography..."
                          rows={3}
                        />
                      </div>
                      <div>
                        <Label htmlFor="teacher-avatar">Avatar URL</Label>
                        <Input
                          id="teacher-avatar"
                          value={teacherForm.avatar_url}
                          onChange={(e) => setTeacherForm({ ...teacherForm, avatar_url: e.target.value })}
                          placeholder="https://..."
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setIsTeacherDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button onClick={handleSaveTeacher} disabled={!teacherForm.name}>
                        <Save className="w-4 h-4 mr-2" />
                        {editingTeacher ? 'Update' : 'Create'}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>

              <div className="grid gap-2">
                {teachers.length === 0 ? (
                  <Card>
                    <CardContent className="py-12 text-center text-muted-foreground">
                      <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>No teachers found. Add teachers to associate with resources.</p>
                    </CardContent>
                  </Card>
                ) : (
                  teachers.map((teacher) => (
                    <Card key={teacher.id} className="hover:border-primary/50 transition-colors">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-center gap-3">
                            {teacher.avatar_url && (
                              <img 
                                src={teacher.avatar_url} 
                                alt={teacher.name}
                                className="w-10 h-10 rounded-full object-cover"
                              />
                            )}
                            <div>
                              <h3 className="font-medium">{teacher.name}</h3>
                              {teacher.bio && (
                                <p className="text-sm text-muted-foreground line-clamp-1">
                                  {teacher.bio}
                                </p>
                              )}
                            </div>
                          </div>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => openEditTeacher(teacher)}>
                                <Edit2 className="w-4 h-4 mr-2" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => handleDeleteTeacher(teacher.id)}
                                className="text-destructive"
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </TabsContent>

            {/* Tags Tab */}
            <TabsContent value="tags" className="space-y-4">
              <div className="flex justify-end">
                <Dialog open={isTagDialogOpen} onOpenChange={(open) => {
                  setIsTagDialogOpen(open);
                  if (!open) {
                    setEditingTag(null);
                    resetTagForm();
                  }
                }}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="w-4 h-4 mr-2" />
                      Add Tag
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>{editingTag ? 'Edit Tag' : 'Add New Tag'}</DialogTitle>
                      <DialogDescription>
                        Create tags to categorize resources.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div>
                        <Label htmlFor="tag-name">Name *</Label>
                        <Input
                          id="tag-name"
                          value={tagForm.name}
                          onChange={(e) => setTagForm({ ...tagForm, name: e.target.value })}
                          placeholder="Tag name"
                        />
                      </div>
                      <div>
                        <Label htmlFor="tag-category">Category</Label>
                        <Input
                          id="tag-category"
                          value={tagForm.category}
                          onChange={(e) => setTagForm({ ...tagForm, category: e.target.value })}
                          placeholder="e.g., emotion, body-part"
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setIsTagDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button onClick={handleSaveTag} disabled={!tagForm.name}>
                        <Save className="w-4 h-4 mr-2" />
                        {editingTag ? 'Update' : 'Create'}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>

              <div className="grid gap-2">
                {tags.length === 0 ? (
                  <Card>
                    <CardContent className="py-12 text-center text-muted-foreground">
                      <Tag className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>No tags found. Create tags to categorize resources.</p>
                    </CardContent>
                  </Card>
                ) : (
                  tags.map((tag) => (
                    <Card key={tag.id} className="hover:border-primary/50 transition-colors">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-medium">{tag.name}</h3>
                              {tag.category && (
                                <Badge variant="secondary">{tag.category}</Badge>
                              )}
                            </div>
                          </div>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => openEditTag(tag)}>
                                <Edit2 className="w-4 h-4 mr-2" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => handleDeleteTag(tag.id)}
                                className="text-destructive"
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </TabsContent>
          </Tabs>
        )}

        {view === 'form' && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={handleFormCancel}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Resources
              </Button>
              <h2 className="font-serif text-lg">
                {editingResourceId ? 'Edit Resource' : 'New Resource'}
              </h2>
            </div>
            <HealingResourceForm
              resourceId={editingResourceId || undefined}
              onSuccess={handleFormSuccess}
              onCancel={handleFormCancel}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default AreekeeraAdmin;
