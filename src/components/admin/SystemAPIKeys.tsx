import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
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

const apiConfigs: APIKeyConfig[] = [
  {
    name: 'OpenAI',
    key: 'OPENAI_API_KEY',
    description: 'Used for document processing and question generation with GPT models',
    icon: <Zap className="w-5 h-5" />,
    envKey: 'OPENAI_API_KEY'
  },
  {
    name: 'Anthropic',
    key: 'ANTHROPIC_API_KEY', 
    description: 'Used for document processing with Claude models',
    icon: <Shield className="w-5 h-5" />,
    envKey: 'ANTHROPIC_API_KEY'
  },
  {
    name: 'Google Gemini',
    key: 'GEMINI_API_KEY',
    description: 'Used for document processing with Gemini models',
    icon: <Settings className="w-5 h-5" />,
    envKey: 'GEMINI_API_KEY'
  }
];

export const SystemAPIKeys = () => {
  const [apiKeys, setApiKeys] = useState<Record<string, string>>({});
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [configuredKeys, setConfiguredKeys] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  useEffect(() => {
    // In a real implementation, you would check which keys are configured
    // For now, we'll just show placeholders
    checkConfiguredKeys();
  }, []);

  const checkConfiguredKeys = async () => {
    // This would typically call an edge function to check which environment variables are set
    // For now, we'll assume none are configured
    setConfiguredKeys(new Set());
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
      const { error } = await supabase.functions.invoke('save-admin-api-keys', {
        body: { apiKeys }
      });

      if (error) throw error;
      
      toast({
        title: "API Keys Saved",
        description: "System API keys have been configured successfully. Document processing will now work as fallback.",
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
          {apiConfigs.map((config) => {
            const isConfigured = configuredKeys.has(config.key);
            const currentValue = apiKeys[config.key] || '';
            const isShown = showKeys[config.key] || false;

            return (
              <Card key={config.key} className="border-2">
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/10 rounded-lg">
                          {config.icon}
                        </div>
                        <div>
                          <h3 className="font-medium">{config.name}</h3>
                          <p className="text-sm text-muted-foreground">
                            {config.description}
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
                      <Label htmlFor={config.key}>
                        {config.name} API Key
                      </Label>
                      <div className="relative">
                        <Input
                          id={config.key}
                          type={isShown ? "text" : "password"}
                          value={currentValue}
                          onChange={(e) => handleKeyChange(config.key, e.target.value)}
                          placeholder={isConfigured ? "••••••••••••••••" : `Enter your ${config.name} API key`}
                          className="pr-10"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                          onClick={() => toggleShowKey(config.key)}
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
            To enable document processing, either:
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