import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { dbService } from '@/services/db';
import { 
  Settings, 
  Plus, 
  Edit, 
  Trash2, 
  Key,
  CheckCircle,
  XCircle,
  GripVertical,
  ArrowUp,
  ArrowDown
} from 'lucide-react';

export interface AIProvider {
  id: string;
  name: string;
  provider_key: string;
  description: string | null;
  is_active: boolean;
  display_order?: number;
  created_at: string;
}

interface NewProvider {
  name: string;
  provider_key: string;
  description: string;
}

export const AdminAIProviderConfig = () => {
  const [providers, setProviders] = useState<AIProvider[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProvider, setEditingProvider] = useState<AIProvider | null>(null);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [newProvider, setNewProvider] = useState<NewProvider>({
    name: '',
    provider_key: '',
    description: ''
  });
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchProviders();
  }, []);

  const fetchProviders = async () => {
    try {
      const { data, error } = await dbService.getProvider().query(
        'SELECT * FROM ai_providers ORDER BY COALESCE(display_order, 99) ASC, name ASC'
      );
      if (error) throw error;
      setProviders(data || []);
    } catch (error: any) {
      console.error('Error fetching AI providers:', error);
      toast({
        title: "Error fetching AI providers",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const persistOrdering = async (updatedProviders: AIProvider[]) => {
    try {
      for (let i = 0; i < updatedProviders.length; i++) {
        const order = i + 1;
        await dbService.getProvider().execute(
          'UPDATE ai_providers SET display_order = ? WHERE id = ?',
          [order, updatedProviders[i].id]
        );
      }
      setProviders(updatedProviders.map((p, idx) => ({ ...p, display_order: idx + 1 })));
    } catch (err: any) {
      console.error('Error persisting ordering:', err);
      toast({
        title: "Error saving provider order",
        description: err.message,
        variant: "destructive"
      });
    }
  };

  const moveProvider = async (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= providers.length) return;

    const copy = [...providers];
    const temp = copy[index];
    copy[index] = copy[targetIndex];
    copy[targetIndex] = temp;

    setProviders(copy);
    await persistOrdering(copy);
    toast({
      title: "Priority order updated",
      description: `Moved ${temp.name} ${direction}. System priority updated.`,
    });
  };

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;
  };

  const handleDrop = async (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === dropIndex) return;

    const copy = [...providers];
    const [draggedItem] = copy.splice(draggedIndex, 1);
    copy.splice(dropIndex, 0, draggedItem);

    setDraggedIndex(null);
    setProviders(copy);
    await persistOrdering(copy);

    toast({
      title: "Provider Priority Reordered",
      description: `Updated priority order for AI failover pipeline.`,
    });
  };

  const handleAddProvider = () => {
    setEditingProvider(null);
    setNewProvider({ name: '', provider_key: '', description: '' });
    setIsDialogOpen(true);
  };

  const handleEditProvider = (provider: AIProvider) => {
    setEditingProvider(provider);
    setNewProvider({
      name: provider.name,
      provider_key: provider.provider_key,
      description: provider.description || ''
    });
    setIsDialogOpen(true);
  };

  const handleSaveProvider = async () => {
    if (!newProvider.name.trim() || !newProvider.provider_key.trim()) {
      toast({
        title: "Missing information",
        description: "Please provide both name and provider key.",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);

    try {
      if (editingProvider) {
        const { error } = await dbService.getProvider().execute(
          'UPDATE ai_providers SET name = ?, provider_key = ?, description = ? WHERE id = ?',
          [newProvider.name, newProvider.provider_key, newProvider.description || null, editingProvider.id]
        );
        if (error) throw error;
        toast({ title: "Provider updated", description: `${newProvider.name} updated.` });
      } else {
        const nextOrder = providers.length + 1;
        const { error } = await dbService.getProvider().execute(
          'INSERT INTO ai_providers (name, provider_key, description, is_active, display_order) VALUES (?, ?, ?, ?, ?)',
          [newProvider.name, newProvider.provider_key, newProvider.description || null, true, nextOrder]
        );
        if (error) throw error;
        toast({ title: "Provider added", description: `${newProvider.name} added at priority #${nextOrder}.` });
      }

      setIsDialogOpen(false);
      setNewProvider({ name: '', provider_key: '', description: '' });
      setEditingProvider(null);
      fetchProviders();
    } catch (error: any) {
      console.error('Error:', error);
      toast({
        title: "Failed to save provider",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleProvider = async (providerId: string, isActive: boolean) => {
    try {
      const { error } = await dbService.getProvider().execute(
        'UPDATE ai_providers SET is_active = ? WHERE id = ?',
        [isActive, providerId]
      );
      if (error) throw error;

      setProviders(providers.map(p => p.id === providerId ? { ...p, is_active: isActive } : p));

      toast({
        title: isActive ? "Provider enabled" : "Provider disabled",
        description: `Provider ${isActive ? 'enabled' : 'disabled'} for AI pipeline.`,
      });
    } catch (error: any) {
      console.error('Error:', error);
      toast({
        title: "Error updating provider status",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDeleteProvider = async (providerId: string, providerName: string) => {
    if (!confirm(`Are you sure you want to delete ${providerName}? This action cannot be undone.`)) {
      return;
    }

    try {
      const { error } = await dbService.getProvider().execute(
        'DELETE FROM ai_providers WHERE id = ?',
        [providerId]
      );
      if (error) throw error;

      setProviders(providers.filter(p => p.id !== providerId));
      toast({ title: "Provider deleted", description: `${providerName} removed.` });
    } catch (error: any) {
      console.error('Error:', error);
      toast({
        title: "Failed to delete provider",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center">Loading AI provider configuration...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center text-xl">
              <Settings className="w-5 h-5 mr-2 text-primary" />
              AI Failover & Priority Ordering
            </CardTitle>
            <CardDescription className="mt-1">
              Drag & drop or use arrows to change provider execution priority. The system attempts AI requests starting from Priority #1; if a provider fails or quota expires, it automatically fails over to the next enabled provider in order.
            </CardDescription>
          </div>
          <Button onClick={handleAddProvider}>
            <Plus className="w-4 h-4 mr-2" />
            Add Provider
          </Button>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3">
            {providers.map((provider, index) => (
              <div 
                key={provider.id} 
                draggable
                onDragStart={(e) => handleDragStart(e, index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDrop={(e) => handleDrop(e, index)}
                className={`flex items-center justify-between p-4 border rounded-xl bg-card hover:border-primary/50 transition-all cursor-move ${
                  draggedIndex === index ? 'opacity-40 border-dashed border-primary' : ''
                } ${!provider.is_active ? 'opacity-60 bg-muted/30' : ''}`}
              >
                <div className="flex items-center space-x-3">
                  <div className="flex items-center text-muted-foreground hover:text-foreground cursor-grab active:cursor-grabbing p-1">
                    <GripVertical className="w-5 h-5" />
                  </div>

                  <Badge variant="secondary" className="font-semibold text-xs px-2.5 py-1">
                    Priority #{index + 1}
                  </Badge>

                  <div className="space-y-0.5">
                    <div className="flex items-center space-x-2">
                      <h3 className="font-semibold text-base">{provider.name}</h3>
                      <Badge variant="outline" className="font-mono text-xs">
                        {provider.provider_key}
                      </Badge>
                      <Badge 
                        variant={provider.is_active ? "default" : "secondary"}
                        className="flex items-center gap-1 text-xs"
                      >
                        {provider.is_active ? (
                          <>
                            <CheckCircle className="w-3.5 h-3.5 text-green-500" /> Active
                          </>
                        ) : (
                          <>
                            <XCircle className="w-3.5 h-3.5 text-gray-400" /> Disabled
                          </>
                        )}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {provider.description || 'No description provided'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  {/* Priority Move Buttons */}
                  <div className="flex items-center space-x-1 border rounded-md p-0.5 bg-background">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      disabled={index === 0}
                      onClick={() => moveProvider(index, 'up')}
                      title="Move Up Priority"
                    >
                      <ArrowUp className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      disabled={index === providers.length - 1}
                      onClick={() => moveProvider(index, 'down')}
                      title="Move Down Priority"
                    >
                      <ArrowDown className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={!!provider.is_active}
                      onCheckedChange={(checked) => handleToggleProvider(provider.id, checked)}
                    />
                    <Label className="text-xs text-muted-foreground w-14">
                      {provider.is_active ? 'Enabled' : 'Disabled'}
                    </Label>
                  </div>

                  <div className="flex space-x-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEditProvider(provider)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteProvider(provider.id, provider.name)}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}

            {providers.length === 0 && (
              <div className="text-center py-12 border border-dashed rounded-lg">
                <Key className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-1">No AI Providers Configured</h3>
                <p className="text-sm text-muted-foreground mb-4">Click "Add Provider" to configure a new AI service.</p>
                <Button onClick={handleAddProvider}>
                  <Plus className="w-4 h-4 mr-2" /> Add First Provider
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Add / Edit Provider Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingProvider ? 'Edit Provider' : 'Add New Provider'}
            </DialogTitle>
            <DialogDescription>
              {editingProvider ? 'Modify the AI provider configuration.' : 'Add a new AI provider to make it available in the system.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="providerName">Provider Name</Label>
              <Input
                id="providerName"
                placeholder="e.g. OpenAI ChatGPT"
                value={newProvider.name}
                onChange={(e) => setNewProvider({ ...newProvider, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="providerKey">Provider Key</Label>
              <Input
                id="providerKey"
                placeholder="e.g. openai, gemini, groq, deepseek"
                value={newProvider.provider_key}
                onChange={(e) => setNewProvider({ ...newProvider, provider_key: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">Unique identifier used internally by system adapters.</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="providerDescription">Description</Label>
              <Textarea
                id="providerDescription"
                placeholder="Brief description of the model or provider capabilities."
                value={newProvider.description}
                onChange={(e) => setNewProvider({ ...newProvider, description: e.target.value })}
              />
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-4 border-t">
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveProvider} disabled={isSaving}>
              {isSaving ? 'Saving...' : editingProvider ? 'Update Provider' : 'Add Provider'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
