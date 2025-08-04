import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { 
  Shield, 
  Users, 
  User,
  Info
} from 'lucide-react';

interface CompactRoleSelectorProps {
  selectedRole: 'admin' | 'parent' | 'child';
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
    features: [
      'Manage all users and roles',
      'Configure AI question generators',
      'System-wide analytics',
      'Content moderation'
    ]
  },
  parent: {
    title: 'Parent/Teacher',
    description: 'Create and manage question papers',
    icon: Users,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    note: 'Start creating content immediately',
    features: [
      'Upload course documents',
      'Generate MCQ papers',
      'Set test schedules & time limits',
      'Review child results'
    ]
  },
  child: {
    title: 'Student',
    description: 'Take tests and view results',
    icon: User,
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    note: 'Join tests assigned by teachers',
    features: [
      'Attempt question papers',
      'Timed test sessions',
      'View approved results',
      'Track progress'
    ]
  }
};

export const CompactRoleSelector = ({ selectedRole, onRoleSelect }: CompactRoleSelectorProps) => {
  return (
    <TooltipProvider>
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
        
        <Tabs value={selectedRole} onValueChange={(value) => onRoleSelect(value as any)}>
          <TabsList className="grid w-full grid-cols-3 h-auto">
            {Object.entries(roleInfo).map(([role, info]) => (
              <TabsTrigger 
                key={role} 
                value={role}
                className="flex flex-col items-center gap-1 py-3 px-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                <info.icon className="w-4 h-4" />
                <span className="text-xs font-medium">{info.title}</span>
              </TabsTrigger>
            ))}
          </TabsList>
          
          {Object.entries(roleInfo).map(([role, info]) => (
            <TabsContent key={role} value={role} className="mt-3">
              <div className={`p-3 rounded-lg border ${info.bgColor} ${info.borderColor}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <info.icon className={`w-4 h-4 ${info.color}`} />
                      <span className="font-medium text-sm">{info.title}</span>
                      {role === 'admin' && (
                        <Badge variant="secondary" className="text-xs">
                          Requires Approval
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mb-2">{info.description}</p>
                    <p className="text-xs text-muted-foreground italic">{info.note}</p>
                  </div>
                  
                  <Tooltip>
                    <TooltipTrigger>
                      <Info className="w-4 h-4 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent side="left" className="max-w-xs">
                      <div className="space-y-2">
                        <p className="font-medium text-xs">{info.title} Features:</p>
                        <ul className="space-y-1">
                          {info.features.map((feature, index) => (
                            <li key={index} className="text-xs">• {feature}</li>
                          ))}
                        </ul>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </div>
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </TooltipProvider>
  );
};