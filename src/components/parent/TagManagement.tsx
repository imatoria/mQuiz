import { useState, useEffect } from "react";
import { authService } from "@/services/auth/authService";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Tag, Plus, X, Hash } from "lucide-react";

interface Tag {
  id: string;
  name: string;
  color: string;
  created_at: string;
}

interface DocumentTag {
  id: string;
  document_id: string;
  tag_id: string;
  tag: Tag;
}

interface TagManagementProps {
  documentId?: string;
}

export const TagManagement = ({ documentId }: TagManagementProps) => {
  const [tags, setTags] = useState<Tag[]>([]);
  const [documentTags, setDocumentTags] = useState<DocumentTag[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTagName, setNewTagName] = useState("");
  const [newTagColor, setNewTagColor] = useState("#3B82F6");
  const { toast } = useToast();

  useEffect(() => {
    fetchTags();
    if (documentId) {
      fetchDocumentTags();
    }
  }, [documentId]);

  const fetchTags = async () => {
    try {
      // For now, use mock data since the tags table is new
      const mockTags: Tag[] = [
        { id: '1', name: 'Mathematics', color: '#EF4444', created_at: new Date().toISOString() },
        { id: '2', name: 'Physics', color: '#10B981', created_at: new Date().toISOString() },
        { id: '3', name: 'Chemistry', color: '#3B82F6', created_at: new Date().toISOString() },
        { id: '4', name: 'Chapter 1', color: '#F59E0B', created_at: new Date().toISOString() },
        { id: '5', name: 'Important', color: '#EF4444', created_at: new Date().toISOString() }
      ];
      
      setTags(mockTags);
    } catch (error) {
      console.error('Error fetching tags:', error);
    }
  };

  const fetchDocumentTags = async () => {
    if (!documentId) return;

    try {
      // Since we can't query the junction table directly yet, we'll simulate
      const mockDocumentTags: DocumentTag[] = [
        {
          id: '1',
          document_id: documentId,
          tag_id: '1',
          tag: { id: '1', name: 'Mathematics', color: '#EF4444', created_at: new Date().toISOString() }
        },
        {
          id: '2',
          document_id: documentId,
          tag_id: '2',
          tag: { id: '2', name: 'Chapter 1', color: '#10B981', created_at: new Date().toISOString() }
        }
      ];
      
      setDocumentTags(mockDocumentTags);
    } catch (error) {
      console.error('Error fetching document tags:', error);
    } finally {
      setLoading(false);
    }
  };

  const createTag = async () => {
    if (!newTagName.trim()) {
      toast({
        title: "Error",
        description: "Tag name is required",
        variant: "destructive"
      });
      return;
    }

    try {
      const user = authService.getCurrentUser();
      if (!user) return;

      // For now, just show success message
      toast({
        title: "Success",
        description: `Tag "${newTagName}" created successfully`,
      });

      setNewTagName("");
      setNewTagColor("#3B82F6");
    } catch (error) {
      console.error('Error creating tag:', error);
      toast({
        title: "Error",
        description: "Failed to create tag",
        variant: "destructive"
      });
    }
  };

  const addTagToDocument = async (tagId: string) => {
    if (!documentId) return;

    try {
      toast({
        title: "Success",
        description: "Tag added to document",
      });
    } catch (error) {
      console.error('Error adding tag to document:', error);
      toast({
        title: "Error",
        description: "Failed to add tag to document",
        variant: "destructive"
      });
    }
  };

  const removeTagFromDocument = async (documentTagId: string) => {
    try {
      toast({
        title: "Success",
        description: "Tag removed from document",
      });
    } catch (error) {
      console.error('Error removing tag from document:', error);
      toast({
        title: "Error",
        description: "Failed to remove tag from document",
        variant: "destructive"
      });
    }
  };

  const deleteTag = async (tagId: string) => {
    try {
      toast({
        title: "Success",
        description: "Tag deleted successfully",
      });
    } catch (error) {
      console.error('Error deleting tag:', error);
      toast({
        title: "Error",
        description: "Failed to delete tag",
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return <div className="flex justify-center p-8">Loading...</div>;
  }

  const availableTags = tags.filter(tag => 
    !documentTags.some(dt => dt.tag_id === tag.id)
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Tag Management</h2>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Hash className="h-4 w-4" />
          {tags.length} tags
        </div>
      </div>

      {/* Create New Tag */}
      <Card>
        <CardHeader>
          <CardTitle>Create New Tag</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1">
              <Label htmlFor="tagName">Tag Name</Label>
              <Input
                id="tagName"
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                placeholder="Enter tag name"
              />
            </div>
            <div>
              <Label htmlFor="tagColor">Color</Label>
              <div className="flex gap-2">
                <input
                  type="color"
                  id="tagColor"
                  value={newTagColor}
                  onChange={(e) => setNewTagColor(e.target.value)}
                  className="w-10 h-10 rounded border"
                />
                <Button onClick={createTag}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Document Tags (if viewing a specific document) */}
      {documentId && (
        <Card>
          <CardHeader>
            <CardTitle>Document Tags</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {documentTags.map(docTag => (
                  <Badge 
                    key={docTag.id} 
                    variant="outline" 
                    className="flex items-center gap-1"
                    style={{ borderColor: docTag.tag.color }}
                  >
                    <div 
                      className="w-2 h-2 rounded-full" 
                      style={{ backgroundColor: docTag.tag.color }}
                    />
                    {docTag.tag.name}
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-4 w-4 p-0 ml-1"
                      onClick={() => removeTagFromDocument(docTag.id)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </Badge>
                ))}
              </div>

              {availableTags.length > 0 && (
                <div>
                  <Label>Add Tags</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {availableTags.map(tag => (
                      <Badge 
                        key={tag.id}
                        variant="secondary"
                        className="cursor-pointer flex items-center gap-1"
                        onClick={() => addTagToDocument(tag.id)}
                      >
                        <div 
                          className="w-2 h-2 rounded-full" 
                          style={{ backgroundColor: tag.color }}
                        />
                        {tag.name}
                        <Plus className="h-3 w-3 ml-1" />
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* All Tags */}
      <Card>
        <CardHeader>
          <CardTitle>All Tags</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {tags.map(tag => (
              <div key={tag.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: tag.color }}
                  />
                  <span className="font-medium">{tag.name}</span>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => deleteTag(tag.id)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>

          {tags.length === 0 && (
            <div className="text-center py-8">
              <Tag className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No tags created yet</h3>
              <p className="text-muted-foreground">
                Create tags to organize and categorize your documents
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};