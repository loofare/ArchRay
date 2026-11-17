/**
 * Generate the bundled brand icon registry from @iconify-json/logos.
 * Build-time only; the viewer imports the generated data and stays offline.
 */
import { createRequire } from 'node:module';
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const require = createRequire(import.meta.url);
const { icons } = require('@iconify-json/logos/icons.json');

// slug -> extra aliases (the title and slug are matched automatically)
const CATALOG = {
  react: ['reactjs', 'react.js', 'react native', 'reactnative'],
  vue: ['vuejs', 'vue.js'],
  'angular-icon': ['angular', 'angularjs'],
  'svelte-icon': ['svelte', 'sveltekit'],
  'nextjs-icon': ['next', 'next.js'],
  'nuxt-icon': ['nuxt', 'nuxtjs'],
  'astro-icon': ['astro'],
  'tailwindcss-icon': ['tailwind', 'tailwind css'],
  'typescript-icon': ['ts'],
  javascript: ['js'],
  'html-5': ['html', 'html5'],
  'css-3': ['css', 'css3'],
  'vite-icon': ['vite', 'vitejs'],
  redux: ['reduxjs'],
  flutter: [],
  swift: [],
  'kotlin-icon': ['kotlin'],
  dart: [],
  sass: ['scss'],
  webpack: [],
  'nodejs-icon': ['node', 'node.js'],
  deno: [],
  bun: [],
  python: ['py'],
  'django-icon': ['django'],
  flask: [],
  'fastapi-icon': ['fastapi'],
  go: ['golang'],
  rust: ['rustlang'],
  ruby: [],
  rails: ['rubyonrails', 'ruby on rails'],
  php: [],
  laravel: [],
  dotnet: ['.net', 'net'],
  java: ['openjdk', 'jdk'],
  spring: ['springboot', 'spring boot'],
  nestjs: ['nest.js'],
  typeorm: [],
  passport: [],
  jwt: ['jsonwebtoken'],
  kong: [],
  phoenix: ['phoenixframework'],
  graphql: [],
  trpc: [],
  grpc: [],
  postgresql: ['postgres', 'psql', 'pg'],
  mysql: [],
  mariadb: [],
  sqlite: ['sqlite3'],
  'mongodb-icon': ['mongo', 'mongodb'],
  redis: [],
  elasticsearch: ['elastic', 'es'],
  snowflake: [],
  cassandra: ['apachecassandra'],
  'supabase-icon': ['supabase'],
  firebase: [],
  prisma: [],
  'kafka-icon': ['kafka', 'apache kafka'],
  'rabbitmq-icon': ['rabbitmq', 'rabbit mq'],
  'nats-icon': ['nats'],
  aws: ['amazon', 'amazon web services', 'amazonwebservices', 's3', 'ec2', 'lambda'],
  azure: ['microsoft azure', 'microsoftazure'],
  'google-cloud': ['gcp', 'googlecloud', 'google cloud platform'],
  cloudflare: ['cf'],
  'vercel-icon': ['vercel'],
  netlify: [],
  docker: [],
  kubernetes: ['k8s'],
  'terraform-icon': ['terraform', 'hcl'],
  ansible: [],
  nginx: [],
  'github-actions': ['gha', 'github actions'],
  prometheus: [],
  grafana: [],
  datadog: [],
  'sentry-icon': ['sentry'],
  'linux-tux': ['linux'],
  ubuntu: [],
  openai: ['open ai', 'chatgpt', 'gpt'],
  anthropic: ['claude'],
  'hugging-face': ['huggingface', 'hf'],
  langchain: [],
  ollama: [],
  pytorch: ['torch'],
  tensorflow: ['tf'],
  numpy: [],
  pandas: [],
  'google-gemini': ['gemini', 'bard'],
  'mistral-ai': ['mistral', 'mistralai'],
  groq: [],
  stripe: [],
  clerk: [],
  auth0: [],
  okta: [],
  twilio: [],
  sendgrid: [],
  shopify: [],
  salesforce: [],
  hubspot: [],
  notion: [],
  slack: [],
  discord: [],
  figma: [],
  zendesk: [],
  intercom: [],
  android: [],
  apple: [],
  expo: [],
  ionic: [],
  git: [],
  github: [],
  gitlab: [],
  bitbucket: [],
  postman: [],
  insomnia: [],
  eslint: [],
  prettier: [],
  vitest: [],
  jest: [],
  playwright: [],
  cypress: [],
  storybook: [],
  express: ['expressjs'],
  nx: ['nxjs', 'nrwl'],
  'drizzle-orm-icon': ['drizzle orm', 'drizzle-orm', 'drizzle'],
  hono: ['honojs'],
  fastify: ['fastifyjs'],
  koa: ['koajs'],
  pnpm: [],
  yarn: [],
  npm: [],
  turborepo: ['turbo'],
  helm: [],
  envoy: [],
  argo: ['argocd', 'argo cd'],
  jenkins: [],
  pulumi: [],
  'opentelemetry-icon': ['opentelemetry', 'otel'],
  splunk: [],
  vault: ['hashicorp vault'],
  snyk: [],
  sonarqube: ['sonar', 'sonar qube'],
  paypal: [],
  square: [],
  resend: [],
  segment: [],
  mixpanel: [],
  amplitude: [],
  pagerduty: [],
  launchdarkly: ['ld'],
  temporal: ['temporal.io'],
  dbt: ['data build tool'],
  airflow: ['apache airflow'],
  spark: ['apache spark'],
  databricks: [],
  neo4j: [],
  influxdb: ['influx'],
  pinecone: [],
  weaviate: [],
  qdrant: [],
  strapi: [],
  typeorm: [],
  sequelize: [],
  zoom: [],
  daily: ['dailyco', 'daily.co'],
  linear: [],
  jira: [],
  confluence: [],
};

const clean = (body, slug) => body
  .replace(/ id="([^"]+)"/g, (_, id) => ` id="br-${slug}-${id}"`)
  .replace(/url\(#([^)]+)\)/g, (_, id) => `url(#br-${slug}-${id})`)
  .replace(/href="#([^"]+)"/g, (_, id) => `href="#br-${slug}-${id}"`);

const entries = [];
for (const [slug, aliases] of Object.entries(CATALOG)) {
  const icon = icons[slug];
  if (!icon) continue;
  const body = icon.body ?? '';
  if (/<script|<style|javascript:/i.test(body)) continue;
  // The logos collection defaults to a 256x256 viewBox when width/height are omitted.
  const w = icon.width ?? 256;
  const h = icon.height ?? 256;
  // Mostly-white marks need a dark badge; mostly colored/dark marks use a light badge.
  const colors = [...body.matchAll(/(?:fill|stop-color)="([^"]+)"/g)].map((m) => m[1].toLowerCase());
  const luminance = (c) => {
    if (c === 'white') return 1;
    if (c === 'black') return 0;
    const hex = c.replace('#', '');
    if (!/^[0-9a-f]{3,8}$/.test(hex)) return null;
    const full = hex.length === 3 ? hex.split('').map((x) => x + x).join('') : hex.slice(0, 6);
    const n = parseInt(full, 16);
    return (0.2126 * ((n >> 16) & 255) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255)) / 255;
  };
  const lums = colors.map(luminance).filter((v) => v !== null);
  const dark = lums.length > 0 && lums.filter((v) => v > 0.75).length / lums.length > 0.6;
  entries.push({
    id: slug,
    name: icon.title ?? slug,
    w,
    h,
    dark,
    aliases,
    body: clean(body, slug),
  });
}

const norm = (value) => value.toLowerCase().normalize('NFKD').replace(/[^a-z0-9\u4e00-\u9fa5]/g, '');
const aliasOwner = new Map();
for (const entry of entries) {
  for (const value of [entry.id, entry.name, ...entry.aliases]) {
    const key = norm(value);
    if (!key) throw new Error(`Empty brand alias in ${entry.id}`);
    const owner = aliasOwner.get(key);
    if (owner && owner !== entry.id) throw new Error(`Brand alias conflict: "${value}" in ${owner} and ${entry.id}`);
    aliasOwner.set(key, entry.id);
  }
}

const file = `/* Generated by scripts/gen-brands.mjs from @iconify-json/logos (CC0). Do not edit. */
export interface BrandIcon {
  id: string;
  name: string;
  w: number;
  h: number;
  dark: boolean;
  aliases: string[];
  body: string;
}

export const BRANDS: BrandIcon[] = ${JSON.stringify(entries, null, 1)};
`;
const out = resolve('viewer/src/brands.generated.ts');
writeFileSync(out, file);
console.log(`Wrote ${entries.length} brand icons to ${out} (${(file.length / 1024).toFixed(0)} KB)`);
