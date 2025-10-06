
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  Key, 
  Settings, 
  Eye, 
  EyeOff, 
  Edit, 
  Trash2, 
  CheckCircle, 
  AlertCircle,
  Shield,
  Loader2,
  RefreshCw
} from 'lucide-react';

interface AIProvider {
  id: string;
  name: string;
  provider_key: string;
  description: string | null;
  is_active: boolean;
}

interface UserAIProviderKey {
  id: string;
  ai_provider_id: string;
  encrypted_api_key: string;
  created_at: string;
  ai_providers?: AIProvider;
}

interface AIProviderSettingsProps {
  onSettingsUpdate?: () => void;
}

export const AIProviderSettings = ({ onSettingsUpdate }: AIProviderSettingsProps) => {
  const [providers, setProviders] = useState<AIProvider[]>([]);
  const [userKeys, setUserKeys] = useState<UserAIProviderKey[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedProvider, setSelectedProvider] = useState<AIProvider | null>(null);
  const [apiKey, setApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isTestingKey, setIsTestingKey] = useState(false);
  const [testResults, setTestResults] = useState<Record<string, { success: boolean; message: string; model?: string }>>({});
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;

      // Fetch active AI providers configured by admin
      const { data: providersData, error: providersError } = await supabase
        .from('ai_providers')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (providersError) throw providersError;

      // Fetch user's API keys
      const { data: keysData, error: keysError } = await supabase
        .from('user_ai_provider_keys')
        .select(`
          *,
          ai_providers(*)
        `)
        .eq('user_id', user.user.id);

      if (keysError) throw keysError;

      setProviders((providersData || []).filter(p => ['gemini','groq'].includes(p.provider_key.toLowerCase())));
      setUserKeys(keysData || []);
    } catch (error: any) {
      toast({
        title: "Error fetching AI providers",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddKey = (provider: AIProvider) => {
    setSelectedProvider(provider);
    setApiKey('');
    setIsDialogOpen(true);
  };

  const handleEditKey = (userKey: UserAIProviderKey) => {
    setSelectedProvider(userKey.ai_providers || null);
    setApiKey(''); // Don't show the encrypted key
    setIsDialogOpen(true);
  };

  const handleSaveKey = async () => {
    if (!selectedProvider || !apiKey.trim()) {
      toast({
        title: "Missing information",
        description: "Please provide a valid API key.",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);

    try {
      // Use secure server-side encryption function
      const { data, error } = await supabase.functions.invoke('encrypt-api-key', {
        body: {
          providerId: selectedProvider.id,
          apiKey: apiKey
        }
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error);

      toast({
        title: "API key saved securely",
        description: `Your ${selectedProvider.name} API key has been encrypted and saved with audit logging.`,
      });

      setIsDialogOpen(false);
      setApiKey('');
      setSelectedProvider(null);
      fetchData();
      onSettingsUpdate?.();

    } catch (error: any) {
      toast({
        title: "Failed to save API key",
        description: error.message || "Server-side encryption failed",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteKey = async (keyId: string, providerName: string) => {
    if (!confirm(`Are you sure you want to delete your ${providerName} API key?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('user_ai_provider_keys')
        .delete()
        .eq('id', keyId);

      if (error) throw error;

      toast({
        title: "API key deleted",
        description: `Your ${providerName} API key has been deleted.`,
      });

      fetchData();
      onSettingsUpdate?.();

    } catch (error: any) {
      toast({
        title: "Failed to delete API key",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleFixEncryption = async (userKey: UserAIProviderKey) => {
    if (!userKey.ai_providers) return;

    if (!confirm(`This will delete your current ${userKey.ai_providers.name} API key due to encryption key changes. You'll need to re-enter it. Continue?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('user_ai_provider_keys')
        .delete()
        .eq('id', userKey.id);

      if (error) throw error;

      toast({
        title: "API key cleared",
        description: `Your ${userKey.ai_providers.name} API key has been cleared. Please add it again.`,
      });

      // Clear test results for this key
      setTestResults(prev => {
        const newResults = { ...prev };
        delete newResults[userKey.id];
        return newResults;
      });

      fetchData();
      onSettingsUpdate?.();

    } catch (error: any) {
      toast({
        title: "Failed to clear API key",
        description: error.message,
        variant: "destructive",
      });
    }
  };


  const handleTestKey = async (userKey: UserAIProviderKey) => {
    if (!userKey.ai_providers) return;

    setIsTestingKey(true);
    console.log('Starting API key test for:', userKey.ai_providers.name);

    try {
      // First decrypt the API key
      console.log('Calling decrypt-api-key function...');
      const { data: decryptData, error: decryptError } = await supabase.functions.invoke('decrypt-api-key', {
        body: {
          providerId: userKey.ai_provider_id
        }
      });

      console.log('Decrypt response:', { decryptData, decryptError });

      if (decryptError || !decryptData?.success) {
        console.error('Decryption failed:', decryptError, decryptData);

        if (decryptData?.error?.includes('Failed to decrypt API key')) {
          setTestResults(prev => ({
            ...prev,
            [userKey.id]: {
              success: false,
              message: '✗ Encryption key mismatch - click Fix to resolve'
            }
          }));

          toast({
            title: "Encryption Key Mismatch",
            description: `Your ${userKey.ai_providers.name} API key was encrypted with a different key. Click the "Fix Encryption" button to resolve this.`,
            variant: "destructive",
          });
          return;
        }
        throw new Error(decryptData?.error || decryptError?.message || 'Failed to decrypt API key');
      }

      console.log('Testing API key for provider:', userKey.ai_providers.name);

      // Now test the decrypted API key
      console.log('Calling test-api-key function...');
      const { data, error } = await supabase.functions.invoke('test-api-key', {
        body: {
          providerId: userKey.ai_provider_id,
          apiKey: decryptData.apiKey
        }
      });

      console.log('Test response:', { data, error });

      if (error) throw error;

      if (data.success) {
        console.log('API key test successful:', data);
        setTestResults(prev => ({
          ...prev,
          [userKey.id]: {
            success: true,
            message: `✓ Working with ${data.model}`,
            model: data.model
          }
        }));

        toast({
          title: "API Key Valid",
          description: `${userKey.ai_providers.name} API key is working correctly with ${data.model}.`,
        });
      } else {
        console.error('API key test failed:', data);
        throw new Error(data.error || 'API key test failed');
      }

    } catch (error: any) {
      console.error('handleTestKey error:', error);

      setTestResults(prev => ({
        ...prev,
        [userKey.id]: {
          success: false,
          message: `✗ ${error.message}`
        }
      }));

      toast({
        title: "API Key Test Failed",
        description: `${userKey.ai_providers?.name} API key test failed: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setIsTestingKey(false);
    }
  };

  const hasKey = (providerId: string) => {
    return userKeys.some(key => key.ai_provider_id === providerId);
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
          <div className="text-center">Loading AI provider settings...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Key className="w-5 h-5 mr-2" />
            AI Provider Settings
          </CardTitle>
          <CardDescription>
            Configure your API keys for the AI providers set up by your administrator.
          </CardDescription>
        </CardHeader>
      
      <CardContent className="space-y-6">
        <Alert>
          <Shield className="h-4 w-4" />
          <AlertDescription>
            Your API keys are encrypted and stored securely. They are only used to process your pages and generate questions.
            Test your keys to ensure they're working correctly before generating questions.
          </AlertDescription>
        </Alert>

        <div className="grid gap-4">
          {providers.map((provider) => {
            const userKey = userKeys.find(key => key.ai_provider_id === provider.id);
            const hasApiKey = hasKey(provider.id);

            return (
              <Card key={provider.id} className="border-2">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        {getProviderIcon(provider.provider_key)}
                      </div>
                      <div>
                        <h3 className="font-medium">{provider.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {provider.description}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {hasApiKey ? (
                        <>
                          <Badge variant="default" className="bg-green-100 text-green-800">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Configured
                          </Badge>
                          {testResults[userKey!.id] && (
                            <Badge 
                              variant={testResults[userKey!.id].success ? "default" : "destructive"}
                              className={testResults[userKey!.id].success ? "bg-blue-100 text-blue-800" : ""}
                            >
                              {testResults[userKey!.id].message}
                            </Badge>
                          )}
                          {testResults[userKey!.id]?.message?.includes('Encryption key mismatch') && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleFixEncryption(userKey!)}
                              className="text-orange-600 hover:text-orange-700"
                            >
                              <RefreshCw className="w-4 h-4 mr-1" />
                              Fix Encryption
                            </Button>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleTestKey(userKey!)}
                            disabled={isTestingKey}
                          >
                            {isTestingKey ? (
                              <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                            ) : (
                              <CheckCircle className="w-4 h-4 mr-1" />
                            )}
                            Test
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditKey(userKey!)}
                          >
                            <Edit className="w-4 h-4 mr-1" />
                            Edit
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteKey(userKey!.id, provider.name)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </>
                      ) : (
                        <>
                          <Badge variant="secondary">
                            <AlertCircle className="w-3 h-3 mr-1" />
                            Not Configured
                          </Badge>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleAddKey(provider)}
                          >
                            <Key className="w-4 h-4 mr-1" />
                            Add Key
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {providers.length === 0 && (
          <div className="text-center py-8">
            <Key className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No AI providers available</h3>
            <p className="text-muted-foreground">
              Contact your administrator to enable AI providers.
            </p>
          </div>
        )}
      </CardContent>

      {/* API Key Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {userKeys.find(key => key.ai_provider_id === selectedProvider?.id) ? 'Update' : 'Add'} API Key
            </DialogTitle>
            <DialogDescription>
              {selectedProvider && (
                <>
                  Enter your {selectedProvider.name} API key. This will be encrypted and stored securely.
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="apiKey">API Key</Label>
              <div className="relative">
                <Input
                  id="apiKey"
                  type={showApiKey ? "text" : "password"}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="Enter your API key"
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowApiKey(!showApiKey)}
                >
                  {showApiKey ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            <Alert>
              <Shield className="h-4 w-4" />
              <AlertDescription>
                Your API key will be encrypted before storage and only used for processing your documents.
              </AlertDescription>
            </Alert>

            <div className="flex gap-2 pt-4">
              <Button 
                onClick={handleSaveKey} 
                disabled={isSaving || !apiKey.trim()}
                className="flex-1"
              >
                {isSaving ? 'Saving...' : 'Save API Key'}
              </Button>
              <Button 
                variant="outline" 
                onClick={() => {
                  setIsDialogOpen(false);
                  setApiKey('');
                  setSelectedProvider(null);
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      </Card>
    </div>
  );
};
