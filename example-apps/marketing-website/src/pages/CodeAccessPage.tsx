import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Github, Mail, Users, Shield, Code2, CheckCircle2 } from 'lucide-react';

export default function CodeAccessPage() {
  return (
    <div className="py-20">
      <div className="container mx-auto px-4 max-w-3xl">
        <div className="text-center mb-12">
          <Github className="h-16 w-16 mx-auto text-primary mb-4" />
          <h1 className="text-4xl font-bold mb-4">Code Access</h1>
          <p className="text-xl text-muted-foreground">
            Strata Storage is open source, but repository access is managed.
          </p>
        </div>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              About Repository Access
            </CardTitle>
          </CardHeader>
          <CardContent className="prose prose-sm dark:prose-invert max-w-none">
            <p>
              Strata Storage is an open-source project licensed under Apache 2.0. However, to
              maintain code quality and ensure meaningful contributions, repository access is
              granted on a case-by-case basis.
            </p>
            <p>This approach helps us:</p>
            <ul>
              <li>Maintain high code standards</li>
              <li>Ensure all contributors are aligned with project goals</li>
              <li>Build a focused community of dedicated developers</li>
              <li>Prevent spam and low-quality contributions</li>
            </ul>
          </CardContent>
        </Card>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Who Can Get Access
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                'Developers who want to contribute meaningful features or fixes',
                'Teams using Strata Storage in production who want to contribute back',
                'Open source enthusiasts with relevant experience',
                'Security researchers interested in reviewing the codebase',
                'Documentation writers who want to improve guides',
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Code2 className="h-5 w-5" />
              How to Request Access
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              To request repository access, send an email with the following information:
            </p>
            <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
              <li>Your GitHub username</li>
              <li>Brief description of how you plan to contribute</li>
              <li>Your relevant experience (if any)</li>
              <li>Links to your other open source work (optional)</li>
            </ol>

            <div className="pt-4">
              <Button asChild size="lg">
                <a href="mailto:aoneahsan@gmail.com?subject=Strata%20Storage%20Repository%20Access%20Request">
                  <Mail className="h-4 w-4 mr-2" />
                  Request Access via Email
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick Links</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-4">
            <Button variant="outline" asChild>
              <a href="https://www.npmjs.com/package/strata-storage" target="_blank" rel="noopener noreferrer">
                NPM Package
              </a>
            </Button>
            <Button variant="outline" asChild>
              <a href="https://github.com/aoneahsan/strata-storage/issues" target="_blank" rel="noopener noreferrer">
                Report Issues
              </a>
            </Button>
            <Button variant="outline" asChild>
              <a href="https://linkedin.com/in/aoneahsan" target="_blank" rel="noopener noreferrer">
                Connect on LinkedIn
              </a>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
