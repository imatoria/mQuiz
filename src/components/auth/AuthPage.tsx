import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { CompactRoleSelector } from './CompactRoleSelector';
import { supabase } from '@/integrations/supabase/client';
import { Shield, Users, User, Mail, Lock, Eye, EyeOff, AlertCircle, CheckCircle, ArrowRight } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
interface AuthPageProps {
  onAuthSuccess: () => void;
}
type UserRole = 'admin' | 'parent' | 'child';

export const AuthPage = ({
  onAuthSuccess
}: AuthPageProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [selectedRole, setSelectedRole] = useState<UserRole | null>('child');
  const [authMode, setAuthMode] = useState<'signin' | 'signup' | 'reset'>('signin');
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    fullName: '',
    confirmPassword: ''
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const {
    toast
  } = useToast();
  useEffect(() => {
    // Check if user is already authenticated
    supabase.auth.getSession().then(({
      data: {
        session
      }
    }) => {
      if (session) {
        onAuthSuccess();
      }
    });

    // Listen for auth changes
    const {
      data: {
        subscription
      }
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        onAuthSuccess();
      }
    });
    return () => subscription.unsubscribe();
  }, [onAuthSuccess]);
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
    setError('');
  };
  const validateForm = () => {
    if (!formData.email.trim()) {
      setError('Email is required');
      return false;
    }
    if (authMode !== 'reset' && !formData.password.trim()) {
      setError('Password is required');
      return false;
    }
    if (authMode === 'signup') {
      if (!selectedRole) {
        setError('Please select a role');
        return false;
      }
      if (!formData.fullName.trim()) {
        setError('Full name is required');
        return false;
      }
      if (formData.password !== formData.confirmPassword) {
        setError('Passwords do not match');
        return false;
      }
      if (formData.password.length < 6) {
        setError('Password must be at least 6 characters');
        return false;
      }
    }
    return true;
  };
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    setIsLoading(true);
    setError('');
    setSuccess('');
    try {
      if (authMode === 'signin') {
        const {
          data,
          error
        } = await supabase.auth.signInWithPassword({
          email: formData.email,
          password: formData.password
        });
        if (error) throw error;
        toast({
          title: "Sign in successful",
          description: "Welcome back!"
        });
      } else if (authMode === 'signup') {
        const redirectUrl = `${window.location.origin}/`;
        const {
          error
        } = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password,
          options: {
            emailRedirectTo: redirectUrl,
            data: {
              full_name: formData.fullName,
              role: selectedRole
            }
          }
        });
        if (error) throw error;
        if (selectedRole === 'admin') {
          setSuccess('Account created! Admin accounts require manual approval. Please contact the administrator.');
        } else {
          setSuccess('Account created successfully! Please check your email to verify your account.');
        }
      } else if (authMode === 'reset') {
        const {
          error
        } = await supabase.auth.resetPasswordForEmail(formData.email, {
          redirectTo: `${window.location.origin}/auth/reset-password`
        });
        if (error) throw error;
        setSuccess('Password reset email sent! Please check your inbox.');
      }
    } catch (error: any) {
      setError(error.message || 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };
  const handleOAuthSignIn = async (provider: 'google') => {
    setIsLoading(true);
    setError('');
    try {
      const {
        error
      } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/`,
          queryParams: {
            role: selectedRole || 'child'
          }
        }
      });
      if (error) throw error;
    } catch (error: any) {
      setError(error.message || 'OAuth sign in failed');
    } finally {
      setIsLoading(false);
    }
  };
  const RoleSelector = () => <div className="space-y-2">
      
      <CompactRoleSelector selectedRole={selectedRole} onRoleSelect={setSelectedRole} />
    </div>;
  return <TooltipProvider>
      <div className="min-h-screen bg-gradient-subtle flex items-center justify-center p-3 sm:p-4">
        <div className="w-full max-w-sm sm:max-w-md">
        <Card className="shadow-elegant mx-auto">
          <CardHeader className="text-center pb-4 px-4 sm:px-6">
            <div className="mx-auto w-10 h-10 sm:w-12 sm:h-12 bg-gradient-primary rounded-xl flex items-center justify-center mb-3 sm:mb-4">
              <Lock className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
            <CardTitle className="text-xl sm:text-2xl">Welcome to mQuiz</CardTitle>
            <CardDescription>
              {authMode === 'signin' && 'Sign in to your account'}
              {authMode === 'signup' && 'Create your account'}
              {authMode === 'reset' && 'Reset your password'}
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-4 px-4 sm:px-6">
            <Tabs value={authMode} onValueChange={value => setAuthMode(value as any)}>
              <TabsList className="w-full">
                <TabsTrigger value="signin" className="text-xs sm:text-sm">Sign In</TabsTrigger>
                <TabsTrigger value="signup" className="text-xs sm:text-sm">Sign Up</TabsTrigger>
                <TabsTrigger value="reset" className="text-xs sm:text-sm">Reset</TabsTrigger>
              </TabsList>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                {authMode === 'signup' && <RoleSelector />}
                
                {authMode === 'signup' && <div className="space-y-2">
                    <Label htmlFor="fullName">Full Name</Label>
                    <Input id="fullName" name="fullName" value={formData.fullName} onChange={handleInputChange} placeholder="Enter your full name" disabled={isLoading} />
                  </div>}
                
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                    <Input 
                      id="email" 
                      name="email" 
                      type="email" 
                      value={formData.email} 
                      onChange={handleInputChange} 
                      placeholder="Enter your email" 
                      className="pl-10 text-sm sm:text-base" 
                      disabled={isLoading} 
                    />
                  </div>
                </div>
                
                {authMode !== 'reset' && <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                      <Input 
                        id="password" 
                        name="password" 
                        type={showPassword ? 'text' : 'password'} 
                        value={formData.password} 
                        onChange={handleInputChange} 
                        placeholder="Enter your password" 
                        className="pl-10 pr-10 text-sm sm:text-base" 
                        disabled={isLoading} 
                      />
                      <Button type="button" variant="ghost" size="sm" className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0" onClick={() => setShowPassword(!showPassword)}>
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </Button>
                    </div>
                  </div>}
                
                {authMode === 'signup' && <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirm Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                      <Input id="confirmPassword" name="confirmPassword" type={showPassword ? 'text' : 'password'} value={formData.confirmPassword} onChange={handleInputChange} placeholder="Confirm your password" className="pl-10" disabled={isLoading} />
                    </div>
                  </div>}
                
                {error && <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>}
                
                {success && <Alert>
                    <CheckCircle className="h-4 w-4" />
                    <AlertDescription>{success}</AlertDescription>
                  </Alert>}
                
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? 'Processing...' : <>
                      {authMode === 'signin' && 'Sign In'}
                      {authMode === 'signup' && 'Create Account'}
                      {authMode === 'reset' && 'Send Reset Email'}
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </>}
                </Button>
              </form>
              
              {authMode !== 'reset' && <>
                  <div className="relative my-4">
                    <Separator />
                    <span className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-background px-2 text-xs text-muted-foreground">
                      or continue with
                    </span>
                  </div>
                  
                  <Button type="button" variant="outline" className="w-full" onClick={() => handleOAuthSignIn('google')} disabled={isLoading}>
                    <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                    </svg>
                    Continue with Google
                  </Button>
                </>}
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
    </TooltipProvider>;
};