import React from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Menu } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';

interface MobileDrawerProps {
  content?: React.ReactNode;
  title?: string;
  trigger?: React.ReactNode;
}

export const MobileDrawer = ({ content, title = "Menu", trigger }: MobileDrawerProps) => {
  const isMobile = useIsMobile();

  if (!isMobile) {
    return <>{content}</>;
  }

  return (
    <Sheet>
      <SheetTrigger asSlot>
        {trigger || (
          <Button variant="ghost" size="sm" className="md:hidden">
            <Menu className="w-5 h-5" />
          </Button>
        )}
      </SheetTrigger>
      <SheetContent side="left" className="w-80">
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
        </SheetHeader>
        <div className="mt-6">
          {content}
        </div>
      </SheetContent>
    </Sheet>
  );
};