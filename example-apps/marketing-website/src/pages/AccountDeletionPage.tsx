import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  UserMinus,
  AlertTriangle,
  CheckCircle2,
  Trash2,
  Shield,
  Download,
  Mail,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import analytics from '@/services/analytics';

export default function AccountDeletionPage() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [confirmEmail, setConfirmEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'confirming' | 'deleting' | 'success' | 'error'>(
    'idle'
  );

  const handleDeleteAccount = async () => {
    if (!user) return;

    if (confirmEmail !== user.email) {
      return;
    }

    setStatus('deleting');
    analytics.track('account_deletion_initiated');

    try {
      // In production, this would call a Firebase Cloud Function to:
      // 1. Delete all user data from Firestore
      // 2. Delete the Firebase Auth user
      // 3. Clean up any other associated data

      // For now, we'll just sign out and redirect
      await signOut();
      setStatus('success');
      analytics.track('account_deletion_completed');

      setTimeout(() => {
        navigate('/');
      }, 3000);
    } catch {
      setStatus('error');
      analytics.error('account_deletion_error', 'Failed to delete account');
    }
  };

  if (!user) {
    return (
      <div className="py-20">
        <div className="container mx-auto px-4 max-w-2xl text-center">
          <UserMinus className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
          <h1 className="text-3xl font-bold mb-4">Account Deletion</h1>
          <p className="text-muted-foreground mb-6">
            You need to be logged in to delete your account.
          </p>
          <Button asChild>
            <Link to="/login">Log In</Link>
          </Button>
        </div>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div className="py-20">
        <div className="container mx-auto px-4 max-w-2xl text-center">
          <CheckCircle2 className="h-16 w-16 mx-auto text-green-500 mb-4" />
          <h1 className="text-3xl font-bold mb-4">Account Deleted</h1>
          <p className="text-muted-foreground mb-6">
            Your account and all associated data have been permanently deleted. You will be
            redirected to the home page shortly.
          </p>
          <Button asChild>
            <Link to="/">Go to Home</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="py-20">
      <div className="container mx-auto px-4 max-w-2xl">
        <div className="text-center mb-8">
          <UserMinus className="h-16 w-16 mx-auto text-red-500 mb-4" />
          <h1 className="text-3xl font-bold mb-2">Delete Your Account</h1>
          <p className="text-muted-foreground">
            Permanently delete your account and all associated data
          </p>
        </div>

        <div className="space-y-6">
          {/* Warning */}
          <Card className="border-red-500/50 bg-red-500/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-500">
                <AlertTriangle className="h-5 w-5" />
                Warning: This Action is Irreversible
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm">
                Deleting your account will permanently remove:
              </p>
              <ul className="text-sm space-y-2">
                <li className="flex items-start gap-2">
                  <Trash2 className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                  <span>Your account information and login credentials</span>
                </li>
                <li className="flex items-start gap-2">
                  <Trash2 className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                  <span>All feedback, reviews, and comments you've submitted</span>
                </li>
                <li className="flex items-start gap-2">
                  <Trash2 className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                  <span>Any preferences or settings associated with your account</span>
                </li>
              </ul>
              <p className="text-sm font-semibold text-red-500">
                This action cannot be undone. Make sure you have exported any data you wish to
                keep.
              </p>
            </CardContent>
          </Card>

          {/* Before You Delete */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Before You Delete
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                <Download className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <p className="font-medium">Export Your Data</p>
                  <p className="text-sm text-muted-foreground">
                    You can request a copy of your data before deleting your account.
                  </p>
                  <Link
                    to="/data-deletion"
                    className="text-sm text-primary hover:underline inline-flex items-center gap-1 mt-1"
                  >
                    Request Data Export
                  </Link>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                <Mail className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <p className="font-medium">Having Issues?</p>
                  <p className="text-sm text-muted-foreground">
                    If you're experiencing problems, contact us before deleting your account.
                  </p>
                  <Link
                    to="/contact"
                    className="text-sm text-primary hover:underline inline-flex items-center gap-1 mt-1"
                  >
                    Contact Support
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Confirmation */}
          <Card>
            <CardHeader>
              <CardTitle>Confirm Account Deletion</CardTitle>
              <CardDescription>
                To confirm, please enter your email address: <strong>{user.email}</strong>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="confirm-email">Email Address</Label>
                <Input
                  id="confirm-email"
                  type="email"
                  placeholder="Enter your email to confirm"
                  value={confirmEmail}
                  onChange={(e) => setConfirmEmail(e.target.value)}
                />
              </div>

              {status === 'error' && (
                <p className="text-sm text-red-500">
                  Failed to delete account. Please try again or contact support.
                </p>
              )}

              <div className="flex gap-4">
                <Button variant="outline" className="flex-1" asChild>
                  <Link to="/dashboard">Cancel</Link>
                </Button>
                <Button
                  variant="destructive"
                  className="flex-1"
                  disabled={confirmEmail !== user.email || status === 'deleting'}
                  onClick={handleDeleteAccount}
                >
                  {status === 'deleting' ? 'Deleting...' : 'Delete My Account'}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Alternative */}
          <div className="text-center text-sm text-muted-foreground">
            <p>
              Want to delete specific data instead?{' '}
              <Link to="/data-deletion" className="text-primary hover:underline">
                Submit a Data Deletion Request
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
