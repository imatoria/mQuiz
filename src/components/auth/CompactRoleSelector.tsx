import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { Shield, Users, User, Info } from 'lucide-react';
interface CompactRoleSelectorProps {
  selectedRole: 'admin' | 'parent' | 'child' | null;
  onRoleSelect: (role: 'admin' | 'parent' | 'child') => void;
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
  parent: {
    title: 'Parent/Teacher',
    description: 'Create and manage question papers',
    icon: Users,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    note: 'Start creating content immediately',
    features: ['Upload course documents', 'Generate MCQ papers', 'Set test schedules & time limits', 'Review child results']
  },
  child: {
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
          <TabsList className="grid w-full grid-cols-3 h-auto">
            {Object.entries(roleInfo).map(([role, info]) => <Tooltip key={role}>
                <TooltipTrigger asChild>
                  <TabsTrigger value={role} className="px-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground py-[8px]">
                    <span className="text-xs font-medium">{info.title}</span>
                  </TabsTrigger>
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
              </Tooltip>)}
          </TabsList>
          
          {Object.entries(roleInfo).map(([role, info]) => <TabsContent key={role} value={role} className="mt-3">
              
            </TabsContent>)}
        </Tabs>
      </div>
    </TooltipProvider>;
};