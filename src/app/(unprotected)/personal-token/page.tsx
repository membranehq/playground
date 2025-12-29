'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Eye, EyeOff, ExternalLink } from 'lucide-react';
import { useAuth } from '@/components/providers/auth-provider';
import { useConsoleEntry } from '@/hooks/use-console-entry';
import { useCurrentWorkspace } from '@/components/providers/workspace-provider';
import { WorkspaceSelect } from '@/components/workspace-select';

enum Step {
  Token,
  Workspace,
}

export default function PersonalTokenPage() {
  const { setPatToken: saveToken, token: storedToken, isAuthenticated: hasToken } = useAuth();
  const { isError: workspacesError } = useConsoleEntry();
  const { workspace: currentWorkspace } = useCurrentWorkspace();

  const [token, setToken] = useState(storedToken || '');
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<Step>(Step.Token);
  const [showToken, setShowToken] = useState(false);

  const router = useRouter();
  const searchParams = useSearchParams();
  const fromPath = searchParams.get('from') || '/';

  const handleTokenSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!token.trim()) {
      setError('Please enter a valid personal token');
      return;
    }

    saveToken(token.trim());

    setError(null);
    setStep(Step.Workspace);
  };

  const handleWorkspaceSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentWorkspace) {
      setError('Please select a workspace');
      return;
    }

    if (!hasToken) {
      setError('Please enter a valid personal token');
      setStep(Step.Token);
      return;
    }

    router.push(fromPath);
  };

  const goBack = () => {
    setStep(Step.Token);
    setError(null);
  };

  return (
    <div className="container mx-auto flex items-center justify-center min-h-[80vh]">
      {step === Step.Token && (
        <form className="w-full" onSubmit={handleTokenSubmit} autoComplete="off">
          <Card className="w-full max-w-md mx-auto">
            <CardHeader>
              <CardTitle className="text-2xl">Personal Access Token</CardTitle>
              <CardDescription className="space-y-2">
                <span className="block">
                  A Personal Access Token (PAT) authenticates you with the Membrane API. It gives this playground access
                  to your workspaces and integrations.
                </span>
                <a
                  href="https://console.getmembrane.com/w/0/manage-account/api-token"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-500 underline underline-offset-2"
                >
                  Get your token from the Membrane Console
                  <ExternalLink className="h-3 w-3" />
                </a>
              </CardDescription>
            </CardHeader>
            <CardContent>
              {error && (
                <Alert variant="destructive" className="mb-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="token">Personal Access Token</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="token"
                      type={showToken ? 'text' : 'password'}
                      placeholder="Enter your personal token"
                      value={token}
                      onChange={(e) => setToken(e.target.value)}
                      className="flex-1"
                      data-1p-ignore
                    />
                    <Button type="button" variant="ghost" size="icon" onClick={() => setShowToken(!showToken)}>
                      {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      <span className="sr-only">{showToken ? 'Hide token' : 'Show token'}</span>
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button type="submit" className="w-full">
                Continue
              </Button>
            </CardFooter>
          </Card>
        </form>
      )}

      {step === Step.Workspace && (
        <form className="w-full" onSubmit={handleWorkspaceSubmit}>
          <Card className="w-full max-w-md mx-auto">
            <CardHeader>
              <CardTitle className="text-2xl">Select Workspace</CardTitle>
              <CardDescription>
                The selected workspace will be used with this playground. You can change it later from the sidebar.
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
                  <AlertDescription>Failed to fetch workspaces, check if token is correct</AlertDescription>
                </Alert>
              )}

              <div className="grid gap-2">
                <Label htmlFor="workspace">Workspace</Label>
                <WorkspaceSelect span="full" />
              </div>
            </CardContent>
            <CardFooter className="flex justify-between gap-2">
              <Button type="button" variant="outline" onClick={goBack} className="flex-1">
                Back
              </Button>
              <Button type="submit" className="flex-[3]">
                Continue
              </Button>
            </CardFooter>
          </Card>
        </form>
      )}
    </div>
  );
}
