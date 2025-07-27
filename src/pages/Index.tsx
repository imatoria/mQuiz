import React, { useState } from 'react';
import { RoleSelector } from '@/components/auth/RoleSelector';
import { Navigation } from '@/components/ui/navigation';
import { Dashboard } from '@/pages/Dashboard';
import heroBanner from '@/assets/hero-banner.jpg';

const Index = () => {
  const [currentRole, setCurrentRole] = useState<'admin' | 'parent' | 'child' | null>(null);

  const handleRoleSelect = (role: 'admin' | 'parent' | 'child') => {
    setCurrentRole(role);
  };

  const handleRoleChange = (role: 'admin' | 'parent' | 'child' | null) => {
    setCurrentRole(role);
  };

  if (!currentRole) {
    return (
      <div 
        className="min-h-screen bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${heroBanner})` }}
      >
        <div className="min-h-screen bg-black/20 backdrop-blur-[1px]">
          <RoleSelector onRoleSelect={handleRoleSelect} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation currentRole={currentRole} onRoleChange={handleRoleChange} />
      <Dashboard role={currentRole} />
    </div>
  );
};

export default Index;
