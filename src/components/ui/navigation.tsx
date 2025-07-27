import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  User, 
  Users, 
  Shield, 
  BookOpen, 
  FileText, 
  Clock, 
  Trophy,
  Menu,
  X
} from 'lucide-react';

interface NavigationProps {
  currentRole: 'admin' | 'parent' | 'child' | null;
  onRoleChange: (role: 'admin' | 'parent' | 'child' | null) => void;
}

export const Navigation = ({ currentRole, onRoleChange }: NavigationProps) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

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
    <nav className="bg-card border-b shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-primary rounded-lg flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold text-foreground">QuizMaster</span>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-4">
            {currentRole && (
              <div className="flex items-center space-x-2">
                {React.createElement(roleConfig[currentRole].icon, {
                  className: "w-4 h-4"
                })}
                <span className="text-sm font-medium">
                  {roleConfig[currentRole].label}
                </span>
                <Badge variant="secondary" className="text-xs">
                  Active
                </Badge>
              </div>
            )}
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => onRoleChange(null)}
            >
              Switch Role
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
          <div className="md:hidden py-4 border-t">
            {currentRole && (
              <div className="flex items-center space-x-2 mb-4">
                {React.createElement(roleConfig[currentRole].icon, {
                  className: "w-4 h-4"
                })}
                <span className="text-sm font-medium">
                  {roleConfig[currentRole].label}
                </span>
                <Badge variant="secondary" className="text-xs">
                  Active
                </Badge>
              </div>
            )}
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                onRoleChange(null);
                setIsMenuOpen(false);
              }}
              className="w-full"
            >
              Switch Role
            </Button>
          </div>
        )}
      </div>
    </nav>
  );
};