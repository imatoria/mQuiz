import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { NotificationCenter } from '@/components/notifications/NotificationCenter';
import { SidebarTrigger } from '@/components/ui/sidebar';
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
  currentRole: 'admin' | 'parent' | 'child' | null;
  onRoleChange: (role: 'admin' | 'parent' | 'child' | null) => void;
  activeTabName?: string;
  activeTabIcon?: LucideIcon;
}

export const Navigation = ({ currentRole, onRoleChange, activeTabName, activeTabIcon }: NavigationProps) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { profile, signOut } = useAuth();

  const roleConfig = {
    admin: {
      icon: Shield,
      label: 'Admin',
      color: 'bg-gradient-primary',
      features: ['All Access', 'User Management', 'AI Configuration']
    },
    parent: {
      icon: Users,
      label: 'Parent',
      color: 'bg-gradient-success',
      features: ['Create Papers', 'Upload Documents', 'View Results']
    },
    child: {
      icon: User,
      label: 'Child',
      color: 'bg-quiz',
      features: ['Take Tests', 'View Results', 'Study Mode']
    }
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-card border-b shadow-sm">
      <div className="flex justify-between items-center h-14 md:h-16">
        {/* Logo and Sidebar Trigger Container */}
        <div className="flex items-center justify-between pl-2 sm:pl-4 md:w-64 md:pl-4">
          {/* Mobile: Sidebar Trigger + Logo - max width container */}
          <div className="flex items-center gap-3 md:hidden max-w-16">
            <SidebarTrigger />
            <div className="flex items-center space-x-1">
              <div className="w-7 h-7 bg-gradient-primary rounded-lg flex items-center justify-center">
                <BookOpen className="w-4 h-4 text-primary-foreground" />
              </div>
              <span className="text-lg font-bold text-foreground">mQuiz</span>
            </div>
          </div>
          
          {/* Desktop/Tablet: Logo + Sidebar Trigger */}
          <div className="hidden md:flex items-center space-x-1 md:space-x-2">
            <div className="w-7 h-7 md:w-8 md:h-8 bg-gradient-primary rounded-lg flex items-center justify-center">
              <BookOpen className="w-4 h-4 md:w-5 md:h-5 text-primary-foreground" />
            </div>
            <span className="text-lg md:text-xl font-bold text-foreground">mQuiz</span>
          </div>
          
          {/* Sidebar Trigger - Desktop/Tablet only */}
          <div className="hidden md:block">
            <SidebarTrigger />
          </div>
        </div>

        {/* Active Tab Name */}
        {activeTabName && activeTabIcon && (
          <div className="flex items-center space-x-2 flex-1 justify-center">
            {React.createElement(activeTabIcon, { className: "w-4 h-4 md:w-5 md:h-5 text-muted-foreground" })}
            <span className="text-sm md:text-lg font-medium text-foreground">{activeTabName}</span>
          </div>
        )}

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center space-x-4 pr-4 sm:pr-6 lg:pr-4">
          <NotificationCenter />
          
          {profile && (
            <div className="flex items-center space-x-2">
              <span className="text-sm text-muted-foreground">
                {profile.full_name || profile.email}
              </span>
              {currentRole && (
                <Badge variant="secondary" className="text-xs">
                  {roleConfig[currentRole].label}
                </Badge>
              )}
            </div>
          )}
          
          <Button
            variant="outline"
            size="sm"
            onClick={signOut}
          >
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </Button>
        </div>

        {/* Mobile menu button */}
        <div className="md:hidden">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </Button>
        </div>
      </div>

      {/* Mobile Navigation */}
      {isMenuOpen && (
        <div className="flex justify-between items-center md:hidden py-2 border-t px-4">
          <NotificationCenter />
          
          {profile && (
            <div className="flex items-center space-x-2">
              <span className="text-sm text-muted-foreground">
                {profile.full_name || profile.email}
              </span>
              {currentRole && (
                <Badge variant="secondary" className="text-xs">
                  {roleConfig[currentRole].label}
                </Badge>
              )}
            </div>
          )}
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              signOut();
              setIsMenuOpen(false);
            }}
          >
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </Button>
        </div>
      )}
    </nav>
  );
};