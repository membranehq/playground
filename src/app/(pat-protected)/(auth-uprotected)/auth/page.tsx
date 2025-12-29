'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, ExternalLink } from 'lucide-react';
import { useConsoleEntry } from '@/hooks/use-console-entry';
import { useCurrentWorkspace } from '@/components/providers/workspace-provider';
import { WorkspaceSelect } from '@/components/workspace-select';
import { useState, useEffect } from 'react';
import { useAuth } from '@/components/providers/auth-provider';
import { Metadata } from 'next';

export default function WorkspaceSelectionPage() {
  const { isError: workspacesError, isLoading: workspacesLoading } = useConsoleEntry();
  const { workspace: currentWorkspace } = useCurrentWorkspace();
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  const [error, setError] = useState<string | null>(null);

  const router = useRouter();
  const searchParams = useSearchParams();
  const fromPath = searchParams.get('from') || '/';

  // Redirect to destination if workspace is already selected
  useEffect(() => {
    if (currentWorkspace && isAuthenticated) {
      router.push(fromPath);
    }
  }, [currentWorkspace, isAuthenticated, router, fromPath]);

  const handleWorkspaceSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentWorkspace) {
      setError('Please select a workspace');
      return;
    }

    router.push(fromPath);
  };

  if (authLoading || workspacesLoading) {
    return (
      <div className="container mx-auto flex items-center justify-center min-h-[80vh]">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto flex items-center justify-center min-h-[80vh]">
      <form className="w-full" onSubmit={handleWorkspaceSubmit}>
        <Card className="w-full max-w-md mx-auto">
          <CardHeader>
            <CardTitle className="text-2xl">Select Workspace</CardTitle>
            <CardDescription>
              Choose a workspace to use with this playground. You can change it later from the sidebar.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {error && (
              <Alert variant="destructive" className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {workspacesError && (
              <Alert variant="destructive" className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>Failed to fetch workspaces. Please try again.</AlertDescription>
              </Alert>
            )}

            <div className="grid gap-2">
              <Label htmlFor="workspace">Workspace</Label>
              <WorkspaceSelect span="full" />
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" className="w-full">
              Continue
            </Button>
          </CardFooter>
        </Card>
      </form>
    </div>
  );
}
