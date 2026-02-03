import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Plus, Edit2, Check, X, Loader2, ArrowUp, ArrowDown } from 'lucide-react';

interface Category {
  id: string;
  type: 'resource_type' | 'location';
  name: string;
  slug: string;
  active: boolean;
  display_order: number;
  page: 'devotion' | 'remembrance' | null;
}

const PAGE_LABELS: Record<string, string> = {
  devotion: 'Door of Devotion',
  remembrance: 'Door of Remembrance',
};

const CategoryManager = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<Category[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [newResourceType, setNewResourceType] = useState('');
  const [newLocation, setNewLocation] = useState('');
  const [newLocationPage, setNewLocationPage] = useState<'devotion' | 'remembrance'>('devotion');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('content_categories')
      .select('*')
      .order('display_order');

    if (data) {
      setCategories(data as Category[]);
    }
    setLoading(false);
  };

  const generateSlug = (name: string, type: 'resource_type' | 'location') => {
    const prefix = type === 'location' ? 'loc-' : '';
    return prefix + name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  };

  const addCategory = async (type: 'resource_type' | 'location', name: string, page?: 'devotion' | 'remembrance') => {
    if (!name.trim()) return;
    setSaving(true);

    const slug = generateSlug(name.trim(), type);

    // Check for duplicate slug
    const existingSlug = categories.find(c => c.slug === slug);
    if (existingSlug) {
      toast({
        title: 'Error',
        description: 'A category with this name already exists.',
        variant: 'destructive',
      });
      setSaving(false);
      return;
    }

    // Get max display_order for this type
    const maxOrder = categories
      .filter(c => c.type === type)
      .reduce((max, c) => Math.max(max, c.display_order || 0), 0);

    const insertData: any = {
      type,
      name: name.trim(),
      slug,
      active: true,
      display_order: maxOrder + 1,
    };

    // Only set page for locations
    if (type === 'location' && page) {
      insertData.page = page;
    }

    const { data, error } = await supabase
      .from('content_categories')
      .insert(insertData)
      .select()
      .single();

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to add category.',
        variant: 'destructive',
      });
    } else {
      setCategories([...categories, data as Category]);
      if (type === 'resource_type') {
        setNewResourceType('');
      } else {
        setNewLocation('');
      }
      toast({
        title: 'Added',
        description: 'Category added successfully.',
      });
    }

    setSaving(false);
  };

  const updateCategory = async (id: string, updates: Partial<Category>) => {
    const { error } = await supabase
      .from('content_categories')
      .update(updates)
      .eq('id', id);

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to update category.',
        variant: 'destructive',
      });
    } else {
      setCategories(categories.map(c => c.id === id ? { ...c, ...updates } : c));
      setEditingId(null);
      toast({
        title: 'Updated',
        description: 'Category updated.',
      });
    }
  };

  const startEditing = (category: Category) => {
    setEditingId(category.id);
    setEditName(category.name);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditName('');
  };

  const saveEdit = (category: Category) => {
    if (editName.trim() && editName.trim() !== category.name) {
      const newSlug = generateSlug(editName.trim(), category.type);
      updateCategory(category.id, { name: editName.trim(), slug: newSlug });
    } else {
      cancelEditing();
    }
  };

  const toggleActive = (category: Category) => {
    updateCategory(category.id, { active: !category.active });
  };

  const updatePage = (category: Category, page: 'devotion' | 'remembrance') => {
    updateCategory(category.id, { page });
  };

  const moveCategory = async (category: Category, direction: 'up' | 'down') => {
    const typeCategories = categories
      .filter(c => c.type === category.type)
      .sort((a, b) => (a.display_order || 0) - (b.display_order || 0));
    
    const currentIndex = typeCategories.findIndex(c => c.id === category.id);
    const swapIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    
    if (swapIndex < 0 || swapIndex >= typeCategories.length) return;
    
    const swapCategory = typeCategories[swapIndex];
    const currentOrder = category.display_order;
    const swapOrder = swapCategory.display_order;
    
    // Update both categories
    const { error: error1 } = await supabase
      .from('content_categories')
      .update({ display_order: swapOrder })
      .eq('id', category.id);
    
    const { error: error2 } = await supabase
      .from('content_categories')
      .update({ display_order: currentOrder })
      .eq('id', swapCategory.id);
    
    if (error1 || error2) {
      toast({
        title: 'Error',
        description: 'Failed to reorder categories.',
        variant: 'destructive',
      });
    } else {
      // Update local state
      setCategories(categories.map(c => {
        if (c.id === category.id) return { ...c, display_order: swapOrder };
        if (c.id === swapCategory.id) return { ...c, display_order: currentOrder };
        return c;
      }));
    }
  };

  const resourceTypes = categories
    .filter(c => c.type === 'resource_type')
    .sort((a, b) => (a.display_order || 0) - (b.display_order || 0));
  
  // Group locations by page
  const devotionLocations = categories
    .filter(c => c.type === 'location' && c.page === 'devotion')
    .sort((a, b) => (a.display_order || 0) - (b.display_order || 0));
  
  const remembranceLocations = categories
    .filter(c => c.type === 'location' && c.page === 'remembrance')
    .sort((a, b) => (a.display_order || 0) - (b.display_order || 0));

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  const renderCategoryList = (items: Category[], type: 'resource_type' | 'location', showPageSelector = false) => (
    <div className="space-y-2">
      {items.map((category, index) => (
        <div
          key={category.id}
          className={`flex items-center gap-2 p-3 rounded-md border ${
            category.active ? 'bg-background' : 'bg-muted/50 opacity-60'
          }`}
        >
          {/* Reorder buttons */}
          <div className="flex flex-col gap-0.5">
            <Button
              size="sm"
              variant="ghost"
              className="h-5 w-5 p-0"
              onClick={() => moveCategory(category, 'up')}
              disabled={index === 0}
            >
              <ArrowUp className="w-3 h-3" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-5 w-5 p-0"
              onClick={() => moveCategory(category, 'down')}
              disabled={index === items.length - 1}
            >
              <ArrowDown className="w-3 h-3" />
            </Button>
          </div>

          {editingId === category.id ? (
            <>
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') saveEdit(category);
                  if (e.key === 'Escape') cancelEditing();
                }}
                className="flex-1 h-8"
                autoFocus
              />
              <Button size="sm" variant="ghost" onClick={() => saveEdit(category)}>
                <Check className="w-4 h-4 text-green-600" />
              </Button>
              <Button size="sm" variant="ghost" onClick={cancelEditing}>
                <X className="w-4 h-4" />
              </Button>
            </>
          ) : (
            <>
              <span className="flex-1">{category.name}</span>
              <span className="text-xs text-muted-foreground hidden md:block">{category.slug}</span>
              {showPageSelector && (
                <Select
                  value={category.page || 'devotion'}
                  onValueChange={(value: 'devotion' | 'remembrance') => updatePage(category, value)}
                >
                  <SelectTrigger className="w-[160px] h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="devotion">Door of Devotion</SelectItem>
                    <SelectItem value="remembrance">Door of Remembrance</SelectItem>
                  </SelectContent>
                </Select>
              )}
              <Button
                size="sm"
                variant="ghost"
                onClick={() => startEditing(category)}
              >
                <Edit2 className="w-4 h-4" />
              </Button>
              <Switch
                checked={category.active}
                onCheckedChange={() => toggleActive(category)}
                aria-label="Toggle active"
              />
            </>
          )}
        </div>
      ))}
    </div>
  );

  const renderResourceTypeInput = () => (
    <div className="flex gap-2 mt-4">
      <Input
        placeholder="Add new resource type..."
        value={newResourceType}
        onChange={(e) => setNewResourceType(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            addCategory('resource_type', newResourceType);
          }
        }}
      />
      <Button
        onClick={() => addCategory('resource_type', newResourceType)}
        disabled={saving || !newResourceType.trim()}
      >
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
      </Button>
    </div>
  );

  const renderLocationInput = () => (
    <div className="flex gap-2 mt-4">
      <Input
        placeholder="Add new location..."
        value={newLocation}
        onChange={(e) => setNewLocation(e.target.value)}
        className="flex-1"
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            addCategory('location', newLocation, newLocationPage);
          }
        }}
      />
      <Select
        value={newLocationPage}
        onValueChange={(value: 'devotion' | 'remembrance') => setNewLocationPage(value)}
      >
        <SelectTrigger className="w-[160px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="devotion">Door of Devotion</SelectItem>
          <SelectItem value="remembrance">Door of Remembrance</SelectItem>
        </SelectContent>
      </Select>
      <Button
        onClick={() => addCategory('location', newLocation, newLocationPage)}
        disabled={saving || !newLocation.trim()}
      >
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
      </Button>
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold mb-2">Manage Categories</h2>
        <p className="text-sm text-muted-foreground">
          Add, edit, or deactivate resource types and locations. Deactivated categories are hidden from new content but preserved for existing resources.
        </p>
      </div>

      <Tabs defaultValue="resource_types">
        <TabsList>
          <TabsTrigger value="resource_types">Resource Types</TabsTrigger>
          <TabsTrigger value="locations">Locations</TabsTrigger>
        </TabsList>

        <TabsContent value="resource_types" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Resource Types</CardTitle>
              <CardDescription>
                Categories like Guided Meditation, Altar Practices, etc.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {renderCategoryList(resourceTypes, 'resource_type')}
              {renderResourceTypeInput()}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="locations" className="mt-4 space-y-6">
          {/* Door of Devotion Locations */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Door of Devotion</CardTitle>
              <CardDescription>
                Locations where content appears within the Door of Devotion grid
              </CardDescription>
            </CardHeader>
            <CardContent>
              {devotionLocations.length > 0 ? (
                renderCategoryList(devotionLocations, 'location', true)
              ) : (
                <p className="text-sm text-muted-foreground py-4">No locations yet.</p>
              )}
            </CardContent>
          </Card>

          {/* Door of Remembrance Locations */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Door of Remembrance</CardTitle>
              <CardDescription>
                Locations where content appears within the Door of Remembrance grid
              </CardDescription>
            </CardHeader>
            <CardContent>
              {remembranceLocations.length > 0 ? (
                renderCategoryList(remembranceLocations, 'location', true)
              ) : (
                <p className="text-sm text-muted-foreground py-4">No locations yet.</p>
              )}
            </CardContent>
          </Card>

          {/* Add new location input */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Add New Location</CardTitle>
            </CardHeader>
            <CardContent>
              {renderLocationInput()}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default CategoryManager;
