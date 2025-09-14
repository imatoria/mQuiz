import React, { useState } from 'react';
import { AuthPage } from '@/components/auth/AuthPage';
import { Navigation } from '@/components/ui/navigation';
import { Dashboard } from '@/pages/Dashboard';
import { useAuth } from '@/hooks/useAuth';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Clock, LucideIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { SidebarProvider } from '@/components/ui/sidebar';
import heroBanner from '@/assets/hero-banner.jpg';

const Index = () => {
  const { loading, isAuthenticated, profile, canAccess, signOut } = useAuth();
  const [activeTabName, setActiveTabName] = useState<string>('');
  const [activeTabIcon, setActiveTabIcon] = useState<LucideIcon | null>(null);
  const [hideNavigation, setHideNavigation] = useState(false);

  const handleActiveTabChange = React.useCallback((tabName: string, tabIcon: LucideIcon) => {
    setActiveTabName(tabName);
    setActiveTabIcon(tabIcon);
  }, []);

  const handleNavigationVisibility = React.useCallback((hidden: boolean) => {
    setHideNavigation(hidden);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-subtle flex items-center justify-center">
        <Card className="w-96">
          <CardContent className="pt-6 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div 
        className="min-h-screen bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${heroBanner})` }}
      >
        <div className="min-h-screen bg-black/20 backdrop-blur-[1px]">
          <AuthPage onAuthSuccess={() => window.location.reload()} />
        </div>
      </div>
    );
  }

  if (profile && profile.role === 'admin' && !profile.is_approved) {
    return (
      <div className="min-h-screen bg-gradient-subtle flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center space-y-4">
            <div className="w-12 h-12 bg-warning/10 rounded-xl flex items-center justify-center mx-auto">
              <Clock className="w-6 h-6 text-warning" />
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-2">Pending Approval</h3>
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Your admin account is pending approval. Please contact the system administrator.
                </AlertDescription>
              </Alert>
            </div>
            <button 
              onClick={signOut}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Sign out
            </button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!canAccess) {
    return (
      <div className="min-h-screen bg-gradient-subtle flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Access denied. Please contact support.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Don't render if profile isn't loaded yet
  if (!profile?.role) {
    return (
      <div className="min-h-screen bg-gradient-subtle flex items-center justify-center">
        <Card className="w-96">
          <CardContent className="pt-6 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading profile...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen bg-background w-full">
        <Navigation 
          currentRole={profile.role} 
          onRoleChange={() => signOut()} 
          activeTabName={activeTabName}
          activeTabIcon={activeTabIcon}
          hidden={hideNavigation}
        />
        <Dashboard role={profile.role} onActiveTabChange={handleActiveTabChange} onNavigationVisibilityChange={handleNavigationVisibility} />
      </div>
    </SidebarProvider>
  );
};

export default Index;
