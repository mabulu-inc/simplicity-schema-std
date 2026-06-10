// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

// https://astro.build/config
export default defineConfig({
  site: 'https://mabulu-inc.github.io',
  base: '/simplicity-schema-std',
  integrations: [
    starlight({
      title: 'simplicity-schema-std',
      social: [
        {
          icon: 'github',
          label: 'GitHub',
          href: 'https://github.com/mabulu-inc/simplicity-schema-std',
        },
      ],
      sidebar: [
        {
          label: 'Getting started',
          items: [
            { label: 'Introduction', slug: 'getting-started/introduction' },
            { label: 'Quick start', slug: 'getting-started/quick-start' },
            { label: 'Parameters', slug: 'getting-started/parameters' },
          ],
        },
        {
          label: 'Mixins',
          items: [
            { label: 'audit', slug: 'mixins/audit' },
            { label: 'timestamps', slug: 'mixins/timestamps' },
            { label: 'soft_delete', slug: 'mixins/soft-delete' },
            { label: 'audit_log', slug: 'mixins/audit-log' },
            { label: 'audit_log_actor', slug: 'mixins/audit-log-actor' },
          ],
        },
        {
          label: 'Functions',
          items: [
            { label: 'audit_stamp', slug: 'functions/audit-stamp' },
            { label: 'audit_diff', slug: 'functions/audit-diff' },
            { label: 'audit_skip_noop', slug: 'functions/audit-skip-noop' },
            { label: 'timestamps_stamp', slug: 'functions/timestamps-stamp' },
            { label: 'audit_backfill_by', slug: 'functions/audit-backfill-by' },
          ],
        },
        {
          label: 'Tables',
          items: [{ label: 'audit_log', slug: 'tables/audit-log' }],
        },
        {
          label: 'Guides',
          items: [
            { label: 'Bootstrap & seeding', slug: 'guides/bootstrap-seeding' },
            { label: 'Releasing', slug: 'guides/releasing' },
          ],
        },
      ],
    }),
  ],
});
