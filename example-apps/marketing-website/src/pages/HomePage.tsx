import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Zap,
  Smartphone,
  Globe,
  Database,
  Lock,
  RefreshCw,
  Search,
  Code2,
  ArrowRight,
  CheckCircle2,
} from 'lucide-react';

const features = [
  {
    icon: Zap,
    title: 'Zero Dependencies',
    description: 'No runtime dependencies. Pure TypeScript implementation.',
  },
  {
    icon: Globe,
    title: 'Universal API',
    description: 'One API works identically across web, Android, and iOS.',
  },
  {
    icon: Database,
    title: '9 Storage Adapters',
    description: 'Memory, LocalStorage, IndexedDB, SQLite, Keychain, and more.',
  },
  {
    icon: Lock,
    title: 'Built-in Encryption',
    description: 'AES-GCM encryption using Web Crypto API and native crypto.',
  },
  {
    icon: RefreshCw,
    title: 'Cross-Tab Sync',
    description: 'Real-time synchronization across browser tabs.',
  },
  {
    icon: Search,
    title: 'Query Engine',
    description: 'Advanced queries with operators, tags, and regex support.',
  },
];

const platforms = [
  { name: 'React', color: 'from-cyan-500 to-blue-500' },
  { name: 'Vue', color: 'from-green-500 to-emerald-500' },
  { name: 'Angular', color: 'from-red-500 to-pink-500' },
  { name: 'Capacitor', color: 'from-blue-500 to-indigo-500' },
  { name: 'Ionic', color: 'from-indigo-500 to-purple-500' },
];

const codeExample = `import { Strata } from 'strata-storage';

const storage = new Strata();
await storage.initialize();

// Basic operations
await storage.set('user', { name: 'John' });
const user = await storage.get('user');

// With encryption
await storage.set('secret', data, {
  encrypt: true,
  encryptionPassword: 'myPassword'
});

// With TTL
await storage.set('session', token, {
  ttl: 3600000 // 1 hour
});`;

export default function HomePage() {
  return (
    <div>
      {/* Hero Section */}
      <section className="relative overflow-hidden py-20 md:py-32">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 via-purple-500/10 to-pink-500/10" />
        <div className="container mx-auto px-4 relative">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 rounded-full border bg-muted/50 px-4 py-1.5 mb-8">
              <span className="animate-pulse-glow h-2 w-2 rounded-full bg-green-500" />
              <span className="text-sm">v2.4.1 Available</span>
            </div>

            <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight mb-6">
              <span className="gradient-text">Universal Storage</span>
              <br />
              for Web & Mobile
            </h1>

            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Zero-dependency storage library with a unified API for all platforms. One codebase,
              every platform.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="xl" variant="gradient" asChild>
                <a
                  href="https://www.npmjs.com/package/strata-storage"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Get Started
                  <ArrowRight className="h-5 w-5" />
                </a>
              </Button>
              <Button size="xl" variant="outline" asChild>
                <Link to="/docs">Documentation</Link>
              </Button>
            </div>

            <div className="mt-8 flex items-center justify-center gap-6 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <span>Zero Dependencies</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <span>TypeScript</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <span>Apache 2.0</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Install Section */}
      <section className="py-8 border-y bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-center gap-4">
            <span className="text-muted-foreground">Install with:</span>
            <code className="px-4 py-2 rounded-lg bg-background border font-mono text-sm">
              pnpm add strata-storage
            </code>
            <span className="text-muted-foreground">or</span>
            <code className="px-4 py-2 rounded-lg bg-background border font-mono text-sm">
              npm install strata-storage
            </code>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Everything You Need</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              A complete storage solution with encryption, compression, TTL, and cross-platform
              support.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature) => (
              <Card key={feature.title} className="group hover:border-primary/50 transition-colors">
                <CardHeader>
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary mb-4 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                    <feature.icon className="h-6 w-6" />
                  </div>
                  <CardTitle className="text-xl">{feature.title}</CardTitle>
                  <CardDescription>{feature.description}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Code Example */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold mb-4">Simple, Intuitive API</h2>
              <p className="text-muted-foreground mb-6">
                Get started in seconds with a clean, Promise-based API. Works identically across all
                platforms.
              </p>
              <ul className="space-y-3">
                {[
                  'Automatic serialization of complex objects',
                  'Built-in encryption with password protection',
                  'TTL support with automatic cleanup',
                  'Tag-based organization and querying',
                  'Cross-tab synchronization',
                ].map((item) => (
                  <li key={item} className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="relative">
              <div className="absolute -inset-4 bg-gradient-to-r from-indigo-500/20 via-purple-500/20 to-pink-500/20 rounded-xl blur-xl" />
              <Card className="relative overflow-hidden">
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2">
                    <Code2 className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">example.ts</span>
                  </div>
                </CardHeader>
                <CardContent>
                  <pre className="text-sm overflow-x-auto">
                    <code className="text-foreground">{codeExample}</code>
                  </pre>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Platform Support */}
      <section className="py-20">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-4">Works Everywhere</h2>
          <p className="text-muted-foreground mb-12 max-w-2xl mx-auto">
            First-class integrations for all major frameworks and platforms.
          </p>

          <div className="flex flex-wrap justify-center gap-4">
            {platforms.map((platform) => (
              <div
                key={platform.name}
                className="flex items-center gap-2 px-6 py-3 rounded-full bg-muted/50 border"
              >
                <Smartphone className="h-5 w-5" />
                <span className="font-medium">{platform.name}</span>
              </div>
            ))}
          </div>

          <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-3xl mx-auto">
            <Card className="text-center">
              <CardHeader>
                <CardTitle className="text-4xl font-bold text-primary">0</CardTitle>
                <CardDescription>Runtime Dependencies</CardDescription>
              </CardHeader>
            </Card>
            <Card className="text-center">
              <CardHeader>
                <CardTitle className="text-4xl font-bold text-primary">9</CardTitle>
                <CardDescription>Storage Adapters</CardDescription>
              </CardHeader>
            </Card>
            <Card className="text-center">
              <CardHeader>
                <CardTitle className="text-4xl font-bold text-primary">3</CardTitle>
                <CardDescription>Platforms Supported</CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600">
        <div className="container mx-auto px-4 text-center text-white">
          <h2 className="text-3xl font-bold mb-4">Ready to Get Started?</h2>
          <p className="text-white/80 mb-8 max-w-xl mx-auto">
            Join developers building cross-platform apps with Strata Storage.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" variant="secondary" asChild>
              <a
                href="https://www.npmjs.com/package/strata-storage"
                target="_blank"
                rel="noopener noreferrer"
              >
                Install Now
              </a>
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="border-white text-white hover:bg-white/10"
              asChild
            >
              <Link to="/docs">Read the Docs</Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
