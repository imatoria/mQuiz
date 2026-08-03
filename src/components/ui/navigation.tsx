import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { NotificationCenter } from '@/components/notifications/NotificationCenter';
import { SidebarTrigger } from '@/components/ui/sidebar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  User, 
  Users, 
  Shield, 
  BookOpen, 
  FileText, 
  Clock, 
  Trophy,
  Menu,
  X,
  LogOut,
  LucideIcon
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

interface NavigationProps {
  currentRole: 'admin' | 'teacher' | 'student' | null;
  onRoleChange?: (role: 'admin' | 'teacher' | 'student' | null) => void;
  activeTabName?: string;
  activeTabIcon?: LucideIcon;
}

export const Navigation = ({ currentRole, onRoleChange, activeTabName, activeTabIcon }: NavigationProps) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { profile, signOut } = useAuth();

  const getUserInitial = () => {
    if (profile?.full_name) {
      return profile.full_name.charAt(0).toUpperCase();
    }
    if (profile?.email) {
      return profile.email.charAt(0).toUpperCase();
    }
    return 'U';
  };



  const roleConfig: Record<string, { icon: any; label: string; color: string; features: string[] }> = {
    admin: {
      icon: Shield,
      label: 'Admin',
      color: 'bg-gradient-primary',
      features: ['All Access', 'User Management', 'AI Configuration']
    },
    teacher: {
      icon: Users,
      label: 'Teacher',
      color: 'bg-gradient-success',
      features: ['Create Papers', 'Upload Documents', 'View Results']
    },
    student: {
      icon: User,
      label: 'Student',
      color: 'bg-quiz',
      features: ['Take Tests', 'View Results', 'Study Mode']
    }
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/70 dark:bg-black/70 backdrop-blur-lg border-b border-white/20 dark:border-white/10 shadow-sm transition-all duration-300">
      <div className="flex justify-between items-center h-14 md:h-16">
        {/* Logo and Sidebar Trigger Container */}
        <div className="flex items-center justify-between pl-2 sm:pl-4 md:w-64 md:pl-4">
          {/* Sidebar Trigger + Logo - max width container */}
          <div className="flex items-center gap-3 max-w-16">
            <SidebarTrigger />
            <div className="flex items-center space-x-1">
              <div className="w-7 h-7 bg-gradient-primary rounded-lg flex items-center justify-center">
                <BookOpen className="w-4 h-4 text-primary-foreground" />
              </div>
              <span className="text-lg font-bold text-foreground">mQuiz</span>
            </div>
          </div>
        </div>

        {/* Active Tab Name - Desktop Only */}
        {activeTabName && activeTabIcon && (
          <div className="hidden md:flex items-center space-x-2 flex-1 justify-center">
            {React.createElement(activeTabIcon, { className: "w-4 h-4 md:w-5 md:h-5 text-muted-foreground" })}
            <span className="text-sm md:text-lg font-medium text-foreground">{activeTabName}</span>
          </div>
        )}

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center space-x-4 pr-4 sm:pr-6 lg:pr-4">
          <NotificationCenter />
          
          {profile && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="w-8 h-8 rounded-full p-0">
                  <span className="text-sm font-semibold">{getUserInitial()}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">
                      {profile.full_name || profile.email}
                    </p>
                    {currentRole && roleConfig[currentRole] && (
                      <Badge variant="secondary" className="text-xs w-fit">
                        {roleConfig[currentRole].label}
                      </Badge>
                    )}
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={signOut} className="text-destructive cursor-pointer">
                  <LogOut className="w-4 h-4 mr-2" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {/* Mobile Navigation */}
        <div className="md:hidden flex items-center space-x-4 pr-4">
          <NotificationCenter />
          
          {profile && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="w-8 h-8 rounded-full p-0">
                  <span className="text-sm font-semibold">{getUserInitial()}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">
                      {profile.full_name || profile.email}
                    </p>
                    {currentRole && (
                      <Badge variant="secondary" className="text-xs w-fit">
                        {roleConfig[currentRole].label}
                      </Badge>
                    )}
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={signOut} className="text-destructive cursor-pointer">
                  <LogOut className="w-4 h-4 mr-2" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

    </nav>
  );
};