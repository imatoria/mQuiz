import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  Key, 
  CheckCircle, 
  AlertCircle,
  Shield,
  Zap,
  Settings,
  ArrowRight,
  Sparkles
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

export const AIKeyStatusOverview = () => {
  const [providers, setProviders] = useState<AIProvider[]>([]);
  const [userKeys, setUserKeys] = useState<UserAIProviderKey[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;

      // Fetch available AI providers
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

      setProviders(providersData || []);
      setUserKeys(keysData || []);
    } catch (error: any) {
      toast({
        title: "Error fetching AI provider status",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const hasKey = (providerId: string) => {
    return userKeys.some(key => key.ai_provider_id === providerId);
  };

  const getProviderIcon = (providerKey: string) => {
    switch (providerKey.toLowerCase()) {
      case 'openai':
        return <Zap className="w-4 h-4" />;
      case 'anthropic':
        return <Shield className="w-4 h-4" />;
      case 'gemini':
        return <Settings className="w-4 h-4" />;
      default:
        return <Key className="w-4 h-4" />;
    }
  };

  const configuredCount = userKeys.length;
  const totalProviders = providers.length;

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center">Loading AI configuration status...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="w-5 h-5" />
          AI Configuration Status
        </CardTitle>
        <CardDescription>
          Overview of your AI provider configuration for question generation
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Status Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center p-4 border rounded-lg">
            <div className="text-2xl font-bold text-primary">{configuredCount}</div>
            <div className="text-sm text-muted-foreground">API Keys Configured</div>
          </div>
          
          <div className="text-center p-4 border rounded-lg">
            <div className="text-2xl font-bold text-primary">{totalProviders}</div>
            <div className="text-sm text-muted-foreground">Providers Available</div>
          </div>
          
          <div className="text-center p-4 border rounded-lg">
            <div className={`text-2xl font-bold ${configuredCount > 0 ? 'text-green-600' : 'text-amber-600'}`}>
              {configuredCount > 0 ? '✓' : '!'}
            </div>
            <div className="text-sm text-muted-foreground">
              {configuredCount > 0 ? 'Ready to Generate' : 'Setup Required'}
            </div>
          </div>
        </div>

        {/* Provider Status */}
        <div className="space-y-3">
          <h4 className="font-medium">Provider Status</h4>
          {providers.map((provider) => {
            const hasApiKey = hasKey(provider.id);
            
            return (
              <div key={provider.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    {getProviderIcon(provider.provider_key)}
                  </div>
                  <div>
                    <div className="font-medium">{provider.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {provider.description}
                    </div>
                  </div>
                </div>
                
                <Badge variant={hasApiKey ? "default" : "secondary"}>
                  {hasApiKey ? (
                    <>
                      <CheckCircle className="w-3 h-3 mr-1" />
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
            );
          })}
        </div>

        {/* Status Messages */}
        {configuredCount === 0 ? (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>No API keys configured.</strong> Configure at least one AI provider to enable question generation.
              Go to AI Settings to add your API keys.
            </AlertDescription>
          </Alert>
        ) : (
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>AI providers configured!</strong> You can now generate questions using AI. 
              Your questions will be generated using your configured providers in priority order.
            </AlertDescription>
          </Alert>
        )}

        {/* Quick Actions */}
        <div className="flex gap-2 pt-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => window.location.hash = '#ai-settings'}
          >
            <Settings className="w-4 h-4 mr-2" />
            Manage API Keys
          </Button>
          
          {configuredCount > 0 && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => window.location.hash = '#ai-generator'}
            >
              <ArrowRight className="w-4 h-4 mr-2" />
              Generate Questions
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};