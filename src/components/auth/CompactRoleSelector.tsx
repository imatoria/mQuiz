import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { Shield, Users, User, Info } from 'lucide-react';
interface CompactRoleSelectorProps {
  selectedRole: 'admin' | 'teacher' | 'student' | null;
  onRoleSelect: (role: 'admin' | 'teacher' | 'student') => void;
}
const roleInfo = {
  admin: {
    title: 'Administrator',
    description: 'Full system access and configuration',
    icon: Shield,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200',
    note: 'Admin accounts require manual approval',
     features: ['Manage all users and roles', 'Configure AI question generators', 'System-wide analytics', 'Content moderation']
  },
  teacher: {
    title: 'Teacher',
    description: 'Create and manage question papers',
    icon: Users,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    note: 'Start creating content immediately',
    features: ['Upload pages', 'Generate MCQ papers', 'Set test schedules & time limits', 'Review student results']
  },
  student: {
    title: 'Student',
    description: 'Take tests and view results',
    icon: User,
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    note: 'Join tests assigned by teachers',
    features: ['Attempt question papers', 'Timed test sessions', 'View approved results', 'Track progress']
  }
};
export const CompactRoleSelector = ({
  selectedRole,
  onRoleSelect
}: CompactRoleSelectorProps) => {
  return <TooltipProvider>
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Select your role</span>
          <Tooltip>
            <TooltipTrigger>
              <Info className="w-4 h-4 text-muted-foreground" />
            </TooltipTrigger>
            <TooltipContent side="right" className="max-w-xs">
              <p className="text-xs">Choose the role that best describes how you'll use the platform.</p>
            </TooltipContent>
          </Tooltip>
        </div>
        
        <Tabs value={selectedRole || ''} onValueChange={value => onRoleSelect(value as any)}>
          <TabsList className="w-full h-auto">
            {Object.entries(roleInfo).map(([role, info]) => <TabsTrigger value={role} className="text-xs sm:text-sm flex flex-row gap-2">
              <Tooltip key={role}>
                <span className="text-xs font-medium">{info.title}</span>
                <TooltipTrigger>
                    <Info className="w-4 h-4 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-xs">
                  <div className="space-y-2">
                    <p className="font-medium text-xs">{info.description}</p>
                    <p className="text-xs italic">{info.note}</p>
                    <div className="space-y-1">
                      <p className="font-medium text-xs">Features:</p>
                      <ul className="space-y-1">
                        {info.features.map((feature, index) => <li key={index} className="text-xs">• {feature}</li>)}
                      </ul>
                    </div>
                    {role === 'admin' && <p className="text-xs text-warning">⚠️ Admin accounts require manual approval</p>}
                  </div>
                </TooltipContent>
              </Tooltip>
            </TabsTrigger>)}
          </TabsList>
        </Tabs>
      </div>
    </TooltipProvider>;
};