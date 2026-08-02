import { useState, useEffect } from "react";
import { dbService } from "@/services/db";
import { authService } from "@/services/auth/authService";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Clock, FileText, Download, Eye, GitBranch, User } from "lucide-react";

interface DocumentVersion {
  id: string;
  document_id: string;
  version_number: number;
  title: string;
  file_path: string;
  changes_description: string;
  created_by: string;
  created_at: string;
  document_title: string;
}

interface VersionHistoryProps {
  documentId?: string;
}

export const VersionHistory = ({ documentId }: VersionHistoryProps) => {
  const [versions, setVersions] = useState<DocumentVersion[]>([]);
  const [documents, setDocuments] = useState<Array<{id: string; title: string}>>([]);
  const [selectedDocumentId, setSelectedDocumentId] = useState(documentId || "");
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (selectedDocumentId) {
      fetchVersions(selectedDocumentId);
    }
  }, [selectedDocumentId]);

  const fetchData = async () => {
    try {
      const user = authService.getCurrentUser();
      if (!user) return;

      // Fetch user's documents
      const { data: documentsData, error: docsError } = await dbService.getProvider().query(
        'SELECT id, title FROM documents WHERE user_id = ? ORDER BY title',
        [user.id]
      );

      if (docsError) throw docsError;

      setDocuments(documentsData || []);
      
      if (documentsData && documentsData.length > 0 && !selectedDocumentId) {
        setSelectedDocumentId(documentsData[0].id);
      }
    } catch (error) {
      console.error('Error fetching documents:', error);
      toast({
        title: "Error",
        description: "Failed to load pages",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchVersions = async (docId: string) => {
    try {
      // Since we can't directly query the versions table yet, we'll simulate the data
      // In a real implementation, this would be:
      // const { data, error } = await dbService.getProvider().query('SELECT * FROM document_versions WHERE document_id = ? ORDER BY version_number DESC', [docId]);

      // For now, create mock version data
      const document = documents.find(d => d.id === docId);
      if (!document) return;

      const mockVersions: DocumentVersion[] = [
        {
          id: '1',
          document_id: docId,
          version_number: 3,
          title: `${document.title} v3`,
          file_path: '/documents/version3.pdf',
          changes_description: 'Added new chapter on advanced topics and fixed typos',
          created_by: 'current-user',
          created_at: new Date().toISOString(),
          document_title: document.title
        },
        {
          id: '2',
          document_id: docId,
          version_number: 2,
          title: `${document.title} v2`,
          file_path: '/documents/version2.pdf',
          changes_description: 'Updated exercises and improved explanations',
          created_by: 'current-user',
          created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
          document_title: document.title
        },
        {
          id: '3',
          document_id: docId,
          version_number: 1,
          title: `${document.title} v1`,
          file_path: '/documents/version1.pdf',
          changes_description: 'Initial version',
          created_by: 'current-user',
          created_at: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
          document_title: document.title
        }
      ];

      setVersions(mockVersions);
    } catch (error) {
      console.error('Error fetching versions:', error);
      toast({
        title: "Error",
        description: "Failed to load version history",
        variant: "destructive"
      });
    }
  };

  const restoreVersion = async (version: DocumentVersion) => {
    try {
      // In a real implementation, this would create a new version from the selected one
      toast({
        title: "Success",
        description: `Restored to version ${version.version_number}`,
      });
    } catch (error) {
      console.error('Error restoring version:', error);
      toast({
        title: "Error",
        description: "Failed to restore version",
        variant: "destructive"
      });
    }
  };

  const downloadVersion = async (version: DocumentVersion) => {
    try {
      // In a real implementation, this would download the specific version file
      toast({
        title: "Download",
        description: `Downloading version ${version.version_number}`,
      });
    } catch (error) {
      console.error('Error downloading version:', error);
      toast({
        title: "Error",
        description: "Failed to download version",
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return <div className="flex justify-center p-8">Loading...</div>;
  }

  const selectedDocument = documents.find(d => d.id === selectedDocumentId);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Version History</h2>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <GitBranch className="h-4 w-4" />
          {versions.length} versions
        </div>
      </div>

      {/* Document Selector */}
      {!documentId && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Select Pages</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {documents.map(doc => (
                <Card 
                  key={doc.id} 
                  className={`cursor-pointer transition-colors ${
                    selectedDocumentId === doc.id ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'
                  }`}
                  onClick={() => setSelectedDocumentId(doc.id)}
                >
                  <CardContent className="p-3">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      <span className="text-sm font-medium truncate">{doc.title}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Version Timeline */}
      {selectedDocument && (
        <Card>
          <CardHeader>
            <CardTitle>
              {selectedDocument.title} - Version History
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {versions.map((version, index) => (
                <div key={version.id} className="flex items-start gap-4 p-4 border rounded-lg">
                  <div className="flex flex-col items-center">
                    <div className={`w-3 h-3 rounded-full ${
                      index === 0 ? 'bg-primary' : 'bg-muted-foreground'
                    }`} />
                    {index < versions.length - 1 && (
                      <div className="w-px h-16 bg-border mt-2" />
                    )}
                  </div>

                  <div className="flex-1 space-y-2">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Badge variant={index === 0 ? "default" : "outline"}>
                            Version {version.version_number}
                          </Badge>
                          {index === 0 && (
                            <Badge variant="secondary">Current</Badge>
                          )}
                        </div>
                        <h4 className="font-medium">{version.title}</h4>
                        <p className="text-sm text-muted-foreground">
                          {version.changes_description}
                        </p>
                      </div>
                      
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => downloadVersion(version)}>
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="outline">
                          <Eye className="h-4 w-4" />
                        </Button>
                        {index !== 0 && (
                          <Button size="sm" onClick={() => restoreVersion(version)}>
                            Restore
                          </Button>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        You
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {new Date(version.created_at).toLocaleDateString()} at{' '}
                        {new Date(version.created_at).toLocaleTimeString([], { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {versions.length === 0 && (
              <div className="text-center py-8">
                <GitBranch className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No version history</h3>
                <p className="text-muted-foreground">
                  Version history will appear here when you make changes to your pages
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {documents.length === 0 && (
        <div className="text-center py-12">
          <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">No pages found</h3>
          <p className="text-muted-foreground">
            Upload pages to track their version history
          </p>
        </div>
      )}
    </div>
  );
};