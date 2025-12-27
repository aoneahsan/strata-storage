import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Mail,
  MessageSquare,
  Clock,
  Github,
  Linkedin,
  Globe,
  Send,
  CheckCircle2,
  AlertCircle,
  Phone,
  MapPin,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import analytics from '@/services/analytics';

export default function ContactPage() {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    name: '',
    email: user?.email || '',
    subject: '',
    message: '',
  });
  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('sending');

    // Track form submission attempt
    analytics.track('contact_form_submit', { subject: formData.subject });

    // Simulate sending (in production, this would send to an API or email service)
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // For now, open mailto link
    const mailtoLink = `mailto:aoneahsan@gmail.com?subject=${encodeURIComponent(
      formData.subject
    )}&body=${encodeURIComponent(
      `Name: ${formData.name}\nEmail: ${formData.email}\n\nMessage:\n${formData.message}`
    )}`;
    window.location.href = mailtoLink;

    setStatus('success');
    analytics.formSubmit('contact_form', true);
  };

  return (
    <div className="py-20">
      <div className="container mx-auto px-4 max-w-4xl">
        {/* Header */}
        <div className="text-center mb-12">
          <Mail className="h-16 w-16 mx-auto text-primary mb-4" />
          <h1 className="text-4xl font-bold mb-4">Contact Us</h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Have questions, feedback, or need support? We'd love to hear from you.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Contact Information */}
          <div className="lg:col-span-1 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Contact Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start gap-3">
                  <Mail className="h-5 w-5 text-primary mt-0.5" />
                  <div>
                    <p className="font-medium">Email</p>
                    <a
                      href="mailto:aoneahsan@gmail.com"
                      className="text-sm text-muted-foreground hover:text-primary"
                    >
                      aoneahsan@gmail.com
                    </a>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Phone className="h-5 w-5 text-primary mt-0.5" />
                  <div>
                    <p className="font-medium">WhatsApp</p>
                    <a
                      href="https://wa.me/923046619706"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-muted-foreground hover:text-primary"
                    >
                      +92 304 661 9706
                    </a>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Clock className="h-5 w-5 text-primary mt-0.5" />
                  <div>
                    <p className="font-medium">Response Time</p>
                    <p className="text-sm text-muted-foreground">Within 24-48 hours</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <MapPin className="h-5 w-5 text-primary mt-0.5" />
                  <div>
                    <p className="font-medium">Location</p>
                    <p className="text-sm text-muted-foreground">Pakistan</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Connect With Us</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <a
                  href="https://github.com/aoneahsan/strata-storage"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors"
                >
                  <Github className="h-5 w-5" />
                  <span>GitHub Repository</span>
                </a>
                <a
                  href="https://linkedin.com/in/aoneahsan"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors"
                >
                  <Linkedin className="h-5 w-5" />
                  <span>LinkedIn</span>
                </a>
                <a
                  href="https://aoneahsan.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors"
                >
                  <Globe className="h-5 w-5" />
                  <span>Personal Website</span>
                </a>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Quick Links</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Link
                  to="/feedback"
                  className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary"
                >
                  <MessageSquare className="h-4 w-4" />
                  Submit Feedback
                </Link>
                <Link
                  to="/code-access"
                  className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary"
                >
                  <Github className="h-4 w-4" />
                  Request Code Access
                </Link>
                <Link
                  to="/docs"
                  className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary"
                >
                  <Globe className="h-4 w-4" />
                  Documentation
                </Link>
              </CardContent>
            </Card>
          </div>

          {/* Contact Form */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Send a Message</CardTitle>
                <CardDescription>
                  Fill out the form below and we'll get back to you as soon as possible.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {status === 'success' ? (
                  <div className="text-center py-8">
                    <CheckCircle2 className="h-16 w-16 mx-auto text-green-500 mb-4" />
                    <h3 className="text-xl font-semibold mb-2">Message Sent!</h3>
                    <p className="text-muted-foreground mb-4">
                      Thank you for reaching out. We'll respond within 24-48 hours.
                    </p>
                    <Button variant="outline" onClick={() => setStatus('idle')}>
                      Send Another Message
                    </Button>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="name">Name *</Label>
                        <Input
                          id="name"
                          placeholder="Your name"
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="email">Email *</Label>
                        <Input
                          id="email"
                          type="email"
                          placeholder="your@email.com"
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="subject">Subject *</Label>
                      <Input
                        id="subject"
                        placeholder="What is this about?"
                        value={formData.subject}
                        onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="message">Message *</Label>
                      <Textarea
                        id="message"
                        placeholder="Tell us more..."
                        rows={6}
                        value={formData.message}
                        onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                        required
                      />
                    </div>

                    {status === 'error' && (
                      <div className="flex items-center gap-2 text-red-500 text-sm">
                        <AlertCircle className="h-4 w-4" />
                        <span>Failed to send message. Please try again.</span>
                      </div>
                    )}

                    <Button type="submit" className="w-full" disabled={status === 'sending'}>
                      {status === 'sending' ? (
                        'Sending...'
                      ) : (
                        <>
                          <Send className="h-4 w-4 mr-2" />
                          Send Message
                        </>
                      )}
                    </Button>
                  </form>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
