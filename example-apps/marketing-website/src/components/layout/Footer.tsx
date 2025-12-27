import { Link } from 'react-router-dom';
import { Github, Linkedin, Mail, Globe } from 'lucide-react';

export function Footer() {
  return (
    <footer className="border-t bg-muted/50">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-5">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1 space-y-4">
            <Link to="/" className="flex items-center gap-2">
              <img src="/strata-logo.svg" alt="Strata Storage" className="h-8 w-8" />
              <span className="text-xl font-bold">Strata Storage</span>
            </Link>
            <p className="text-sm text-muted-foreground">
              Zero-dependency universal storage for web, Android, and iOS.
            </p>
            <div className="flex gap-4">
              <a
                href="https://github.com/aoneahsan/strata-storage"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground"
                aria-label="GitHub"
              >
                <Github className="h-5 w-5" />
              </a>
              <a
                href="https://linkedin.com/in/aoneahsan"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground"
                aria-label="LinkedIn"
              >
                <Linkedin className="h-5 w-5" />
              </a>
              <a
                href="mailto:aoneahsan@gmail.com"
                className="text-muted-foreground hover:text-foreground"
                aria-label="Email"
              >
                <Mail className="h-5 w-5" />
              </a>
              <a
                href="https://aoneahsan.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground"
                aria-label="Website"
              >
                <Globe className="h-5 w-5" />
              </a>
            </div>
          </div>

          {/* Product */}
          <div className="space-y-4">
            <h3 className="font-semibold">Product</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/features" className="text-muted-foreground hover:text-foreground">
                  Features
                </Link>
              </li>
              <li>
                <Link to="/docs" className="text-muted-foreground hover:text-foreground">
                  Documentation
                </Link>
              </li>
              <li>
                <a
                  href="https://www.npmjs.com/package/strata-storage"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-foreground"
                >
                  NPM Package
                </a>
              </li>
              <li>
                <Link to="/about" className="text-muted-foreground hover:text-foreground">
                  About
                </Link>
              </li>
            </ul>
          </div>

          {/* Community */}
          <div className="space-y-4">
            <h3 className="font-semibold">Community</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/code-access" className="text-muted-foreground hover:text-foreground">
                  Code Access
                </Link>
              </li>
              <li>
                <Link to="/feedback" className="text-muted-foreground hover:text-foreground">
                  Feedback
                </Link>
              </li>
              <li>
                <Link to="/contact" className="text-muted-foreground hover:text-foreground">
                  Contact Us
                </Link>
              </li>
              <li>
                <a
                  href="https://github.com/aoneahsan/strata-storage/issues"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-foreground"
                >
                  Report Issues
                </a>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div className="space-y-4">
            <h3 className="font-semibold">Legal</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/privacy" className="text-muted-foreground hover:text-foreground">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link to="/terms" className="text-muted-foreground hover:text-foreground">
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link to="/cookies" className="text-muted-foreground hover:text-foreground">
                  Cookie Policy
                </Link>
              </li>
              <li>
                <Link to="/gdpr-rights" className="text-muted-foreground hover:text-foreground">
                  GDPR Rights
                </Link>
              </li>
            </ul>
          </div>

          {/* Data & Account */}
          <div className="space-y-4">
            <h3 className="font-semibold">Your Data</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/data-deletion" className="text-muted-foreground hover:text-foreground">
                  Data Deletion
                </Link>
              </li>
              <li>
                <Link to="/account-deletion" className="text-muted-foreground hover:text-foreground">
                  Delete Account
                </Link>
              </li>
              <li>
                <Link to="/sitemap" className="text-muted-foreground hover:text-foreground">
                  Sitemap
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 border-t pt-8 text-center text-sm text-muted-foreground">
          <p>
            &copy; {new Date().getFullYear()} Strata Storage. Built by{' '}
            <a
              href="https://aoneahsan.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              Ahsan Mahmood
            </a>
            . Apache 2.0 License.
          </p>
          <p className="mt-2">v2.4.1</p>
        </div>
      </div>
    </footer>
  );
}
