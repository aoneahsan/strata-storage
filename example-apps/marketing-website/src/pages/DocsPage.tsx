import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ExternalLink, BookOpen, Code2, Zap, Rocket } from 'lucide-react';

const quickStart = `import { Strata } from 'strata-storage';

// Create a storage instance
const storage = new Strata();

// Initialize (required before use)
await storage.initialize();

// Basic operations
await storage.set('key', 'value');
const value = await storage.get('key');
await storage.remove('key');
await storage.clear();`;

const advancedUsage = `// With options
await storage.set('user', userData, {
  encrypt: true,
  encryptionPassword: 'secret',
  compress: true,
  ttl: 3600000, // 1 hour
  tags: ['user', 'auth']
});

// Query by tags
const users = await storage.query({
  tags: { $in: ['user'] }
});

// Export data
const exported = await storage.export({
  pretty: true
});`;

const capacitorIntegration = `import { Strata } from 'strata-storage';
import { registerCapacitorAdapters } from 'strata-storage/capacitor';

const storage = new Strata();

// Register mobile adapters
await registerCapacitorAdapters(storage);

await storage.initialize();

// Now you have access to:
// - Preferences (UserDefaults / SharedPreferences)
// - Secure (Keychain / EncryptedSharedPreferences)
// - SQLite
// - Filesystem`;

const sections = [
  {
    icon: Rocket,
    title: 'Quick Start',
    description: 'Get up and running in seconds',
    code: quickStart,
  },
  {
    icon: Zap,
    title: 'Advanced Usage',
    description: 'Encryption, compression, TTL, and queries',
    code: advancedUsage,
  },
  {
    icon: Code2,
    title: 'Capacitor Integration',
    description: 'Enable mobile storage adapters',
    code: capacitorIntegration,
  },
];

export default function DocsPage() {
  return (
    <div className="py-20">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold mb-4">Documentation</h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Everything you need to get started with Strata Storage.
          </p>
          <div className="mt-6">
            <Button asChild>
              <a
                href="https://github.com/aoneahsan/strata-storage"
                target="_blank"
                rel="noopener noreferrer"
              >
                <BookOpen className="h-4 w-4 mr-2" />
                Full Documentation on GitHub
                <ExternalLink className="h-4 w-4 ml-2" />
              </a>
            </Button>
          </div>
        </div>

        <div className="space-y-8">
          {sections.map((section) => (
            <Card key={section.title}>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <section.icon className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle>{section.title}</CardTitle>
                    <CardDescription>{section.description}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <pre className="p-4 rounded-lg bg-muted text-sm overflow-x-auto">
                  <code>{section.code}</code>
                </pre>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* API Reference */}
        <section className="mt-16">
          <h2 className="text-2xl font-bold mb-8">API Reference</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { method: 'set(key, value, options?)', desc: 'Store a value' },
              { method: 'get(key, options?)', desc: 'Retrieve a value' },
              { method: 'remove(key)', desc: 'Delete a value' },
              { method: 'clear(options?)', desc: 'Clear storage' },
              { method: 'has(key)', desc: 'Check if key exists' },
              { method: 'keys(pattern?)', desc: 'Get all keys' },
              { method: 'query(condition)', desc: 'Query stored data' },
              { method: 'subscribe(callback)', desc: 'Listen for changes' },
              { method: 'getTTL(key)', desc: 'Get remaining TTL' },
              { method: 'export(options?)', desc: 'Export data as JSON' },
              { method: 'cleanupExpired()', desc: 'Remove expired items' },
              { method: 'close()', desc: 'Close storage instance' },
            ].map((item) => (
              <Card key={item.method}>
                <CardContent className="py-4">
                  <code className="text-sm font-semibold text-primary">{item.method}</code>
                  <p className="text-sm text-muted-foreground mt-1">{item.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Framework Integrations */}
        <section className="mt-16">
          <h2 className="text-2xl font-bold mb-8">Framework Integrations</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>React</CardTitle>
                <CardDescription>Custom hooks for React</CardDescription>
              </CardHeader>
              <CardContent>
                <pre className="p-3 rounded bg-muted text-xs overflow-x-auto">
                  <code>{`import { useStorage } from 'strata-storage/react';

const [value, setValue] = useStorage('key');`}</code>
                </pre>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Vue</CardTitle>
                <CardDescription>Composables for Vue 3</CardDescription>
              </CardHeader>
              <CardContent>
                <pre className="p-3 rounded bg-muted text-xs overflow-x-auto">
                  <code>{`import { useStorage } from 'strata-storage/vue';

const { value, set } = useStorage('key');`}</code>
                </pre>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Angular</CardTitle>
                <CardDescription>Injectable service</CardDescription>
              </CardHeader>
              <CardContent>
                <pre className="p-3 rounded bg-muted text-xs overflow-x-auto">
                  <code>{`import { StorageService } from 'strata-storage/angular';

constructor(private storage: StorageService) {}`}</code>
                </pre>
              </CardContent>
            </Card>
          </div>
        </section>
      </div>
    </div>
  );
}
