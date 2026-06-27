// @ts-check
// Docusaurus 3 configuration for the Strata Storage documentation site.

const { themes } = require('prism-react-renderer');
const lightCodeTheme = themes.github;
const darkCodeTheme = themes.dracula;

const SITE_URL = 'https://stratastorage-docs.aoneahsan.com';
const MARKETING_URL = 'https://stratastorage.aoneahsan.com';
const GITHUB_URL = 'https://github.com/aoneahsan/strata-storage';
const NPM_URL = 'https://www.npmjs.com/package/strata-storage';

/** @type {import('@docusaurus/types').Config} */
const config = {
  title: 'Strata Storage',
  tagline:
    'Zero-dependency universal storage for web, Android, and iOS — one unified API',
  favicon: 'img/favicon.svg',

  url: SITE_URL,
  baseUrl: '/',

  organizationName: 'aoneahsan',
  projectName: 'strata-storage',

  // The docs link graph is clean — fail the build on any broken link/anchor so a
  // broken doc can never ship "green" again.
  onBrokenLinks: 'throw',
  onBrokenAnchors: 'throw',

  trailingSlash: false,

  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  markdown: {
    // Parse `.md` as CommonMark (not MDX) so TypeScript generics like
    // `Map<K, V>` and `{ ... }` object literals in prose don't break compilation.
    format: 'detect',
    hooks: {
      onBrokenMarkdownLinks: 'throw',
    },
  },

  presets: [
    [
      'classic',
      /** @type {import('@docusaurus/preset-classic').Options} */
      ({
        docs: {
          path: '../docs',
          routeBasePath: '/',
          sidebarPath: require.resolve('./sidebars.js'),
          editUrl: 'https://github.com/aoneahsan/strata-storage/edit/main/docs/',
          showLastUpdateTime: true,
        },
        blog: false,
        theme: {
          customCss: require.resolve('./src/css/custom.css'),
        },
        sitemap: {
          lastmod: 'date',
          changefreq: 'weekly',
          priority: 0.5,
          filename: 'sitemap.xml',
        },
      }),
    ],
  ],

  headTags: [
    {
      tagName: 'link',
      attributes: { rel: 'canonical', href: `${SITE_URL}/` },
    },
    {
      tagName: 'script',
      attributes: { type: 'application/ld+json' },
      innerHTML: JSON.stringify({
        '@context': 'https://schema.org',
        '@graph': [
          {
            '@type': 'WebSite',
            '@id': `${SITE_URL}/#website`,
            url: `${SITE_URL}/`,
            name: 'Strata Storage Documentation',
            description:
              'Documentation for Strata Storage, a zero-dependency universal storage library with one unified API across web, Android, and iOS.',
            publisher: { '@id': `${SITE_URL}/#organization` },
            inLanguage: 'en',
          },
          {
            '@type': 'Organization',
            '@id': `${SITE_URL}/#organization`,
            name: 'Strata Storage Team',
            url: 'https://aoneahsan.com',
            email: 'aoneahsan@gmail.com',
            sameAs: [GITHUB_URL, NPM_URL, 'https://linkedin.com/in/aoneahsan'],
            contactPoint: {
              '@type': 'ContactPoint',
              email: 'aoneahsan@gmail.com',
              contactType: 'developer support',
            },
          },
          {
            '@type': 'SoftwareSourceCode',
            '@id': `${SITE_URL}/#software`,
            name: 'Strata Storage',
            description:
              'Zero-dependency universal storage plugin providing a unified API for all storage operations across web, Android, and iOS — localStorage, IndexedDB, cookies, Cache API, SQLite, Preferences, and Keychain/Keystore, plus encryption, compression, TTL, querying, and cross-tab sync.',
            codeRepository: GITHUB_URL,
            programmingLanguage: ['TypeScript', 'Swift', 'Java'],
            runtimePlatform: ['Web', 'Android', 'iOS', 'Capacitor'],
            license: 'https://opensource.org/license/mit',
            author: {
              '@type': 'Person',
              name: 'Ahsan Mahmood',
              url: 'https://aoneahsan.com',
              email: 'aoneahsan@gmail.com',
            },
            url: NPM_URL,
            sameAs: [GITHUB_URL, NPM_URL],
            keywords:
              'storage, capacitor, ionic, react, vue, angular, localStorage, indexedDB, sqlite, keychain, preferences, zero-dependencies, cross-platform',
          },
        ],
      }),
    },
  ],

  themeConfig:
    /** @type {import('@docusaurus/preset-classic').ThemeConfig} */
    ({
      image: 'img/social-card.png',
      metadata: [
        {
          name: 'keywords',
          content:
            'strata storage, universal storage, capacitor storage, indexeddb, sqlite, keychain, encryption, ttl, cross-platform storage, zero dependency storage',
        },
        {
          name: 'description',
          content:
            'Strata Storage is a zero-dependency universal storage library with one unified async/sync API across web, Android, and iOS.',
        },
        { name: 'twitter:card', content: 'summary_large_image' },
        { property: 'og:type', content: 'website' },
      ],
      colorMode: {
        defaultMode: 'light',
        respectPrefersColorScheme: true,
      },
      navbar: {
        title: 'Strata Storage',
        logo: {
          alt: 'Strata Storage logo',
          src: 'img/logo.svg',
        },
        items: [
          {
            type: 'docSidebar',
            sidebarId: 'tutorialSidebar',
            position: 'left',
            label: 'Documentation',
          },
          { to: '/quick-start', label: 'Quick Start', position: 'left' },
          { to: '/api', label: 'API', position: 'left' },
          { to: '/ai', label: 'For AI', position: 'left' },
          { href: MARKETING_URL, label: 'Website', position: 'right' },
          { href: NPM_URL, label: 'npm', position: 'right' },
        ],
      },
      footer: {
        style: 'dark',
        links: [
          {
            title: 'Docs',
            items: [
              { label: 'Introduction', to: '/' },
              { label: 'Installation', to: '/installation' },
              { label: 'Quick Start', to: '/quick-start' },
              { label: 'API Reference', to: '/api' },
              { label: 'For AI Agents', to: '/ai' },
            ],
          },
          {
            title: 'Support',
            items: [
              { label: 'Website', href: MARKETING_URL },
              { label: 'Contact / Support', href: `${MARKETING_URL}/contact` },
              { label: 'Email', href: 'mailto:aoneahsan@gmail.com' },
              { label: 'Feedback', href: `${MARKETING_URL}/feedback` },
            ],
          },
          {
            title: 'More',
            items: [
              { label: 'npm', href: NPM_URL },
              { label: 'Developer', href: 'https://aoneahsan.com' },
            ],
          },
        ],
        copyright: `Developed with ❤️ by the Strata Storage Team · Maintained by <a href="https://aoneahsan.com" target="_blank" rel="noopener">Ahsan Mahmood</a> · © ${new Date().getFullYear()} · Built with Docusaurus`,
      },
      prism: {
        theme: lightCodeTheme,
        darkTheme: darkCodeTheme,
        additionalLanguages: ['swift', 'kotlin', 'java', 'bash', 'json'],
      },
    }),
};

module.exports = config;
