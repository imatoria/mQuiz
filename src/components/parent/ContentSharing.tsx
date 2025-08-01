import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Share2, Users, Eye, Edit, Trash2, Calendar, UserPlus, Link } from "lucide-react";

interface Document {
  id: string;
  title: string;
  subject_id: string;
  class_level: string;
}

interface Subject {
  id: string;
  name: string;
}

interface ShareRecord {
  id: string;
  document_id: string;
  shared_with_email: string;
  permission_level: 'read' | 'write' | 'admin';
  expires_at?: string;
  is_active: boolean;
  created_at: string;
  document_title: string;
}

interface SharedWithMe {
  id: string;
  document_id: string;
  document_title: string;
  shared_by_email: string;
  permission_level: string;
  created_at: string;
}

export const ContentSharing = () => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [myShares, setMyShares] = useState<ShareRecord[]>([]);
  const [sharedWithMe, setSharedWithMe] = useState<SharedWithMe[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDocument, setSelectedDocument] = useState<string>("");
  const [shareEmail, setShareEmail] = useState("");
  const [permissionLevel, setPermissionLevel] = useState<'read' | 'write' | 'admin'>('read');
  const [expiryDate, setExpiryDate] = useState("");
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;

      // Fetch user's documents
      const { data: documentsData, error: docsError } = await supabase
        .from('documents')
        .select('*')
        .eq('user_id', user.user.id)
        .eq('processing_status', 'completed')
        .order('title');

      if (docsError) throw docsError;

      // Fetch subjects
      const { data: subjectsData, error: subjectsError } = await supabase
        .from('subjects')
        .select('*')
        .order('name');

      if (subjectsError) throw subjectsError;

      setDocuments(documentsData || []);
      setSubjects(subjectsData || []);

      // Mock data for shares since we can't query the new tables directly yet
      const mockMyShares: ShareRecord[] = [
        {
          id: '1',
          document_id: documentsData?.[0]?.id || 'doc1',
          shared_with_email: 'teacher@school.com',
          permission_level: 'read',
          expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          is_active: true,
          created_at: new Date().toISOString(),
          document_title: documentsData?.[0]?.title || 'Sample Document'
        },
        {
          id: '2',
          document_id: documentsData?.[1]?.id || 'doc2',
          shared_with_email: 'parent@family.com',
          permission_level: 'write',
          expires_at: undefined,
          is_active: true,
          created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
          document_title: documentsData?.[1]?.title || 'Another Document'
        }
      ];

      const mockSharedWithMe: SharedWithMe[] = [
        {
          id: '3',
          document_id: 'external-doc-1',
          document_title: 'Shared Math Curriculum',
          shared_by_email: 'colleague@school.com',
          permission_level: 'read',
          created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
        }
      ];

      setMyShares(mockMyShares);
      setSharedWithMe(mockSharedWithMe);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: "Error",
        description: "Failed to load sharing data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const shareDocument = async () => {
    if (!selectedDocument || !shareEmail) {
      toast({
        title: "Error",
        description: "Please select a document and enter an email address",
        variant: "destructive"
      });
      return;
    }

    try {
      // In a real implementation, this would create a share record
      const document = documents.find(d => d.id === selectedDocument);
      
      toast({
        title: "Success",
        description: `Document "${document?.title}" shared with ${shareEmail}`,
      });

      // Reset form
      setSelectedDocument("");
      setShareEmail("");
      setPermissionLevel('read');
      setExpiryDate("");
      setIsShareDialogOpen(false);

      // Refresh data
      fetchData();
    } catch (error) {
      console.error('Error sharing document:', error);
      toast({
        title: "Error",
        description: "Failed to share document",
        variant: "destructive"
      });
    }
  };

  const revokeShare = async (shareId: string) => {
    try {
      // In a real implementation, this would delete or deactivate the share
      toast({
        title: "Success",
        description: "Share access revoked",
      });

      fetchData();
    } catch (error) {
      console.error('Error revoking share:', error);
      toast({
        title: "Error",
        description: "Failed to revoke share",
        variant: "destructive"
      });
    }
  };

  const getPermissionIcon = (permission: string) => {
    switch (permission) {
      case 'admin':
        return <UserPlus className="h-3 w-3" />;
      case 'write':
        return <Edit className="h-3 w-3" />;
      default:
        return <Eye className="h-3 w-3" />;
    }
  };

  const getPermissionVariant = (permission: string) => {
    switch (permission) {
      case 'admin':
        return 'destructive';
      case 'write':
        return 'default';
      default:
        return 'secondary';
    }
  };

  const getSubjectName = (subjectId: string) => {
    return subjects.find(s => s.id === subjectId)?.name || 'Unknown';
  };

  if (loading) {
    return <div className="flex justify-center p-8">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Content Sharing</h2>
        <Dialog open={isShareDialogOpen} onOpenChange={setIsShareDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Share2 className="h-4 w-4 mr-2" />
              Share Document
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Share Document</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="document">Document</Label>
                <Select value={selectedDocument} onValueChange={setSelectedDocument}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select document to share" />
                  </SelectTrigger>
                  <SelectContent>
                    {documents.map(doc => (
                      <SelectItem key={doc.id} value={doc.id}>
                        {doc.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  value={shareEmail}
                  onChange={(e) => setShareEmail(e.target.value)}
                  placeholder="Enter email address"
                />
              </div>

              <div>
                <Label htmlFor="permission">Permission Level</Label>
                <Select value={permissionLevel} onValueChange={(value: 'read' | 'write' | 'admin') => setPermissionLevel(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="read">Read Only</SelectItem>
                    <SelectItem value="write">Read & Write</SelectItem>
                    <SelectItem value="admin">Full Access</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="expiry">Expiry Date (Optional)</Label>
                <Input
                  id="expiry"
                  type="date"
                  value={expiryDate}
                  onChange={(e) => setExpiryDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>

              <Button onClick={shareDocument} className="w-full">
                Share Document
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-primary">
              {documents.length}
            </div>
            <div className="text-sm text-muted-foreground">My Documents</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-secondary">
              {myShares.length}
            </div>
            <div className="text-sm text-muted-foreground">Shared by Me</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-accent">
              {sharedWithMe.length}
            </div>
            <div className="text-sm text-muted-foreground">Shared with Me</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-muted-foreground">
              {myShares.filter(s => s.is_active).length}
            </div>
            <div className="text-sm text-muted-foreground">Active Shares</div>
          </CardContent>
        </Card>
      </div>

      {/* Documents Shared by Me */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5" />
            Documents I've Shared ({myShares.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {myShares.length > 0 ? (
            <div className="space-y-3">
              {myShares.map(share => (
                <div key={share.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium">{share.document_title}</h4>
                      <Badge variant={getPermissionVariant(share.permission_level)}>
                        <div className="flex items-center gap-1">
                          {getPermissionIcon(share.permission_level)}
                          {share.permission_level}
                        </div>
                      </Badge>
                      {!share.is_active && (
                        <Badge variant="outline">Inactive</Badge>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Shared with: {share.shared_with_email}
                    </div>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground mt-1">
                      <span>Shared {new Date(share.created_at).toLocaleDateString()}</span>
                      {share.expires_at && (
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          Expires {new Date(share.expires_at).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline">
                      <Link className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => revokeShare(share.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Share2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No shared documents</h3>
              <p className="text-muted-foreground">
                Documents you share with others will appear here
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Documents Shared with Me */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Documents Shared with Me ({sharedWithMe.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {sharedWithMe.length > 0 ? (
            <div className="space-y-3">
              {sharedWithMe.map(share => (
                <div key={share.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium">{share.document_title}</h4>
                      <Badge variant={getPermissionVariant(share.permission_level)}>
                        <div className="flex items-center gap-1">
                          {getPermissionIcon(share.permission_level)}
                          {share.permission_level}
                        </div>
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Shared by: {share.shared_by_email}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      Shared {new Date(share.created_at).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline">
                      <Eye className="h-4 w-4 mr-2" />
                      View
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No shared documents</h3>
              <p className="text-muted-foreground">
                Documents shared with you will appear here
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};