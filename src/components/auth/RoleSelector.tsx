import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Shield, 
  Users, 
  User,
  ChevronRight,
  Sparkles
} from 'lucide-react';

interface RoleSelectorProps {
  onRoleSelect: (role: 'admin' | 'parent' | 'student') => void;
}

export const RoleSelector = ({ onRoleSelect }: RoleSelectorProps) => {
  const roles = [
    {
      id: 'admin' as const,
      title: 'Administrator',
      description: 'Full system access and configuration',
      icon: Shield,
      features: [
        'Manage all users and roles',
        'Configure AI question generators',
        'System-wide analytics',
        'Content moderation'
      ],
      badge: 'Full Access',
      gradient: 'bg-gradient-primary'
    },
    {
      id: 'parent' as const,
      title: 'Parent/Teacher',
      description: 'Create and manage question papers',
      icon: Users,
      features: [
        'Upload pages',
        'Generate MCQ papers',
        'Set test schedules & time limits',
        'Review child results'
      ],
      badge: 'Creator',
      gradient: 'bg-gradient-success'
    },
    {
      id: 'student' as const,
      title: 'Student',
      description: 'Take tests and view results',
      icon: User,
      features: [
        'Attempt question papers',
        'Timed test sessions',
        'View approved results',
        'Track progress'
      ],
      badge: 'Student',
      gradient: 'bg-quiz'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-subtle flex items-center justify-center p-4">
      <div className="w-full max-w-4xl">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center mb-4">
            <div className="w-12 h-12 bg-gradient-primary rounded-xl flex items-center justify-center shadow-glow">
              <Sparkles className="w-6 h-6 text-primary-foreground" />
            </div>
          </div>
          <h1 className="text-4xl font-bold text-foreground mb-2">
            Welcome to mQuiz
          </h1>
          <p className="text-lg text-muted-foreground">
            Choose your role to get started with intelligent MCQ creation and testing
          </p>
        </div>

        {/* Role Cards */}
        <div className="grid md:grid-cols-3 gap-6">
          {roles.map((role) => (
            <Card 
              key={role.id} 
              className="relative overflow-hidden hover:shadow-elegant transition-all duration-300 cursor-pointer group"
              onClick={() => onRoleSelect(role.id)}
            >
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between mb-2">
                  <div className={`w-10 h-10 ${role.gradient} rounded-lg flex items-center justify-center`}>
                    <role.icon className="w-5 h-5 text-white" />
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    {role.badge}
                  </Badge>
                </div>
                <CardTitle className="text-xl">{role.title}</CardTitle>
                <CardDescription className="text-sm">
                  {role.description}
                </CardDescription>
              </CardHeader>
              
              <CardContent className="pt-0">
                <ul className="space-y-2 mb-6">
                  {role.features.map((feature, index) => (
                    <li key={index} className="flex items-center text-sm text-muted-foreground">
                      <ChevronRight className="w-3 h-3 mr-2 text-primary" />
                      {feature}
                    </li>
                  ))}
                </ul>
                
                <Button 
                  className="w-full group-hover:shadow-md transition-all duration-300"
                  variant={role.id === 'admin' ? 'default' : role.id === 'parent' ? 'default' : 'default'}
                >
                  Continue as {role.title}
                  <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Footer */}
        <div className="text-center mt-12">
          <p className="text-sm text-muted-foreground">
            Powered by AI • Secure • Real-time Collaboration
          </p>
        </div>
      </div>
    </div>
  );
};