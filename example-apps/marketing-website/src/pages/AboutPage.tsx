import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  User,
  Code2,
  Globe,
  Zap,
  Database,
  Lock,
  Github,
  Linkedin,
  Mail,
  ExternalLink,
  Package,
  CheckCircle2,
} from 'lucide-react';

export default function AboutPage() {
  return (
    <div className="py-20">
      <div className="container mx-auto px-4 max-w-4xl">
        {/* Hero */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-primary/10 mb-6">
            <Package className="h-12 w-12 text-primary" />
          </div>
          <h1 className="text-4xl font-bold mb-4">About Strata Storage</h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            A zero-dependency universal storage library providing a unified API for web, Android,
            and iOS applications.
          </p>
        </div>

        <div className="space-y-8">
          {/* Project Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Code2 className="h-5 w-5" />
                Project Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold text-sm text-muted-foreground mb-2">Package Name</h4>
                  <p className="font-mono">strata-storage</p>
                </div>
                <div>
                  <h4 className="font-semibold text-sm text-muted-foreground mb-2">Current Version</h4>
                  <p className="font-mono">v2.4.1</p>
                </div>
                <div>
                  <h4 className="font-semibold text-sm text-muted-foreground mb-2">License</h4>
                  <p>Apache 2.0 (Open Source)</p>
                </div>
                <div>
                  <h4 className="font-semibold text-sm text-muted-foreground mb-2">Language</h4>
                  <p>TypeScript / JavaScript</p>
                </div>
                <div>
                  <h4 className="font-semibold text-sm text-muted-foreground mb-2">Dependencies</h4>
                  <p className="text-green-500 font-semibold">Zero Runtime Dependencies</p>
                </div>
                <div>
                  <h4 className="font-semibold text-sm text-muted-foreground mb-2">Platforms</h4>
                  <p>Web, Android, iOS</p>
                </div>
              </div>

              <div className="mt-6 flex flex-wrap gap-3">
                <Button variant="outline" asChild>
                  <a
                    href="https://www.npmjs.com/package/strata-storage"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Package className="h-4 w-4 mr-2" />
                    NPM Package
                    <ExternalLink className="h-3 w-3 ml-2" />
                  </a>
                </Button>
                <Button variant="outline" asChild>
                  <a
                    href="https://github.com/aoneahsan/strata-storage"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Github className="h-4 w-4 mr-2" />
                    GitHub
                    <ExternalLink className="h-3 w-3 ml-2" />
                  </a>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Mission */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                Our Mission
              </CardTitle>
            </CardHeader>
            <CardContent className="prose prose-sm dark:prose-invert max-w-none">
              <p>
                Strata Storage was created to solve a common challenge in cross-platform
                development: managing data storage across different platforms with a single,
                consistent API.
              </p>
              <p>
                Instead of learning and managing multiple storage APIs for web browsers, iOS, and
                Android, developers can use one unified interface that works identically across
                all platforms.
              </p>
              <p>Our core principles:</p>
              <ul>
                <li>
                  <strong>Zero Dependencies:</strong> No runtime dependencies means smaller bundle
                  size and fewer security vulnerabilities
                </li>
                <li>
                  <strong>Universal API:</strong> Write once, run anywhere with identical behavior
                </li>
                <li>
                  <strong>Developer Experience:</strong> Simple, intuitive, Promise-based API
                </li>
                <li>
                  <strong>Full-Featured:</strong> Encryption, compression, TTL, queries, and more
                  built-in
                </li>
              </ul>
            </CardContent>
          </Card>

          {/* Key Features */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                Key Features
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  {
                    icon: Database,
                    title: '9 Storage Adapters',
                    desc: 'Memory, LocalStorage, IndexedDB, SQLite, Keychain, and more',
                  },
                  {
                    icon: Lock,
                    title: 'Built-in Encryption',
                    desc: 'AES-GCM encryption using Web Crypto API and native crypto',
                  },
                  {
                    icon: Zap,
                    title: 'Compression',
                    desc: 'LZ-string based compression to reduce storage size',
                  },
                  {
                    icon: Globe,
                    title: 'Cross-Tab Sync',
                    desc: 'Real-time synchronization across browser tabs',
                  },
                ].map((feature) => (
                  <div key={feature.title} className="flex gap-3 p-4 rounded-lg bg-muted/50">
                    <feature.icon className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-semibold">{feature.title}</h4>
                      <p className="text-sm text-muted-foreground">{feature.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 text-center">
                <Button variant="outline" asChild>
                  <Link to="/features">View All Features</Link>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Supported Frameworks */}
          <Card>
            <CardHeader>
              <CardTitle>Supported Frameworks</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {['React', 'Vue', 'Angular', 'Capacitor', 'Ionic'].map((framework) => (
                  <div
                    key={framework}
                    className="flex items-center justify-center gap-2 p-4 rounded-lg bg-muted/50"
                  >
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    <span className="font-medium">{framework}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Developer */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Developer
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col md:flex-row gap-6">
                <div className="flex-shrink-0">
                  <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="h-12 w-12 text-primary" />
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold mb-2">Ahsan Mahmood</h3>
                  <p className="text-muted-foreground mb-4">
                    Full-stack developer specializing in cross-platform mobile and web development.
                    Passionate about creating developer tools that simplify complex problems.
                  </p>
                  <div className="flex flex-wrap gap-3">
                    <Button variant="outline" size="sm" asChild>
                      <a href="mailto:aoneahsan@gmail.com">
                        <Mail className="h-4 w-4 mr-2" />
                        Email
                      </a>
                    </Button>
                    <Button variant="outline" size="sm" asChild>
                      <a
                        href="https://linkedin.com/in/aoneahsan"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Linkedin className="h-4 w-4 mr-2" />
                        LinkedIn
                      </a>
                    </Button>
                    <Button variant="outline" size="sm" asChild>
                      <a
                        href="https://github.com/aoneahsan"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Github className="h-4 w-4 mr-2" />
                        GitHub
                      </a>
                    </Button>
                    <Button variant="outline" size="sm" asChild>
                      <a href="https://aoneahsan.com" target="_blank" rel="noopener noreferrer">
                        <Globe className="h-4 w-4 mr-2" />
                        Website
                      </a>
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* CTA */}
          <Card className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white">
            <CardContent className="py-8 text-center">
              <h3 className="text-2xl font-bold mb-4">Ready to Get Started?</h3>
              <p className="mb-6 text-white/80">
                Install Strata Storage and start building cross-platform apps today.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button variant="secondary" asChild>
                  <a
                    href="https://www.npmjs.com/package/strata-storage"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Install Now
                  </a>
                </Button>
                <Button
                  variant="outline"
                  className="border-white text-white hover:bg-white/10"
                  asChild
                >
                  <Link to="/docs">Read the Docs</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
