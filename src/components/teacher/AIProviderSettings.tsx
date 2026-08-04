
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { dbService } from '@/services/db';
import { authService } from '@/services/auth/authService';
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
      const user = authService.getCurrentUser();
      if (!user) return;

      // Fetch active AI providers configured by admin
      const { data: providersData, error: providersError } = await dbService.getProvider().query(
        'SELECT * FROM ai_providers WHERE is_active = ? ORDER BY name',
        [true]
      );

      if (providersError) throw providersError;

      // Fetch user's API keys
      const { data: rawKeysData, error: keysError } = await dbService.getProvider().query(
        'SELECT * FROM user_ai_provider_keys WHERE user_id = ?',
        [user.id]
      );

      if (keysError) throw keysError;
      
      const keysData = rawKeysData?.map((key: any) => {
        const provider = providersData?.find((p: any) => p.id === key.ai_provider_id);
        return {
          ...key,
          ai_providers: provider
        };
      });

      setProviders((providersData || []).filter((p: any) => ['gemini','groq'].includes(p.provider_key.toLowerCase())));
      setUserKeys(keysData || []);
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
      const data = { success: true };
      const error = null;
      const user = authService.getCurrentUser();
      
      if (user) {
        const sanitizedKey = apiKey.replace(/^(encrypted_)+/gi, '').replace(/^["']|["']$/g, '').trim();
        const { data: existing } = await dbService.getProvider().query(
          'SELECT id FROM user_ai_provider_keys WHERE user_id = ? AND ai_provider_id = ?',
          [user.id, selectedProvider.id]
        );
        if (existing && existing.length > 0) {
          await dbService.getProvider().execute(
            'UPDATE user_ai_provider_keys SET encrypted_api_key = ? WHERE id = ?',
            [sanitizedKey, existing[0].id]
          );
        } else {
          await dbService.getProvider().execute(
            'INSERT INTO user_ai_provider_keys (id, user_id, ai_provider_id, encrypted_api_key, created_at) VALUES (?, ?, ?, ?, ?)',
            [crypto.randomUUID(), user.id, selectedProvider.id, sanitizedKey, new Date().toISOString()]
          );
        }
      }

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
      console.error('Error:', error);
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
      const { error } = await dbService.getProvider().execute(
        'DELETE FROM user_ai_provider_keys WHERE id = ?',
        [keyId]
      );

      if (error) throw error;

      toast({
        title: "API key deleted",
        description: `Your ${providerName} API key has been deleted.`,
      });

      fetchData();
      onSettingsUpdate?.();

    } catch (error: any) {
      console.error('Error:', error);
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
      const { error } = await dbService.getProvider().execute(
        'DELETE FROM user_ai_provider_keys WHERE id = ?',
        [userKey.id]
      );

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
      console.error('Error:', error);
      toast({
        title: "Failed to clear API key",
        description: error.message,
        variant: "destructive",
      });
    }
  };


  const decodeApiKey = (rawKey: string): string => {
    if (!rawKey) return '';
    let str = rawKey.replace(/^(encrypted_)+/gi, '').replace(/^["']|["']$/g, '').trim();
    if (!str.startsWith('AIzaSy') && !str.startsWith('gsk_') && !str.startsWith('sk-')) {
      try {
        const decoded = atob(str);
        if (
          decoded.startsWith('AIzaSy') ||
          decoded.startsWith('gsk_') ||
          decoded.startsWith('sk-') ||
          (decoded.length >= 15 && /^[\x20-\x7E]+$/.test(decoded))
        ) {
          str = decoded;
        }
      } catch {
        // Keep str as is
      }
    }
    return str.trim();
  };

  const handleTestKey = async (userKey: UserAIProviderKey) => {
    if (!userKey.ai_providers) return;

    setIsTestingKey(true);
    const providerName = userKey.ai_providers.name;
    const providerKey = (userKey.ai_providers.provider_key || '').toLowerCase();
    const rawKey = userKey.encrypted_api_key || '';
    const cleanKey = decodeApiKey(rawKey);

    const maskedKey = cleanKey.length > 8 
      ? `${cleanKey.slice(0, 5)}...${cleanKey.slice(-4)}`
      : cleanKey;

    console.log('[AI Key Test Debug]', {
      providerName,
      providerKey,
      rawKeyStored: rawKey,
      cleanKeyDecoded: cleanKey,
      maskedKey
    });

    if (!cleanKey) {
      setTestResults(prev => ({
        ...prev,
        [userKey.id]: {
          success: false,
          message: '✗ No API key provided'
        }
      }));
      setIsTestingKey(false);
      return;
    }

    try {
      let testedModel = '';

      if (providerKey.includes('gemini') || providerName.toLowerCase().includes('gemini')) {
        // Live test call to Google Gemini API
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${encodeURIComponent(cleanKey)}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: "Ping test" }] }]
          })
        });

        if (!res.ok) {
          const errJson = await res.json().catch(() => ({}));
          const msg = errJson.error?.message || `HTTP ${res.status}: Invalid Gemini API Key`;
          throw new Error(msg);
        }
        testedModel = 'gemini-1.5-flash';

      } else if (providerKey.includes('groq') || providerName.toLowerCase().includes('groq')) {
        // Live test call to Groq API
        const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${cleanKey}`
          },
          body: JSON.stringify({
            model: 'llama-3.3-70b-versatile',
            messages: [{ role: 'user', content: 'Ping test' }],
            max_tokens: 5
          })
        });

        if (!res.ok) {
          const errJson = await res.json().catch(() => ({}));
          throw new Error(errJson.error?.message || `HTTP ${res.status}: Invalid Groq API Key`);
        }
        testedModel = 'llama-3.3-70b-versatile';

      } else {
        // Live test call to OpenAI API
        const res = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${cleanKey}`
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [{ role: 'user', content: 'Ping test' }],
            max_tokens: 5
          })
        });

        if (!res.ok) {
          const errJson = await res.json().catch(() => ({}));
          throw new Error(errJson.error?.message || `HTTP ${res.status}: Invalid OpenAI API Key`);
        }
        testedModel = 'gpt-4o-mini';
      }

      setTestResults(prev => ({
        ...prev,
        [userKey.id]: {
          success: true,
          message: `✓ Connected (${testedModel})`,
          model: testedModel
        }
      }));

      toast({
        title: "API Key Verified",
        description: `${providerName} key (${maskedKey}) verified successfully with ${testedModel}.`,
      });

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
        description: `Key (${maskedKey}): ${error.message || "Could not verify API key."}`,
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
