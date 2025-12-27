import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function TermsPage() {
  return (
    <div className="py-20">
      <div className="container mx-auto px-4 max-w-3xl">
        <h1 className="text-4xl font-bold mb-8">Terms of Service</h1>
        <p className="text-muted-foreground mb-8">Last updated: December 2024</p>

        <div className="space-y-8">
          <Card>
            <CardHeader>
              <CardTitle>1. Acceptance of Terms</CardTitle>
            </CardHeader>
            <CardContent className="prose prose-sm dark:prose-invert">
              <p>
                By accessing or using Strata Storage library or this website, you agree to be bound
                by these Terms of Service. If you do not agree, please do not use our services.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>2. License</CardTitle>
            </CardHeader>
            <CardContent className="prose prose-sm dark:prose-invert">
              <p>
                Strata Storage is licensed under the Apache License 2.0. You may use, modify, and
                distribute the library in accordance with the license terms.
              </p>
              <p>Key points of the Apache 2.0 license:</p>
              <ul>
                <li>You can use the library for any purpose</li>
                <li>You can modify and distribute the library</li>
                <li>You must include the original license and copyright notice</li>
                <li>You must state any significant changes made</li>
                <li>The library is provided "as is" without warranties</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>3. Website Usage</CardTitle>
            </CardHeader>
            <CardContent className="prose prose-sm dark:prose-invert">
              <p>When using this website, you agree to:</p>
              <ul>
                <li>Provide accurate information when creating an account</li>
                <li>Not submit spam, abusive, or inappropriate content</li>
                <li>Not attempt to gain unauthorized access to our systems</li>
                <li>Respect other users and the community</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>4. User Content</CardTitle>
            </CardHeader>
            <CardContent className="prose prose-sm dark:prose-invert">
              <p>
                By submitting feedback, reviews, or other content, you grant us a non-exclusive
                license to use, display, and share your content in relation to improving our
                services. You retain ownership of your content.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>5. Disclaimer</CardTitle>
            </CardHeader>
            <CardContent className="prose prose-sm dark:prose-invert">
              <p>
                The Strata Storage library is provided "as is" without warranty of any kind. We do
                not guarantee that the library will meet your requirements or be error-free.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>6. Limitation of Liability</CardTitle>
            </CardHeader>
            <CardContent className="prose prose-sm dark:prose-invert">
              <p>
                In no event shall we be liable for any indirect, incidental, special, or
                consequential damages arising from your use of the library or website.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>7. Changes to Terms</CardTitle>
            </CardHeader>
            <CardContent className="prose prose-sm dark:prose-invert">
              <p>
                We reserve the right to modify these terms at any time. Continued use of our
                services after changes constitutes acceptance of the new terms.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>8. Contact</CardTitle>
            </CardHeader>
            <CardContent className="prose prose-sm dark:prose-invert">
              <p>
                For questions about these terms, contact us at:{' '}
                <a href="mailto:aoneahsan@gmail.com" className="text-primary">
                  aoneahsan@gmail.com
                </a>
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
