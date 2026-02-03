import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Plus, Edit2, Check, X, Loader2, ArrowUp, ArrowDown, GripVertical } from 'lucide-react';

interface Category {
  id: string;
  type: 'resource_type' | 'location';
  name: string;
  slug: string;
  active: boolean;
  display_order: number;
}

const CategoryManager = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<Category[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [newResourceType, setNewResourceType] = useState('');
  const [newLocation, setNewLocation] = useState('');
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

  const addCategory = async (type: 'resource_type' | 'location', name: string) => {
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

    const { data, error } = await supabase
      .from('content_categories')
      .insert({
        type,
        name: name.trim(),
        slug,
        active: true,
        display_order: maxOrder + 1,
      })
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
  const locations = categories
    .filter(c => c.type === 'location')
    .sort((a, b) => (a.display_order || 0) - (b.display_order || 0));

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  const renderCategoryList = (items: Category[], type: 'resource_type' | 'location') => (
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
              <span className="text-xs text-muted-foreground">{category.slug}</span>
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

      {/* Add new */}
      <div className="flex gap-2 mt-4">
        <Input
          placeholder={`Add new ${type === 'resource_type' ? 'resource type' : 'location'}...`}
          value={type === 'resource_type' ? newResourceType : newLocation}
          onChange={(e) => type === 'resource_type' 
            ? setNewResourceType(e.target.value) 
            : setNewLocation(e.target.value)
          }
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              addCategory(type, type === 'resource_type' ? newResourceType : newLocation);
            }
          }}
        />
        <Button
          onClick={() => addCategory(type, type === 'resource_type' ? newResourceType : newLocation)}
          disabled={saving || !(type === 'resource_type' ? newResourceType : newLocation).trim()}
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
        </Button>
      </div>
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
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="locations" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Locations</CardTitle>
              <CardDescription>
                Where content appears within The Door of Devotion
              </CardDescription>
            </CardHeader>
            <CardContent>
              {renderCategoryList(locations, 'location')}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default CategoryManager;
