import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Database,
  Lock,
  Zap,
  RefreshCw,
  Search,
  Clock,
  Archive,
  Smartphone,
  Globe,
  Layers,
} from 'lucide-react';

const storageAdapters = [
  { name: 'Memory', desc: 'Fast in-memory storage for caching', platform: 'All' },
  { name: 'LocalStorage', desc: 'Persistent browser storage', platform: 'Web' },
  { name: 'SessionStorage', desc: 'Session-scoped browser storage', platform: 'Web' },
  { name: 'IndexedDB', desc: 'Large-scale browser database', platform: 'Web' },
  { name: 'Cookies', desc: 'Cookie-based storage', platform: 'Web' },
  { name: 'Cache API', desc: 'Service worker cache', platform: 'Web' },
  { name: 'Preferences', desc: 'UserDefaults / SharedPreferences', platform: 'Mobile' },
  { name: 'SQLite', desc: 'Full SQLite database support', platform: 'Mobile' },
  { name: 'Secure', desc: 'Keychain / EncryptedSharedPrefs', platform: 'Mobile' },
];

const features = [
  {
    icon: Lock,
    title: 'Encryption',
    description: 'AES-GCM encryption using Web Crypto API (web) and native crypto libraries (mobile). Zero external dependencies.',
    code: `await storage.set('secret', data, {
  encrypt: true,
  encryptionPassword: 'mySecretKey'
});`,
  },
  {
    icon: Archive,
    title: 'Compression',
    description: 'LZ-string based compression to reduce storage size. Pure JavaScript implementation with no dependencies.',
    code: `await storage.set('large', bigData, {
  compress: true
});`,
  },
  {
    icon: Clock,
    title: 'TTL Support',
    description: 'Automatic expiration with cleanup. Set sliding or fixed expiration times.',
    code: `await storage.set('session', token, {
  ttl: 3600000, // 1 hour
  sliding: true // Reset on access
});`,
  },
  {
    icon: Search,
    title: 'Query Engine',
    description: 'Advanced querying with operators ($lt, $gte, $regex), tags, and conditions.',
    code: `const results = await storage.query({
  $and: [
    { price: { $gte: 100 } },
    { inStock: true }
  ]
});`,
  },
  {
    icon: RefreshCw,
    title: 'Cross-Tab Sync',
    description: 'Real-time synchronization across browser tabs using BroadcastChannel API.',
    code: `storage.subscribe((change) => {
  console.log('Storage changed:', change);
});`,
  },
  {
    icon: Layers,
    title: 'Observer Pattern',
    description: 'Subscribe to storage changes with fine-grained control over what to watch.',
    code: `const unsubscribe = storage.subscribe(
  (change) => handleChange(change),
  { keys: ['user', 'settings'] }
);`,
  },
];

export default function FeaturesPage() {
  return (
    <div className="py-20">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold mb-4">Features</h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            A complete storage solution with everything you need for modern apps.
          </p>
        </div>

        {/* Storage Adapters */}
        <section className="mb-20">
          <div className="flex items-center gap-3 mb-8">
            <Database className="h-8 w-8 text-primary" />
            <h2 className="text-2xl font-bold">9 Storage Adapters</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {storageAdapters.map((adapter) => (
              <Card key={adapter.name}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{adapter.name}</CardTitle>
                    <span
                      className={`text-xs px-2 py-1 rounded-full ${
                        adapter.platform === 'All'
                          ? 'bg-green-500/10 text-green-500'
                          : adapter.platform === 'Web'
                            ? 'bg-blue-500/10 text-blue-500'
                            : 'bg-purple-500/10 text-purple-500'
                      }`}
                    >
                      {adapter.platform}
                    </span>
                  </div>
                </CardHeader>
                <CardContent>
                  <CardDescription>{adapter.desc}</CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Advanced Features */}
        <section className="mb-20">
          <div className="flex items-center gap-3 mb-8">
            <Zap className="h-8 w-8 text-primary" />
            <h2 className="text-2xl font-bold">Advanced Features</h2>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {features.map((feature) => (
              <Card key={feature.title} className="overflow-hidden">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <feature.icon className="h-5 w-5" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{feature.title}</CardTitle>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-muted-foreground">{feature.description}</p>
                  <pre className="p-4 rounded-lg bg-muted text-sm overflow-x-auto">
                    <code>{feature.code}</code>
                  </pre>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Platform Support */}
        <section>
          <div className="flex items-center gap-3 mb-8">
            <Globe className="h-8 w-8 text-primary" />
            <h2 className="text-2xl font-bold">Platform Support</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="h-5 w-5" />
                  Web
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>LocalStorage, SessionStorage</li>
                  <li>IndexedDB for large data</li>
                  <li>Cookie storage</li>
                  <li>Cache API</li>
                  <li>Memory storage</li>
                </ul>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Smartphone className="h-5 w-5" />
                  iOS
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>UserDefaults</li>
                  <li>Keychain for secure storage</li>
                  <li>SQLite database</li>
                  <li>FileManager</li>
                </ul>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Smartphone className="h-5 w-5" />
                  Android
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>SharedPreferences</li>
                  <li>EncryptedSharedPreferences</li>
                  <li>SQLite database</li>
                  <li>File storage</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </section>
      </div>
    </div>
  );
}
