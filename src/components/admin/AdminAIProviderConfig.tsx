
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
      setProviders((data || []).filter(p => ['gemini','groq'].includes(p.provider_key.toLowerCase())));
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

  const getProviderIcon = (providerKey: string) => {
    switch (providerKey.toLowerCase()) {
      case 'gemini':
        return <Settings className="w-5 h-5" />;
      default:
        return <Key className="w-5 h-5" />;
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
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center">
                <Settings className="w-5 h-5 mr-2" />
                AI Provider Configuration
              </CardTitle>
              <CardDescription>
                Manage available AI providers for the system. Teachers will configure their own API keys for these providers.
              </CardDescription>
            </div>
            <Button onClick={handleAddProvider}>
              <Plus className="w-4 h-4 mr-2" />
              Add Provider
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Providers Grid */}
      <div className="grid gap-4">
        {providers.map((provider) => (
          <Card key={provider.id} className="border-2">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-primary/10 rounded-lg">
                    {getProviderIcon(provider.provider_key)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-lg">{provider.name}</h3>
                      <Badge variant={provider.is_active ? "default" : "secondary"}>
                        {provider.is_active ? (
                          <>
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Active
                          </>
                        ) : (
                          <>
                            <XCircle className="w-3 h-3 mr-1" />
                            Inactive
                          </>
                        )}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">
                      Provider Key: <code className="bg-muted px-1 py-0.5 rounded">{provider.provider_key}</code>
                    </p>
                    {provider.description && (
                      <p className="text-sm text-muted-foreground">{provider.description}</p>
                    )}
                    <p className="text-xs text-muted-foreground mt-2">
                      Created: {new Date(provider.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <div className="flex items-center space-x-2">
                    <Label htmlFor={`active-${provider.id}`} className="text-sm">
                      Active
                    </Label>
                    <Switch
                      id={`active-${provider.id}`}
                      checked={provider.is_active}
                      onCheckedChange={(checked) => handleToggleProvider(provider.id, checked)}
                    />
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEditProvider(provider)}
                  >
                    <Edit className="w-4 h-4 mr-1" />
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDeleteProvider(provider.id, provider.name)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {providers.length === 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <Settings className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No AI providers configured</h3>
              <p className="text-muted-foreground mb-4">
                Add AI providers to enable content generation features for teachers.
              </p>
              <Button onClick={handleAddProvider}>
                <Plus className="w-4 h-4 mr-2" />
                Add Your First Provider
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Add/Edit Provider Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingProvider ? 'Edit AI Provider' : 'Add AI Provider'}
            </DialogTitle>
            <DialogDescription>
              {editingProvider 
                ? 'Update the AI provider configuration'
                : 'Configure a new AI provider for the system. Teachers will set their own API keys for this provider.'
              }
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Provider Name</Label>
              <Input
                id="name"
                value={newProvider.name}
                onChange={(e) => setNewProvider({ ...newProvider, name: e.target.value })}
                placeholder="e.g., Gemini"
              />
            </div>

            <div>
              <Label htmlFor="provider_key">Provider Key</Label>
              <Input
                id="provider_key"
                value={newProvider.provider_key}
                onChange={(e) => setNewProvider({ ...newProvider, provider_key: e.target.value })}
                placeholder="e.g., gemini"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Unique identifier for this provider (lowercase, no spaces)
              </p>
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={newProvider.description}
                onChange={(e) => setNewProvider({ ...newProvider, description: e.target.value })}
                placeholder="Describe this AI provider..."
                rows={3}
              />
            </div>

            <div className="flex gap-2 pt-4">
              <Button 
                onClick={handleSaveProvider} 
                disabled={isSaving || !newProvider.name.trim() || !newProvider.provider_key.trim()}
                className="flex-1"
              >
                {isSaving ? 'Saving...' : (editingProvider ? 'Update Provider' : 'Add Provider')}
              </Button>
              <Button 
                variant="outline" 
                onClick={() => {
                  setIsDialogOpen(false);
                  setNewProvider({ name: '', provider_key: '', description: '' });
                  setEditingProvider(null);
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
