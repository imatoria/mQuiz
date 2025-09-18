import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { X, Edit2, Eye } from 'lucide-react';

interface MarkdownViewerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  content?: string;
  title?: string;
  readOnly?: boolean;
}

export const MarkdownViewerModal: React.FC<MarkdownViewerModalProps> = ({
  open,
  onOpenChange,
  content = '',
  title,
  readOnly = true
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(content);

  React.useEffect(() => {
    setEditedContent(content);
    setIsEditing(false);
  }, [content, open]);

  const handleSave = () => {
    // In the future, this could save back to database
    setIsEditing(false);
  };

  const formatMarkdown = (text: string) => {
    // Simple markdown rendering - you might want to use a proper markdown library
    return text
      .replace(/\n\n/g, '<br/><br/>')
      .replace(/\n/g, '<br/>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/^# (.*$)/gm, '<h1>$1</h1>')
      .replace(/^## (.*$)/gm, '<h2>$1</h2>')
      .replace(/^### (.*$)/gm, '<h3>$1</h3>');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent hideClose className="max-w-[95vw] w-[95vw] h-[90vh] p-0 bg-background">
        <DialogHeader className="border-b px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <DialogTitle className="truncate">{title || 'Document Content'}</DialogTitle>
            <div className="flex items-center gap-2">
              {!readOnly && (
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => isEditing ? handleSave() : setIsEditing(true)}
                  aria-label={isEditing ? "Save" : "Edit"}
                >
                  {isEditing ? <Eye className="h-4 w-4" /> : <Edit2 className="h-4 w-4" />}
                </Button>
              )}
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => onOpenChange(false)}
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="h-[calc(90vh-56px)]">
          <ScrollArea className="h-full">
            <div className="p-6">
              {isEditing ? (
                <Textarea
                  value={editedContent}
                  onChange={(e) => setEditedContent(e.target.value)}
                  className="min-h-[70vh] font-mono text-sm"
                  placeholder="Enter markdown content..."
                />
              ) : (
                <div 
                  className="prose prose-sm max-w-none"
                  dangerouslySetInnerHTML={{ __html: formatMarkdown(content) }}
                />
              )}
            </div>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default MarkdownViewerModal;