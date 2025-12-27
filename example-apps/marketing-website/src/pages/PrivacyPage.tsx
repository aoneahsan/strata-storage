import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield, Database, Eye, Lock, Globe, Mail, Trash2, FileText } from 'lucide-react';

export default function PrivacyPage() {
  return (
    <div className="py-20">
      <div className="container mx-auto px-4 max-w-4xl">
        <div className="text-center mb-12">
          <Shield className="h-16 w-16 mx-auto text-primary mb-4" />
          <h1 className="text-4xl font-bold mb-4">Privacy Policy</h1>
          <p className="text-muted-foreground">
            Last updated: December 27, 2025 | Effective: December 27, 2025
          </p>
        </div>

        <div className="space-y-8">
          {/* Introduction */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Introduction
              </CardTitle>
            </CardHeader>
            <CardContent className="prose prose-sm dark:prose-invert max-w-none">
              <p>
                Strata Storage ("we", "our", "us", or "the Service") is committed to protecting your
                privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard
                your information when you use our website at strata-storage.dev and the Strata Storage
                npm package.
              </p>
              <p>
                We comply with the General Data Protection Regulation (GDPR), California Consumer
                Privacy Act (CCPA), and other applicable data protection laws.
              </p>
              <p>
                <strong>Developer:</strong> Ahsan Mahmood
                <br />
                <strong>Contact:</strong>{' '}
                <a href="mailto:aoneahsan@gmail.com" className="text-primary">
                  aoneahsan@gmail.com
                </a>
              </p>
            </CardContent>
          </Card>

          {/* Information We Collect */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Information We Collect
              </CardTitle>
            </CardHeader>
            <CardContent className="prose prose-sm dark:prose-invert max-w-none">
              <h4>1. Account Information (When You Register)</h4>
              <ul>
                <li>Email address</li>
                <li>Display name (optional)</li>
                <li>Authentication provider (Google, Email/Password)</li>
                <li>Account creation timestamp</li>
              </ul>

              <h4>2. User-Generated Content</h4>
              <ul>
                <li>Feedback submissions (type, title, description, rating)</li>
                <li>Reviews and comments</li>
                <li>Feature requests and bug reports</li>
              </ul>

              <h4>3. Automatically Collected Information</h4>
              <ul>
                <li>Device type and browser information</li>
                <li>IP address (anonymized for analytics)</li>
                <li>Pages visited and time spent</li>
                <li>Click patterns and navigation flow</li>
                <li>Referral source</li>
              </ul>

              <h4>4. Analytics Data</h4>
              <p>We use the following analytics services:</p>
              <ul>
                <li>
                  <strong>Firebase Analytics:</strong> Page views, user sessions, events
                </li>
                <li>
                  <strong>Microsoft Clarity:</strong> Session recordings, heatmaps, user behavior
                </li>
                <li>
                  <strong>Amplitude:</strong> Product analytics, user journeys, feature usage
                </li>
              </ul>
            </CardContent>
          </Card>

          {/* How We Use Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5" />
                How We Use Your Information
              </CardTitle>
            </CardHeader>
            <CardContent className="prose prose-sm dark:prose-invert max-w-none">
              <p>We use collected information for the following purposes:</p>

              <h4>Service Provision</h4>
              <ul>
                <li>To create and manage your account</li>
                <li>To process and respond to your feedback</li>
                <li>To provide customer support</li>
              </ul>

              <h4>Improvement & Development</h4>
              <ul>
                <li>To understand how users interact with our website</li>
                <li>To improve the Strata Storage library based on feedback</li>
                <li>To identify and fix bugs or issues</li>
                <li>To develop new features</li>
              </ul>

              <h4>Communication</h4>
              <ul>
                <li>To send important service updates</li>
                <li>To respond to your inquiries</li>
                <li>To notify you of security incidents (if applicable)</li>
              </ul>

              <h4>Legal Compliance</h4>
              <ul>
                <li>To comply with legal obligations</li>
                <li>To protect against fraudulent or illegal activity</li>
                <li>To enforce our Terms of Service</li>
              </ul>
            </CardContent>
          </Card>

          {/* Data Storage & Security */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="h-5 w-5" />
                Data Storage & Security
              </CardTitle>
            </CardHeader>
            <CardContent className="prose prose-sm dark:prose-invert max-w-none">
              <h4>Storage Location</h4>
              <p>
                Your data is stored using Google Firebase services, with servers located in the
                United States. Firebase is SOC 2 Type II certified and complies with GDPR.
              </p>

              <h4>Security Measures</h4>
              <ul>
                <li>All data transmitted over HTTPS/TLS encryption</li>
                <li>Firebase Authentication with secure token handling</li>
                <li>Firestore security rules to protect data access</li>
                <li>Regular security audits and updates</li>
                <li>No storage of payment information</li>
              </ul>

              <h4>Data Retention</h4>
              <ul>
                <li>Account data: Retained until account deletion</li>
                <li>Feedback/reviews: Retained indefinitely unless deletion requested</li>
                <li>Analytics data: Retained for 26 months (Firebase default)</li>
                <li>Server logs: Retained for 90 days</li>
              </ul>
            </CardContent>
          </Card>

          {/* Third-Party Sharing */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                Third-Party Services & Data Sharing
              </CardTitle>
            </CardHeader>
            <CardContent className="prose prose-sm dark:prose-invert max-w-none">
              <p>We use the following third-party services:</p>

              <table className="w-full text-sm">
                <thead>
                  <tr>
                    <th className="text-left p-2 border-b">Service</th>
                    <th className="text-left p-2 border-b">Purpose</th>
                    <th className="text-left p-2 border-b">Data Shared</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="p-2 border-b">Firebase Auth</td>
                    <td className="p-2 border-b">Authentication</td>
                    <td className="p-2 border-b">Email, auth provider</td>
                  </tr>
                  <tr>
                    <td className="p-2 border-b">Firestore</td>
                    <td className="p-2 border-b">Database</td>
                    <td className="p-2 border-b">User content, feedback</td>
                  </tr>
                  <tr>
                    <td className="p-2 border-b">Firebase Analytics</td>
                    <td className="p-2 border-b">Usage analytics</td>
                    <td className="p-2 border-b">Anonymous usage data</td>
                  </tr>
                  <tr>
                    <td className="p-2 border-b">Microsoft Clarity</td>
                    <td className="p-2 border-b">UX analytics</td>
                    <td className="p-2 border-b">Session recordings, clicks</td>
                  </tr>
                  <tr>
                    <td className="p-2 border-b">Amplitude</td>
                    <td className="p-2 border-b">Product analytics</td>
                    <td className="p-2 border-b">Feature usage events</td>
                  </tr>
                </tbody>
              </table>

              <p className="mt-4">
                <strong>We do NOT:</strong>
              </p>
              <ul>
                <li>Sell your personal information</li>
                <li>Share data with advertisers</li>
                <li>Use data for targeted advertising</li>
                <li>Share data with third parties for their marketing</li>
              </ul>
            </CardContent>
          </Card>

          {/* Your Rights */}
          <Card>
            <CardHeader>
              <CardTitle>Your Rights Under GDPR & CCPA</CardTitle>
            </CardHeader>
            <CardContent className="prose prose-sm dark:prose-invert max-w-none">
              <p>You have the following rights regarding your personal data:</p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div className="p-4 bg-muted/50 rounded-lg">
                  <h5 className="font-semibold mb-2">Right to Access</h5>
                  <p className="text-sm">Request a copy of your personal data.</p>
                </div>
                <div className="p-4 bg-muted/50 rounded-lg">
                  <h5 className="font-semibold mb-2">Right to Rectification</h5>
                  <p className="text-sm">Correct inaccurate or incomplete data.</p>
                </div>
                <div className="p-4 bg-muted/50 rounded-lg">
                  <h5 className="font-semibold mb-2">Right to Erasure</h5>
                  <p className="text-sm">Request deletion of your data ("right to be forgotten").</p>
                </div>
                <div className="p-4 bg-muted/50 rounded-lg">
                  <h5 className="font-semibold mb-2">Right to Portability</h5>
                  <p className="text-sm">Export your data in a machine-readable format.</p>
                </div>
                <div className="p-4 bg-muted/50 rounded-lg">
                  <h5 className="font-semibold mb-2">Right to Object</h5>
                  <p className="text-sm">Object to processing for certain purposes.</p>
                </div>
                <div className="p-4 bg-muted/50 rounded-lg">
                  <h5 className="font-semibold mb-2">Right to Restrict</h5>
                  <p className="text-sm">Limit how we use your data.</p>
                </div>
              </div>

              <p className="mt-4">
                To exercise any of these rights, please visit our{' '}
                <Link to="/gdpr-rights" className="text-primary hover:underline">
                  GDPR Rights page
                </Link>{' '}
                or contact us at{' '}
                <a href="mailto:aoneahsan@gmail.com" className="text-primary">
                  aoneahsan@gmail.com
                </a>
                .
              </p>
            </CardContent>
          </Card>

          {/* Cookies */}
          <Card>
            <CardHeader>
              <CardTitle>Cookies & Tracking</CardTitle>
            </CardHeader>
            <CardContent className="prose prose-sm dark:prose-invert max-w-none">
              <p>
                We use cookies and similar technologies to enhance your experience. For detailed
                information, please see our{' '}
                <Link to="/cookies" className="text-primary hover:underline">
                  Cookie Policy
                </Link>
                .
              </p>
              <p>You can control cookies through your browser settings.</p>
            </CardContent>
          </Card>

          {/* Children's Privacy */}
          <Card>
            <CardHeader>
              <CardTitle>Children's Privacy</CardTitle>
            </CardHeader>
            <CardContent className="prose prose-sm dark:prose-invert max-w-none">
              <p>
                Our service is not directed to children under 13 years of age. We do not knowingly
                collect personal information from children under 13. If you are a parent or guardian
                and believe your child has provided us with personal information, please contact us
                immediately.
              </p>
            </CardContent>
          </Card>

          {/* Changes to Policy */}
          <Card>
            <CardHeader>
              <CardTitle>Changes to This Policy</CardTitle>
            </CardHeader>
            <CardContent className="prose prose-sm dark:prose-invert max-w-none">
              <p>
                We may update this Privacy Policy periodically. We will notify you of significant
                changes by posting the new policy on this page and updating the "Last updated" date.
                Continued use after changes constitutes acceptance of the updated policy.
              </p>
            </CardContent>
          </Card>

          {/* Contact */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Contact Us
              </CardTitle>
            </CardHeader>
            <CardContent className="prose prose-sm dark:prose-invert max-w-none">
              <p>For privacy-related questions, concerns, or requests:</p>
              <ul>
                <li>
                  <strong>Email:</strong>{' '}
                  <a href="mailto:aoneahsan@gmail.com" className="text-primary">
                    aoneahsan@gmail.com
                  </a>
                </li>
                <li>
                  <strong>Response Time:</strong> Within 30 days for GDPR requests
                </li>
                <li>
                  <strong>Contact Page:</strong>{' '}
                  <Link to="/contact" className="text-primary hover:underline">
                    strata-storage.dev/contact
                  </Link>
                </li>
              </ul>

              <p className="mt-4">Related Pages:</p>
              <div className="flex flex-wrap gap-2">
                <Link
                  to="/terms"
                  className="inline-flex items-center gap-1 px-3 py-1 bg-muted rounded-full text-sm hover:bg-muted/80"
                >
                  Terms of Service
                </Link>
                <Link
                  to="/cookies"
                  className="inline-flex items-center gap-1 px-3 py-1 bg-muted rounded-full text-sm hover:bg-muted/80"
                >
                  Cookie Policy
                </Link>
                <Link
                  to="/gdpr-rights"
                  className="inline-flex items-center gap-1 px-3 py-1 bg-muted rounded-full text-sm hover:bg-muted/80"
                >
                  GDPR Rights
                </Link>
                <Link
                  to="/data-deletion"
                  className="inline-flex items-center gap-1 px-3 py-1 bg-muted rounded-full text-sm hover:bg-muted/80"
                >
                  <Trash2 className="h-3 w-3" />
                  Data Deletion
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
