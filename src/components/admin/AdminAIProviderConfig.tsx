import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { dbService } from '@/services/db';
import { 
  Settings, 
  Plus, 
  Edit, 
  Trash2, 
  Key,
  CheckCircle,
  XCircle
} from 'lucide-react';

interface AIProvider {
  id: string;
  name: string;
  provider_key: string;
  description: string | null;
  is_active: boolean;
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
      const { data, error } = await dbService.getProvider().query('SELECT * FROM ai_providers ORDER BY name');
      if (error) throw error;
      setProviders(data || []);
    } catch (error: any) {
      console.error('Error:', error);
      toast({
        title: "Error fetching AI providers",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
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
        // Update existing provider
        const { error } = await dbService.getProvider().execute(
          'UPDATE ai_providers SET name = ?, provider_key = ?, description = ? WHERE id = ?',
          [newProvider.name, newProvider.provider_key, newProvider.description || null, editingProvider.id]
        );

        if (error) throw error;

        toast({
          title: "Provider updated",
          description: `${newProvider.name} has been updated successfully.`,
        });
      } else {
        // Create new provider
        const { error } = await dbService.getProvider().execute(
          'INSERT INTO ai_providers (name, provider_key, description, is_active) VALUES (?, ?, ?, ?)',
          [newProvider.name, newProvider.provider_key, newProvider.description || null, true]
        );

        if (error) throw error;

        toast({
          title: "Provider added",
          description: `${newProvider.name} has been added successfully.`,
        });
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

      setProviders(providers.map(provider => 
        provider.id === providerId ? { ...provider, is_active: isActive } : provider
      ));

      toast({
        title: isActive ? "Provider enabled" : "Provider disabled",
        description: `Provider has been ${isActive ? 'enabled' : 'disabled'} successfully.`,
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

      setProviders(providers.filter(provider => provider.id !== providerId));

      toast({
        title: "Provider deleted",
        description: `${providerName} has been deleted successfully.`,
      });
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
          <div className="text-center">Loading AI providers...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center">
              <Settings className="w-5 h-5 mr-2" />
              AI Provider Management
            </CardTitle>
            <CardDescription>
              Configure and manage AI providers available to teachers and users across the platform.
            </CardDescription>
          </div>
          <Button onClick={handleAddProvider}>
            <Plus className="w-4 h-4 mr-2" />
            Add Provider
          </Button>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            {providers.map((provider) => (
              <div 
                key={provider.id} 
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
              >
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <h3 className="font-semibold text-lg">{provider.name}</h3>
                    <Badge variant="outline" className="font-mono text-xs">
                      {provider.provider_key}
                    </Badge>
                    <Badge 
                      variant={provider.is_active ? "default" : "secondary"}
                      className="flex items-center gap-1 text-xs"
                    >
                      {provider.is_active ? (
                        <>
                          <CheckCircle className="w-3 h-3 text-green-500" /> Active
                        </>
                      ) : (
                        <>
                          <XCircle className="w-3 h-3 text-gray-400" /> Inactive
                        </>
                      )}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {provider.description || 'No description provided'}
                  </p>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={!!provider.is_active}
                      onCheckedChange={(checked) => handleToggleProvider(provider.id, checked)}
                    />
                    <Label className="text-xs text-muted-foreground">
                      {provider.is_active ? 'Enabled' : 'Disabled'}
                    </Label>
                  </div>
                  <div className="flex space-x-2">
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
                placeholder="e.g. openai, gemini, groq"
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
