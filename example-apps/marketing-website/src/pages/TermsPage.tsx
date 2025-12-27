import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, Scale, Shield, AlertTriangle, Users, Code2, Mail } from 'lucide-react';

export default function TermsPage() {
  return (
    <div className="py-20">
      <div className="container mx-auto px-4 max-w-4xl">
        <div className="text-center mb-12">
          <Scale className="h-16 w-16 mx-auto text-primary mb-4" />
          <h1 className="text-4xl font-bold mb-4">Terms of Service</h1>
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
                1. Agreement to Terms
              </CardTitle>
            </CardHeader>
            <CardContent className="prose prose-sm dark:prose-invert max-w-none">
              <p>
                By accessing or using Strata Storage library, website (strata-storage.dev), or any
                associated services ("Services"), you agree to be bound by these Terms of Service
                ("Terms"). If you do not agree to these Terms, please do not use our Services.
              </p>
              <p>
                These Terms constitute a legally binding agreement between you and Ahsan Mahmood
                ("Developer", "we", "us", or "our"), the creator and maintainer of Strata Storage.
              </p>
            </CardContent>
          </Card>

          {/* License */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Code2 className="h-5 w-5" />
                2. Software License
              </CardTitle>
            </CardHeader>
            <CardContent className="prose prose-sm dark:prose-invert max-w-none">
              <p>
                Strata Storage is licensed under the{' '}
                <a
                  href="https://www.apache.org/licenses/LICENSE-2.0"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary"
                >
                  Apache License 2.0
                </a>
                .
              </p>

              <h4>Under this license, you may:</h4>
              <ul>
                <li>Use the library for commercial and non-commercial purposes</li>
                <li>Modify the source code</li>
                <li>Distribute the original or modified versions</li>
                <li>Use patent claims of contributors</li>
                <li>Place additional restrictions on modified versions</li>
              </ul>

              <h4>You must:</h4>
              <ul>
                <li>Include the original license and copyright notice</li>
                <li>State significant changes made to the code</li>
                <li>Include a copy of the Apache 2.0 license</li>
                <li>Preserve all notices in the original source</li>
              </ul>

              <h4>You may NOT:</h4>
              <ul>
                <li>Use our trademarks without permission</li>
                <li>Hold contributors liable for damages</li>
                <li>Claim endorsement by the project</li>
              </ul>
            </CardContent>
          </Card>

          {/* Website Usage */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                3. Website & Account Usage
              </CardTitle>
            </CardHeader>
            <CardContent className="prose prose-sm dark:prose-invert max-w-none">
              <h4>Account Registration</h4>
              <p>When creating an account, you agree to:</p>
              <ul>
                <li>Provide accurate and complete information</li>
                <li>Maintain the security of your account credentials</li>
                <li>Notify us immediately of any unauthorized access</li>
                <li>Be responsible for all activities under your account</li>
              </ul>

              <h4>Acceptable Use</h4>
              <p>You agree NOT to:</p>
              <ul>
                <li>Submit false, misleading, or fraudulent information</li>
                <li>Post spam, abusive, or inappropriate content</li>
                <li>Attempt to gain unauthorized access to our systems</li>
                <li>Interfere with the proper functioning of the Services</li>
                <li>Use automated tools to scrape or access the website</li>
                <li>Violate any applicable laws or regulations</li>
                <li>Infringe on intellectual property rights</li>
              </ul>

              <h4>Account Termination</h4>
              <p>
                We reserve the right to suspend or terminate accounts that violate these Terms or
                for any other reason at our discretion. You may delete your account at any time
                through the{' '}
                <Link to="/account-deletion" className="text-primary hover:underline">
                  Account Deletion page
                </Link>
                .
              </p>
            </CardContent>
          </Card>

          {/* User Content */}
          <Card>
            <CardHeader>
              <CardTitle>4. User Content</CardTitle>
            </CardHeader>
            <CardContent className="prose prose-sm dark:prose-invert max-w-none">
              <h4>Ownership</h4>
              <p>
                You retain ownership of content you submit (feedback, reviews, comments). By
                submitting content, you grant us a worldwide, non-exclusive, royalty-free license
                to use, display, reproduce, and distribute your content in connection with our
                Services.
              </p>

              <h4>Content Standards</h4>
              <p>Your content must not:</p>
              <ul>
                <li>Be unlawful, threatening, or defamatory</li>
                <li>Infringe on third-party rights</li>
                <li>Contain viruses or malicious code</li>
                <li>Be spam or commercial solicitation</li>
                <li>Violate any person's privacy</li>
              </ul>

              <h4>Content Moderation</h4>
              <p>
                We reserve the right to remove any content that violates these Terms or that we
                find objectionable for any reason.
              </p>
            </CardContent>
          </Card>

          {/* Intellectual Property */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                5. Intellectual Property
              </CardTitle>
            </CardHeader>
            <CardContent className="prose prose-sm dark:prose-invert max-w-none">
              <p>
                The Strata Storage name, logo, and branding are trademarks of Ahsan Mahmood. The
                website design, documentation, and non-library content are protected by copyright.
              </p>
              <p>
                The library source code is licensed under Apache 2.0 as described in Section 2.
              </p>
              <p>You may not use our trademarks without prior written permission.</p>
            </CardContent>
          </Card>

          {/* Disclaimer */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                6. Disclaimer of Warranties
              </CardTitle>
            </CardHeader>
            <CardContent className="prose prose-sm dark:prose-invert max-w-none">
              <p className="uppercase font-semibold">
                THE SERVICES ARE PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY
                KIND, EXPRESS OR IMPLIED.
              </p>
              <p>We do not warrant that:</p>
              <ul>
                <li>The Services will meet your specific requirements</li>
                <li>The Services will be uninterrupted, secure, or error-free</li>
                <li>Results from using the Services will be accurate or reliable</li>
                <li>Any errors will be corrected</li>
              </ul>
              <p>
                You use the Services at your own risk. We recommend testing thoroughly in your
                environment before production use.
              </p>
            </CardContent>
          </Card>

          {/* Limitation of Liability */}
          <Card>
            <CardHeader>
              <CardTitle>7. Limitation of Liability</CardTitle>
            </CardHeader>
            <CardContent className="prose prose-sm dark:prose-invert max-w-none">
              <p className="uppercase font-semibold">
                TO THE MAXIMUM EXTENT PERMITTED BY LAW, WE SHALL NOT BE LIABLE FOR ANY INDIRECT,
                INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING BUT NOT LIMITED
                TO LOSS OF PROFITS, DATA, USE, OR GOODWILL.
              </p>
              <p>
                Our total liability for any claims arising from these Terms or your use of the
                Services shall not exceed the amount you paid us in the twelve (12) months
                preceding the claim, or $100 USD, whichever is greater.
              </p>
            </CardContent>
          </Card>

          {/* Indemnification */}
          <Card>
            <CardHeader>
              <CardTitle>8. Indemnification</CardTitle>
            </CardHeader>
            <CardContent className="prose prose-sm dark:prose-invert max-w-none">
              <p>
                You agree to indemnify, defend, and hold harmless the Developer from any claims,
                damages, losses, or expenses (including reasonable attorney fees) arising from:
              </p>
              <ul>
                <li>Your use of the Services</li>
                <li>Your violation of these Terms</li>
                <li>Your violation of any third-party rights</li>
                <li>Content you submit</li>
              </ul>
            </CardContent>
          </Card>

          {/* Governing Law */}
          <Card>
            <CardHeader>
              <CardTitle>9. Governing Law & Disputes</CardTitle>
            </CardHeader>
            <CardContent className="prose prose-sm dark:prose-invert max-w-none">
              <p>
                These Terms shall be governed by and construed in accordance with the laws of
                Pakistan, without regard to conflict of law principles.
              </p>
              <p>
                Any disputes shall first be attempted to be resolved through good-faith
                negotiation. If negotiation fails, disputes shall be resolved through binding
                arbitration.
              </p>
            </CardContent>
          </Card>

          {/* Changes */}
          <Card>
            <CardHeader>
              <CardTitle>10. Changes to Terms</CardTitle>
            </CardHeader>
            <CardContent className="prose prose-sm dark:prose-invert max-w-none">
              <p>
                We reserve the right to modify these Terms at any time. We will notify users of
                significant changes by updating the "Last updated" date and, where appropriate,
                providing additional notice.
              </p>
              <p>
                Continued use of the Services after changes constitutes acceptance of the modified
                Terms. If you do not agree to the changes, you must stop using the Services.
              </p>
            </CardContent>
          </Card>

          {/* Severability */}
          <Card>
            <CardHeader>
              <CardTitle>11. Severability</CardTitle>
            </CardHeader>
            <CardContent className="prose prose-sm dark:prose-invert max-w-none">
              <p>
                If any provision of these Terms is found to be unenforceable, the remaining
                provisions will continue in full force and effect.
              </p>
            </CardContent>
          </Card>

          {/* Contact */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                12. Contact Information
              </CardTitle>
            </CardHeader>
            <CardContent className="prose prose-sm dark:prose-invert max-w-none">
              <p>For questions about these Terms of Service:</p>
              <ul>
                <li>
                  <strong>Email:</strong>{' '}
                  <a href="mailto:aoneahsan@gmail.com" className="text-primary">
                    aoneahsan@gmail.com
                  </a>
                </li>
                <li>
                  <strong>Developer:</strong> Ahsan Mahmood
                </li>
                <li>
                  <strong>Website:</strong>{' '}
                  <a
                    href="https://aoneahsan.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary"
                  >
                    aoneahsan.com
                  </a>
                </li>
              </ul>

              <p className="mt-4">Related Pages:</p>
              <div className="flex flex-wrap gap-2">
                <Link
                  to="/privacy"
                  className="inline-flex items-center gap-1 px-3 py-1 bg-muted rounded-full text-sm hover:bg-muted/80"
                >
                  Privacy Policy
                </Link>
                <Link
                  to="/cookies"
                  className="inline-flex items-center gap-1 px-3 py-1 bg-muted rounded-full text-sm hover:bg-muted/80"
                >
                  Cookie Policy
                </Link>
                <Link
                  to="/contact"
                  className="inline-flex items-center gap-1 px-3 py-1 bg-muted rounded-full text-sm hover:bg-muted/80"
                >
                  Contact Us
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
