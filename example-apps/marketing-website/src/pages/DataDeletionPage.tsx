import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Trash2,
  Database,
  FileText,
  Download,
  CheckCircle2,
  Clock,
  Shield,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import analytics from '@/services/analytics';

type RequestType = 'deletion' | 'export' | 'access';

export default function DataDeletionPage() {
  const { user } = useAuth();
  const [requestType, setRequestType] = useState<RequestType>('deletion');
  const [formData, setFormData] = useState({
    email: user?.email || '',
    reason: '',
    specificData: '',
  });
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success'>('idle');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('submitting');

    analytics.track('data_request_submitted', { type: requestType });

    // In production, this would submit to a backend or send an email
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Open mailto with the request
    const subject = `Data ${requestType === 'deletion' ? 'Deletion' : requestType === 'export' ? 'Export' : 'Access'} Request - Strata Storage`;
    const body = `
Request Type: ${requestType.toUpperCase()}
Email: ${formData.email}
${user ? `User ID: ${user.uid}` : ''}

Specific Data: ${formData.specificData || 'All data'}

Reason: ${formData.reason || 'Not provided'}

---
This is a GDPR data subject request submitted via strata-storage.dev
    `.trim();

    window.location.href = `mailto:aoneahsan@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

    setStatus('success');
  };

  if (status === 'success') {
    return (
      <div className="py-20">
        <div className="container mx-auto px-4 max-w-2xl text-center">
          <CheckCircle2 className="h-16 w-16 mx-auto text-green-500 mb-4" />
          <h1 className="text-3xl font-bold mb-4">Request Submitted</h1>
          <p className="text-muted-foreground mb-6">
            Your {requestType} request has been submitted. We will process it within 30 days as
            required by GDPR. You will receive a confirmation email shortly.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button variant="outline" onClick={() => setStatus('idle')}>
              Submit Another Request
            </Button>
            <Button asChild>
              <Link to="/">Go to Home</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="py-20">
      <div className="container mx-auto px-4 max-w-3xl">
        <div className="text-center mb-12">
          <Database className="h-16 w-16 mx-auto text-primary mb-4" />
          <h1 className="text-4xl font-bold mb-4">Data Subject Request</h1>
          <p className="text-xl text-muted-foreground">
            Exercise your GDPR rights regarding your personal data
          </p>
        </div>

        <div className="space-y-8">
          {/* Request Type Selection */}
          <Card>
            <CardHeader>
              <CardTitle>What would you like to do?</CardTitle>
              <CardDescription>Select the type of request you want to submit</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <button
                  type="button"
                  onClick={() => setRequestType('deletion')}
                  className={`p-4 rounded-lg border-2 text-left transition-colors ${
                    requestType === 'deletion'
                      ? 'border-primary bg-primary/5'
                      : 'border-muted hover:border-primary/50'
                  }`}
                >
                  <Trash2
                    className={`h-6 w-6 mb-2 ${requestType === 'deletion' ? 'text-primary' : 'text-muted-foreground'}`}
                  />
                  <h4 className="font-semibold mb-1">Delete Data</h4>
                  <p className="text-sm text-muted-foreground">
                    Request permanent deletion of your data
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setRequestType('export')}
                  className={`p-4 rounded-lg border-2 text-left transition-colors ${
                    requestType === 'export'
                      ? 'border-primary bg-primary/5'
                      : 'border-muted hover:border-primary/50'
                  }`}
                >
                  <Download
                    className={`h-6 w-6 mb-2 ${requestType === 'export' ? 'text-primary' : 'text-muted-foreground'}`}
                  />
                  <h4 className="font-semibold mb-1">Export Data</h4>
                  <p className="text-sm text-muted-foreground">
                    Get a copy of all your data
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setRequestType('access')}
                  className={`p-4 rounded-lg border-2 text-left transition-colors ${
                    requestType === 'access'
                      ? 'border-primary bg-primary/5'
                      : 'border-muted hover:border-primary/50'
                  }`}
                >
                  <FileText
                    className={`h-6 w-6 mb-2 ${requestType === 'access' ? 'text-primary' : 'text-muted-foreground'}`}
                  />
                  <h4 className="font-semibold mb-1">Access Data</h4>
                  <p className="text-sm text-muted-foreground">
                    See what data we have about you
                  </p>
                </button>
              </div>
            </CardContent>
          </Card>

          {/* Data We Store */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Data We Store
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                The following data may be associated with your account:
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {[
                  { label: 'Email Address', desc: 'Used for authentication' },
                  { label: 'Display Name', desc: 'If provided during signup' },
                  { label: 'Account Creation Date', desc: 'When you registered' },
                  { label: 'Feedback/Reviews', desc: 'Content you submitted' },
                  { label: 'Auth Provider', desc: 'Google, Email/Password' },
                  { label: 'Analytics Data', desc: 'Anonymous usage patterns' },
                ].map((item) => (
                  <div key={item.label} className="p-3 rounded-lg bg-muted/50">
                    <p className="font-medium text-sm">{item.label}</p>
                    <p className="text-xs text-muted-foreground">{item.desc}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Request Form */}
          <Card>
            <CardHeader>
              <CardTitle>Submit Your Request</CardTitle>
              <CardDescription>
                Fill out the form below to submit your {requestType} request
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address *</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="your@email.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    We'll use this to verify your identity and send confirmation
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="specificData">Specific Data (Optional)</Label>
                  <Input
                    id="specificData"
                    placeholder="e.g., 'Only my feedback submissions' or leave blank for all data"
                    value={formData.specificData}
                    onChange={(e) => setFormData({ ...formData, specificData: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="reason">Reason (Optional)</Label>
                  <Textarea
                    id="reason"
                    placeholder="Tell us why you're making this request..."
                    rows={3}
                    value={formData.reason}
                    onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  />
                </div>

                <Button type="submit" className="w-full" disabled={status === 'submitting'}>
                  {status === 'submitting' ? 'Submitting...' : `Submit ${requestType === 'deletion' ? 'Deletion' : requestType === 'export' ? 'Export' : 'Access'} Request`}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Processing Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Processing Timeline
              </CardTitle>
            </CardHeader>
            <CardContent className="prose prose-sm dark:prose-invert max-w-none">
              <ul>
                <li>
                  <strong>Acknowledgment:</strong> Within 48 hours
                </li>
                <li>
                  <strong>Identity Verification:</strong> We may request additional verification
                </li>
                <li>
                  <strong>Request Fulfillment:</strong> Within 30 days (as required by GDPR)
                </li>
                <li>
                  <strong>Confirmation:</strong> You'll receive email confirmation when complete
                </li>
              </ul>
            </CardContent>
          </Card>

          {/* Contact */}
          <div className="text-center text-sm text-muted-foreground">
            <p>
              Questions about your data?{' '}
              <Link to="/contact" className="text-primary hover:underline">
                Contact Us
              </Link>{' '}
              or email{' '}
              <a href="mailto:aoneahsan@gmail.com" className="text-primary hover:underline">
                aoneahsan@gmail.com
              </a>
            </p>
            <p className="mt-2">
              <Link to="/privacy" className="text-primary hover:underline">
                Privacy Policy
              </Link>
              {' | '}
              <Link to="/gdpr-rights" className="text-primary hover:underline">
                Your GDPR Rights
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
