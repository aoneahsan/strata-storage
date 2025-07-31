/**
 * Creating a sidebar enables you to:
 - create an ordered group of docs
 - render a sidebar for each doc of that group
 - provide next/previous navigation

 The sidebars can be generated from the filesystem, or explicitly defined here.

 Create as many sidebars as you want.
 */

// @ts-check

/** @type {import('@docusaurus/plugin-content-docs').SidebarsConfig} */
const sidebars = {
  // By default, Docusaurus generates a sidebar from the docs folder structure
  tutorialSidebar: [
    'intro',
    'installation',
    'quick-start',
    {
      type: 'category',
      label: 'Guides',
      items: [
        'guides/basic-usage',
        'guides/encryption',
        'guides/compression',
        'guides/ttl',
        'guides/querying',
        'guides/sync',
        'guides/migration',
        'guides/capacitor',
      ],
    },
    {
      type: 'category',
      label: 'Framework Integration',
      items: [
        'frameworks/react',
        'frameworks/vue',
        'frameworks/angular',
        'frameworks/vanilla',
      ],
    },
    {
      type: 'category',
      label: 'Storage Adapters',
      items: [
        'adapters/overview',
        'adapters/memory',
        'adapters/localstorage',
        'adapters/indexeddb',
        'adapters/sqlite',
        'adapters/preferences',
        'adapters/secure',
      ],
    },
    {
      type: 'category',
      label: 'API Reference',
      items: [
        'api/core',
        'api/types',
        'api/adapters',
        'api/features',
        'api/errors',
      ],
    },
    {
      type: 'category',
      label: 'Advanced',
      items: [
        'advanced/custom-adapters',
        'advanced/performance',
        'advanced/security',
        'advanced/debugging',
      ],
    },
  ],
};

module.exports = sidebars;