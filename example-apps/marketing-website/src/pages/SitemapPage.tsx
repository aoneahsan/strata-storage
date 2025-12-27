import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Home,
  Zap,
  BookOpen,
  MessageSquare,
  LayoutDashboard,
  Code2,
  Shield,
  FileText,
  Map,
  Search,
} from 'lucide-react';

const pages = [
  {
    category: 'Main',
    items: [
      { href: '/', title: 'Home', desc: 'Landing page with features overview', icon: Home, tags: ['home', 'landing', 'features'] },
      { href: '/features', title: 'Features', desc: 'Detailed feature documentation', icon: Zap, tags: ['features', 'adapters', 'encryption'] },
      { href: '/docs', title: 'Documentation', desc: 'Getting started and API reference', icon: BookOpen, tags: ['docs', 'api', 'guide', 'tutorial'] },
    ],
  },
  {
    category: 'Community',
    items: [
      { href: '/feedback', title: 'Feedback', desc: 'Submit feedback, issues, or reviews', icon: MessageSquare, tags: ['feedback', 'issues', 'review', 'feature request'] },
      { href: '/code-access', title: 'Code Access', desc: 'Request repository access', icon: Code2, tags: ['github', 'repository', 'contribute', 'open source'] },
    ],
  },
  {
    category: 'Account',
    items: [
      { href: '/login', title: 'Login', desc: 'Sign in or create an account', icon: Shield, tags: ['login', 'signin', 'signup', 'account'] },
      { href: '/dashboard', title: 'Dashboard', desc: 'View your submissions', icon: LayoutDashboard, tags: ['dashboard', 'submissions', 'profile'] },
    ],
  },
  {
    category: 'Legal',
    items: [
      { href: '/privacy', title: 'Privacy Policy', desc: 'How we handle your data', icon: Shield, tags: ['privacy', 'data', 'gdpr'] },
      { href: '/terms', title: 'Terms of Service', desc: 'Usage terms and conditions', icon: FileText, tags: ['terms', 'license', 'legal'] },
      { href: '/sitemap', title: 'Sitemap', desc: 'Browse all pages', icon: Map, tags: ['sitemap', 'navigation', 'pages'] },
    ],
  },
];

export default function SitemapPage() {
  const [search, setSearch] = useState('');

  const filteredPages = pages.map((category) => ({
    ...category,
    items: category.items.filter(
      (item) =>
        item.title.toLowerCase().includes(search.toLowerCase()) ||
        item.desc.toLowerCase().includes(search.toLowerCase()) ||
        item.tags.some((tag) => tag.toLowerCase().includes(search.toLowerCase()))
    ),
  })).filter((category) => category.items.length > 0);

  return (
    <div className="py-20">
      <div className="container mx-auto px-4 max-w-4xl">
        <div className="text-center mb-12">
          <Map className="h-12 w-12 mx-auto text-primary mb-4" />
          <h1 className="text-4xl font-bold mb-4">Sitemap</h1>
          <p className="text-muted-foreground mb-8">
            Find any page on the Strata Storage website.
          </p>

          <div className="relative max-w-md mx-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search pages..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <div className="space-y-8">
          {filteredPages.map((category) => (
            <div key={category.category}>
              <h2 className="text-lg font-semibold mb-4 text-muted-foreground">
                {category.category}
              </h2>
              <div className="grid gap-4 md:grid-cols-2">
                {category.items.map((page) => (
                  <Link key={page.href} to={page.href}>
                    <Card className="h-full hover:border-primary/50 transition-colors">
                      <CardHeader className="pb-2">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                            <page.icon className="h-5 w-5" />
                          </div>
                          <CardTitle className="text-lg">{page.title}</CardTitle>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <CardDescription>{page.desc}</CardDescription>
                        <div className="flex flex-wrap gap-1 mt-3">
                          {page.tags.map((tag) => (
                            <span
                              key={tag}
                              className="text-xs px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>

        {filteredPages.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No pages found matching "{search}"</p>
          </div>
        )}
      </div>
    </div>
  );
}
