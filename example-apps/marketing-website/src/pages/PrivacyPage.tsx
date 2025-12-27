import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function PrivacyPage() {
  return (
    <div className="py-20">
      <div className="container mx-auto px-4 max-w-3xl">
        <h1 className="text-4xl font-bold mb-8">Privacy Policy</h1>
        <p className="text-muted-foreground mb-8">Last updated: December 2024</p>

        <div className="space-y-8">
          <Card>
            <CardHeader>
              <CardTitle>Introduction</CardTitle>
            </CardHeader>
            <CardContent className="prose prose-sm dark:prose-invert">
              <p>
                Strata Storage ("we", "our", or "us") is committed to protecting your privacy. This
                Privacy Policy explains how we collect, use, and safeguard your information when
                you use our website and services.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Information We Collect</CardTitle>
            </CardHeader>
            <CardContent className="prose prose-sm dark:prose-invert">
              <h4>Account Information</h4>
              <p>
                When you create an account, we collect your email address and authentication data
                through Firebase Authentication.
              </p>

              <h4>Feedback and Reviews</h4>
              <p>
                When you submit feedback, we collect the content you provide along with your user
                ID and email for reference.
              </p>

              <h4>Usage Analytics</h4>
              <p>
                We use Firebase Analytics to understand how users interact with our website. This
                includes page views, session duration, and general usage patterns.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>How We Use Your Information</CardTitle>
            </CardHeader>
            <CardContent className="prose prose-sm dark:prose-invert">
              <ul>
                <li>To provide and maintain our services</li>
                <li>To process your feedback and feature requests</li>
                <li>To improve our library based on usage patterns</li>
                <li>To communicate with you about updates</li>
                <li>To ensure security and prevent abuse</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Data Storage</CardTitle>
            </CardHeader>
            <CardContent className="prose prose-sm dark:prose-invert">
              <p>
                Your data is stored securely using Google Firebase services, which comply with
                industry-standard security practices. We do not sell or share your personal
                information with third parties.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Your Rights</CardTitle>
            </CardHeader>
            <CardContent className="prose prose-sm dark:prose-invert">
              <p>You have the right to:</p>
              <ul>
                <li>Access your personal data</li>
                <li>Request correction of your data</li>
                <li>Request deletion of your account</li>
                <li>Export your data</li>
                <li>Opt out of analytics tracking</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Contact Us</CardTitle>
            </CardHeader>
            <CardContent className="prose prose-sm dark:prose-invert">
              <p>
                For any privacy-related questions or requests, contact us at:{' '}
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
