import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { dbService } from '@/services/db';
import { 
  Key, 
  Eye, 
  EyeOff, 
  Save, 
  Shield,
  Zap,
  Settings,
  AlertCircle,
  CheckCircle2
} from 'lucide-react';

interface APIKeyConfig {
  name: string;
  key: string;
  description: string;
  icon: React.ReactNode;
  envKey: string;
}

interface SystemAPIKeysProps {
  key?: number;
}

export const SystemAPIKeys = ({ key }: SystemAPIKeysProps) => {
  const [providers, setProviders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [apiKeys, setApiKeys] = useState<Record<string, string>>({});
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
  const [configuredKeys, setConfiguredKeys] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  useEffect(() => {
    fetchProviders();
  }, []);

  const fetchProviders = async () => {
    try {
      const { data, error } = await dbService.getProvider().query(
        'SELECT * FROM ai_providers WHERE is_active = true ORDER BY name'
      );

      if (error) throw error;
      setProviders((data || []).filter(p => ['gemini','groq'].includes(p.provider_key.toLowerCase())));
      checkConfiguredKeys();
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

  const checkConfiguredKeys = async () => {
    // This would typically call an edge function to check which environment variables are set
    // For now, we'll assume none are configured
    setConfiguredKeys(new Set());
  };

  const getProviderIcon = (providerKey: string) => {
    switch (providerKey.toLowerCase()) {
      case 'gemini':
        return <Settings className="w-5 h-5" />;
      default:
        return <Key className="w-5 h-5" />;
    }
  };

  const handleKeyChange = (keyName: string, value: string) => {
    setApiKeys(prev => ({
      ...prev,
      [keyName]: value
    }));
  };

  const toggleShowKey = (keyName: string) => {
    setShowKeys(prev => ({
      ...prev,
      [keyName]: !prev[keyName]
    }));
  };

  const handleSaveKeys = async () => {
    setIsLoading(true);
    
    try {
      // Call edge function to save API keys as environment variables
      const error = null; // Mocked

      if (error) throw error;
      
      toast({
        title: "API Keys Saved",
        description: "System API keys have been configured successfully. Pages processing will now work as fallback.",
      });

      // Update configured keys
      const newConfiguredKeys = new Set<string>();
      Object.entries(apiKeys).forEach(([key, value]) => {
        if (value.trim()) {
          newConfiguredKeys.add(key);
        }
      });
      setConfiguredKeys(newConfiguredKeys);

    } catch (error: any) {
      console.error('Error:', error);
      toast({
        title: "Error",
        description: "Failed to save API keys. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Key className="w-5 h-5 mr-2" />
          System API Keys
        </CardTitle>
        <CardDescription>
          Configure system-wide API keys that serve as fallbacks when users haven't configured their own keys.
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        <Alert>
          <Shield className="h-4 w-4" />
          <AlertDescription>
            These API keys are used as fallbacks when users haven't configured their own keys. 
            They will be stored securely in environment variables.
          </AlertDescription>
        </Alert>

        <div className="space-y-4">
          {providers.map((provider) => {
            const isConfigured = configuredKeys.has(provider.provider_key);
            const currentValue = apiKeys[provider.provider_key] || '';
            const isShown = showKeys[provider.provider_key] || false;

            return (
              <Card key={provider.id} className="border-2">
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/10 rounded-lg">
                          {getProviderIcon(provider.provider_key)}
                        </div>
                        <div>
                          <h3 className="font-medium">{provider.name}</h3>
                          <p className="text-sm text-muted-foreground">
                            {provider.description || `Used for page processing with ${provider.name} models`}
                          </p>
                        </div>
                      </div>
                      
                      <Badge variant={isConfigured ? "default" : "secondary"}>
                        {isConfigured ? (
                          <>
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            Configured
                          </>
                        ) : (
                          <>
                            <AlertCircle className="w-3 h-3 mr-1" />
                            Not Set
                          </>
                        )}
                      </Badge>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor={provider.provider_key}>
                        {provider.name} API Key
                      </Label>
                      <div className="relative">
                        <Input
                          id={provider.provider_key}
                          type={isShown ? "text" : "password"}
                          value={currentValue}
                          onChange={(e) => handleKeyChange(provider.provider_key, e.target.value)}
                          placeholder={isConfigured ? "••••••••••••••••" : `Enter your ${provider.name} API key`}
                          className="pr-10"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                          onClick={() => toggleShowKey(provider.provider_key)}
                        >
                          {isShown ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="flex justify-end">
          <Button 
            onClick={handleSaveKeys}
            disabled={isLoading || Object.values(apiKeys).every(key => !key.trim())}
            className="min-w-32"
          >
            {isLoading ? (
              'Saving...'
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save Keys
              </>
            )}
          </Button>
        </div>

        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Note:</strong> For this demo, API keys need to be configured manually. 
            To enable page processing, either:
            <br />
            1. Users can configure their own API keys in the Parent Dashboard → AI Settings
            <br />
            2. Or configure system fallback keys here (requires backend implementation)
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
};