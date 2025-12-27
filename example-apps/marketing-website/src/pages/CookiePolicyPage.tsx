import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Cookie, Settings, BarChart3, Shield, Globe, Info } from 'lucide-react';

export default function CookiePolicyPage() {
  return (
    <div className="py-20">
      <div className="container mx-auto px-4 max-w-4xl">
        <div className="text-center mb-12">
          <Cookie className="h-16 w-16 mx-auto text-primary mb-4" />
          <h1 className="text-4xl font-bold mb-4">Cookie Policy</h1>
          <p className="text-muted-foreground">
            Last updated: December 27, 2025
          </p>
        </div>

        <div className="space-y-8">
          {/* Introduction */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Info className="h-5 w-5" />
                What Are Cookies?
              </CardTitle>
            </CardHeader>
            <CardContent className="prose prose-sm dark:prose-invert max-w-none">
              <p>
                Cookies are small text files stored on your device when you visit a website. They
                help websites remember your preferences, understand how you use the site, and
                improve your experience.
              </p>
              <p>
                This Cookie Policy explains how Strata Storage uses cookies and similar
                technologies on our website (strata-storage.dev).
              </p>
            </CardContent>
          </Card>

          {/* Types of Cookies */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Types of Cookies We Use
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Essential Cookies */}
                <div className="p-4 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-2 mb-2">
                    <Shield className="h-5 w-5 text-green-500" />
                    <h4 className="font-semibold">Essential Cookies</h4>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/10 text-green-500">
                      Required
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">
                    These cookies are necessary for the website to function properly and cannot be
                    disabled.
                  </p>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2">Cookie</th>
                        <th className="text-left py-2">Purpose</th>
                        <th className="text-left py-2">Duration</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-muted">
                        <td className="py-2 font-mono text-xs">__session</td>
                        <td className="py-2">User authentication session</td>
                        <td className="py-2">Session</td>
                      </tr>
                      <tr className="border-b border-muted">
                        <td className="py-2 font-mono text-xs">firebase-auth</td>
                        <td className="py-2">Firebase authentication token</td>
                        <td className="py-2">1 hour</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Analytics Cookies */}
                <div className="p-4 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-2 mb-2">
                    <BarChart3 className="h-5 w-5 text-blue-500" />
                    <h4 className="font-semibold">Analytics Cookies</h4>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-500">
                      Optional
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">
                    These cookies help us understand how visitors interact with our website.
                  </p>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2">Service</th>
                        <th className="text-left py-2">Purpose</th>
                        <th className="text-left py-2">Duration</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-muted">
                        <td className="py-2">Firebase Analytics</td>
                        <td className="py-2">Page views, events, user sessions</td>
                        <td className="py-2">2 years</td>
                      </tr>
                      <tr className="border-b border-muted">
                        <td className="py-2">Microsoft Clarity</td>
                        <td className="py-2">Session recordings, heatmaps</td>
                        <td className="py-2">1 year</td>
                      </tr>
                      <tr className="border-b border-muted">
                        <td className="py-2">Amplitude</td>
                        <td className="py-2">Product analytics, feature usage</td>
                        <td className="py-2">1 year</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Functional Cookies */}
                <div className="p-4 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-2 mb-2">
                    <Cookie className="h-5 w-5 text-purple-500" />
                    <h4 className="font-semibold">Functional Cookies</h4>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-500">
                      Optional
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">
                    These cookies enable enhanced functionality and personalization.
                  </p>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2">Cookie</th>
                        <th className="text-left py-2">Purpose</th>
                        <th className="text-left py-2">Duration</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-muted">
                        <td className="py-2 font-mono text-xs">theme</td>
                        <td className="py-2">Remember dark/light mode preference</td>
                        <td className="py-2">1 year</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Third-Party Cookies */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                Third-Party Cookies
              </CardTitle>
            </CardHeader>
            <CardContent className="prose prose-sm dark:prose-invert max-w-none">
              <p>
                We use the following third-party services that may set their own cookies:
              </p>
              <ul>
                <li>
                  <strong>Google Firebase:</strong> Authentication and analytics
                </li>
                <li>
                  <strong>Microsoft Clarity:</strong> Session recordings and heatmaps
                </li>
                <li>
                  <strong>Amplitude:</strong> Product analytics
                </li>
              </ul>
              <p>
                These services have their own privacy policies and cookie practices. We recommend
                reviewing their policies:
              </p>
              <ul>
                <li>
                  <a
                    href="https://policies.google.com/privacy"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary"
                  >
                    Google Privacy Policy
                  </a>
                </li>
                <li>
                  <a
                    href="https://privacy.microsoft.com/en-us/privacystatement"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary"
                  >
                    Microsoft Privacy Statement
                  </a>
                </li>
                <li>
                  <a
                    href="https://amplitude.com/privacy"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary"
                  >
                    Amplitude Privacy Policy
                  </a>
                </li>
              </ul>
            </CardContent>
          </Card>

          {/* Managing Cookies */}
          <Card>
            <CardHeader>
              <CardTitle>Managing Your Cookie Preferences</CardTitle>
            </CardHeader>
            <CardContent className="prose prose-sm dark:prose-invert max-w-none">
              <h4>Browser Settings</h4>
              <p>
                Most web browsers allow you to control cookies through their settings. You can:
              </p>
              <ul>
                <li>Block all cookies</li>
                <li>Block third-party cookies only</li>
                <li>Delete cookies when you close your browser</li>
                <li>Browse in "private" or "incognito" mode</li>
              </ul>

              <h4>Browser-Specific Instructions</h4>
              <ul>
                <li>
                  <a
                    href="https://support.google.com/chrome/answer/95647"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary"
                  >
                    Google Chrome
                  </a>
                </li>
                <li>
                  <a
                    href="https://support.mozilla.org/en-US/kb/cookies-information-websites-store-on-your-computer"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary"
                  >
                    Mozilla Firefox
                  </a>
                </li>
                <li>
                  <a
                    href="https://support.apple.com/guide/safari/manage-cookies-sfri11471/mac"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary"
                  >
                    Safari
                  </a>
                </li>
                <li>
                  <a
                    href="https://support.microsoft.com/en-us/microsoft-edge/delete-cookies-in-microsoft-edge-63947406-40ac-c3b8-57b9-2a946a29ae09"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary"
                  >
                    Microsoft Edge
                  </a>
                </li>
              </ul>

              <h4>Impact of Disabling Cookies</h4>
              <p>
                If you disable cookies, some features of our website may not function properly:
              </p>
              <ul>
                <li>You may not be able to log in or stay logged in</li>
                <li>Your preferences may not be saved</li>
                <li>Some features may be unavailable</li>
              </ul>
            </CardContent>
          </Card>

          {/* Do Not Track */}
          <Card>
            <CardHeader>
              <CardTitle>Do Not Track Signals</CardTitle>
            </CardHeader>
            <CardContent className="prose prose-sm dark:prose-invert max-w-none">
              <p>
                Our website currently does not respond to "Do Not Track" (DNT) signals. However,
                you can manage tracking through the cookie settings described above.
              </p>
            </CardContent>
          </Card>

          {/* Updates */}
          <Card>
            <CardHeader>
              <CardTitle>Updates to This Policy</CardTitle>
            </CardHeader>
            <CardContent className="prose prose-sm dark:prose-invert max-w-none">
              <p>
                We may update this Cookie Policy periodically. Changes will be posted on this page
                with an updated "Last updated" date.
              </p>
            </CardContent>
          </Card>

          {/* Contact */}
          <Card>
            <CardHeader>
              <CardTitle>Contact Us</CardTitle>
            </CardHeader>
            <CardContent className="prose prose-sm dark:prose-invert max-w-none">
              <p>
                If you have questions about our use of cookies, please contact us at{' '}
                <a href="mailto:aoneahsan@gmail.com" className="text-primary">
                  aoneahsan@gmail.com
                </a>
              </p>

              <p className="mt-4">Related Pages:</p>
              <div className="flex flex-wrap gap-2">
                <Link
                  to="/privacy"
                  className="inline-flex items-center gap-1 px-3 py-1 bg-muted rounded-full text-sm hover:bg-muted/80"
                >
                  Privacy Policy
                </Link>
                <Link
                  to="/terms"
                  className="inline-flex items-center gap-1 px-3 py-1 bg-muted rounded-full text-sm hover:bg-muted/80"
                >
                  Terms of Service
                </Link>
                <Link
                  to="/gdpr-rights"
                  className="inline-flex items-center gap-1 px-3 py-1 bg-muted rounded-full text-sm hover:bg-muted/80"
                >
                  GDPR Rights
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
