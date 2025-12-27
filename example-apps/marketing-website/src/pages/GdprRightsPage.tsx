import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Scale,
  Eye,
  Edit3,
  Trash2,
  Download,
  Ban,
  Pause,
  UserX,
  Mail,
  Clock,
  Shield,
  CheckCircle2,
} from 'lucide-react';

export default function GdprRightsPage() {
  return (
    <div className="py-20">
      <div className="container mx-auto px-4 max-w-4xl">
        <div className="text-center mb-12">
          <Scale className="h-16 w-16 mx-auto text-primary mb-4" />
          <h1 className="text-4xl font-bold mb-4">Your GDPR Rights</h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            As a user of Strata Storage, you have specific rights under the General Data
            Protection Regulation (GDPR) regarding your personal data.
          </p>
        </div>

        <div className="space-y-8">
          {/* Introduction */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Your Rights Under GDPR
              </CardTitle>
            </CardHeader>
            <CardContent className="prose prose-sm dark:prose-invert max-w-none">
              <p>
                The GDPR gives EU/EEA residents specific rights over their personal data. Even if
                you're not in the EU, we extend these rights to all our users because we believe
                in data privacy for everyone.
              </p>
              <p>
                Below is a summary of each right and how you can exercise it with Strata Storage.
              </p>
            </CardContent>
          </Card>

          {/* Rights Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Right to Access */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Eye className="h-5 w-5 text-blue-500" />
                  Right to Access
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  You have the right to obtain confirmation of whether we process your personal
                  data and receive a copy of that data.
                </p>
                <h5 className="font-semibold text-sm mb-2">What you can request:</h5>
                <ul className="text-sm text-muted-foreground space-y-1 mb-4">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <span>Confirmation of data processing</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <span>Copy of your personal data</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <span>Purpose of processing</span>
                  </li>
                </ul>
                <Button variant="outline" size="sm" asChild>
                  <Link to="/data-deletion">Request Access</Link>
                </Button>
              </CardContent>
            </Card>

            {/* Right to Rectification */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Edit3 className="h-5 w-5 text-yellow-500" />
                  Right to Rectification
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  You have the right to have inaccurate personal data corrected or completed if
                  it's incomplete.
                </p>
                <h5 className="font-semibold text-sm mb-2">How to exercise:</h5>
                <ul className="text-sm text-muted-foreground space-y-1 mb-4">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <span>Update your account settings</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <span>Contact us for other corrections</span>
                  </li>
                </ul>
                <Button variant="outline" size="sm" asChild>
                  <Link to="/contact">Contact Us</Link>
                </Button>
              </CardContent>
            </Card>

            {/* Right to Erasure */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Trash2 className="h-5 w-5 text-red-500" />
                  Right to Erasure
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Also known as the "right to be forgotten", you can request deletion of your
                  personal data.
                </p>
                <h5 className="font-semibold text-sm mb-2">When applicable:</h5>
                <ul className="text-sm text-muted-foreground space-y-1 mb-4">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <span>Data no longer needed</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <span>Withdraw consent</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <span>Object to processing</span>
                  </li>
                </ul>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" asChild>
                    <Link to="/data-deletion">Delete Data</Link>
                  </Button>
                  <Button variant="outline" size="sm" asChild>
                    <Link to="/account-deletion">Delete Account</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Right to Data Portability */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Download className="h-5 w-5 text-green-500" />
                  Right to Data Portability
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  You can receive your personal data in a structured, commonly used,
                  machine-readable format.
                </p>
                <h5 className="font-semibold text-sm mb-2">Format provided:</h5>
                <ul className="text-sm text-muted-foreground space-y-1 mb-4">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <span>JSON format for easy import</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <span>All your personal data included</span>
                  </li>
                </ul>
                <Button variant="outline" size="sm" asChild>
                  <Link to="/data-deletion">Export Data</Link>
                </Button>
              </CardContent>
            </Card>

            {/* Right to Object */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Ban className="h-5 w-5 text-orange-500" />
                  Right to Object
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  You can object to certain types of processing, including direct marketing and
                  processing based on legitimate interests.
                </p>
                <h5 className="font-semibold text-sm mb-2">You can object to:</h5>
                <ul className="text-sm text-muted-foreground space-y-1 mb-4">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <span>Marketing communications</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <span>Analytics and profiling</span>
                  </li>
                </ul>
                <Button variant="outline" size="sm" asChild>
                  <Link to="/contact">Submit Objection</Link>
                </Button>
              </CardContent>
            </Card>

            {/* Right to Restrict Processing */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Pause className="h-5 w-5 text-purple-500" />
                  Right to Restrict Processing
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  You can request that we limit how we use your data in certain circumstances.
                </p>
                <h5 className="font-semibold text-sm mb-2">When applicable:</h5>
                <ul className="text-sm text-muted-foreground space-y-1 mb-4">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <span>Contesting data accuracy</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <span>Unlawful processing</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <span>Pending objection review</span>
                  </li>
                </ul>
                <Button variant="outline" size="sm" asChild>
                  <Link to="/contact">Request Restriction</Link>
                </Button>
              </CardContent>
            </Card>

            {/* Right Not to be Subject to Automated Decisions */}
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <UserX className="h-5 w-5 text-cyan-500" />
                  Right Not to be Subject to Automated Decision-Making
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  You have the right not to be subject to decisions based solely on automated
                  processing that produce legal or significant effects.
                </p>
                <div className="p-4 rounded-lg bg-muted/50">
                  <p className="text-sm">
                    <strong>Our Practice:</strong> Strata Storage does not use automated
                    decision-making or profiling that produces legal or similarly significant
                    effects on users. Our analytics are used only for aggregate insights to
                    improve the product.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* How to Exercise */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                How to Exercise Your Rights
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center p-4">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                    <span className="text-xl font-bold text-primary">1</span>
                  </div>
                  <h4 className="font-semibold mb-2">Submit Request</h4>
                  <p className="text-sm text-muted-foreground">
                    Use our{' '}
                    <Link to="/data-deletion" className="text-primary hover:underline">
                      data request form
                    </Link>{' '}
                    or email us directly
                  </p>
                </div>
                <div className="text-center p-4">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                    <span className="text-xl font-bold text-primary">2</span>
                  </div>
                  <h4 className="font-semibold mb-2">Verification</h4>
                  <p className="text-sm text-muted-foreground">
                    We may ask you to verify your identity to protect your data
                  </p>
                </div>
                <div className="text-center p-4">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                    <span className="text-xl font-bold text-primary">3</span>
                  </div>
                  <h4 className="font-semibold mb-2">Response</h4>
                  <p className="text-sm text-muted-foreground">
                    We'll respond within 30 days as required by GDPR
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Response Timeline */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Response Timeline
              </CardTitle>
            </CardHeader>
            <CardContent className="prose prose-sm dark:prose-invert max-w-none">
              <ul>
                <li>
                  <strong>Initial Response:</strong> Within 30 days of receiving your request
                </li>
                <li>
                  <strong>Complex Requests:</strong> May be extended by 60 days (we'll notify you)
                </li>
                <li>
                  <strong>Free of Charge:</strong> First request is free; excessive requests may
                  incur a fee
                </li>
              </ul>
            </CardContent>
          </Card>

          {/* Contact */}
          <Card>
            <CardHeader>
              <CardTitle>Contact for GDPR Requests</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col md:flex-row gap-6">
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground mb-4">
                    For any GDPR-related requests or questions:
                  </p>
                  <ul className="text-sm space-y-2">
                    <li>
                      <strong>Email:</strong>{' '}
                      <a href="mailto:aoneahsan@gmail.com" className="text-primary">
                        aoneahsan@gmail.com
                      </a>
                    </li>
                    <li>
                      <strong>Subject Line:</strong> "GDPR Request - [Your Request Type]"
                    </li>
                  </ul>
                </div>
                <div className="flex-1">
                  <div className="flex flex-wrap gap-2">
                    <Button asChild>
                      <Link to="/data-deletion">Submit Data Request</Link>
                    </Button>
                    <Button variant="outline" asChild>
                      <Link to="/contact">Contact Us</Link>
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Complaints */}
          <Card>
            <CardHeader>
              <CardTitle>Right to Lodge a Complaint</CardTitle>
            </CardHeader>
            <CardContent className="prose prose-sm dark:prose-invert max-w-none">
              <p>
                If you believe your data protection rights have been violated, you have the right
                to lodge a complaint with a supervisory authority. This is typically the data
                protection authority in your country of residence.
              </p>
              <p>
                We encourage you to contact us first so we can address your concerns directly.
              </p>
            </CardContent>
          </Card>

          {/* Related Links */}
          <div className="text-center">
            <p className="text-sm text-muted-foreground mb-4">Related Pages:</p>
            <div className="flex flex-wrap justify-center gap-2">
              <Link
                to="/privacy"
                className="inline-flex items-center gap-1 px-4 py-2 bg-muted rounded-full text-sm hover:bg-muted/80"
              >
                Privacy Policy
              </Link>
              <Link
                to="/cookies"
                className="inline-flex items-center gap-1 px-4 py-2 bg-muted rounded-full text-sm hover:bg-muted/80"
              >
                Cookie Policy
              </Link>
              <Link
                to="/terms"
                className="inline-flex items-center gap-1 px-4 py-2 bg-muted rounded-full text-sm hover:bg-muted/80"
              >
                Terms of Service
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
