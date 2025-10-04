import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ChildClassAssignment } from './ChildClassAssignment';
import { ChildSubjectAssignment } from './ChildSubjectAssignment';
import { GraduationCap, BookOpen } from 'lucide-react';

interface ChildAcademicProfileProps {
  isOpen: boolean;
  onClose: () => void;
  childId: string;
  childName: string;
}

export const ChildAcademicProfile = ({ 
  isOpen, 
  onClose, 
  childId, 
  childName 
}: ChildAcademicProfileProps) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">
            Academic Profile - {childName}
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="class" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="class" className="flex items-center gap-2">
              <GraduationCap className="h-4 w-4" />
              Class Level
            </TabsTrigger>
            <TabsTrigger value="subjects" className="flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              Subjects
            </TabsTrigger>
          </TabsList>

          <TabsContent value="class" className="space-y-4">
            <ChildClassAssignment 
              childId={childId} 
              childName={childName} 
            />
          </TabsContent>

          <TabsContent value="subjects" className="space-y-4">
            <ChildSubjectAssignment 
              childId={childId} 
              childName={childName} 
            />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};