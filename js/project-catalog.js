// Project Catalog - Centralized project metadata for portfolio showcase.
// v2 fields per docs/superpowers/plans/2026-07-03-site-redesign-v2.md (Lane B):
// each project carries `slug` (matches /projects/<slug>.html), `outcome`
// (one measurable line, sourced from existing metrics/achievements), and
// `caseStudyUrl` ('/projects/<slug>.html').

import { escapeHtml, normalizeSlug } from './utils/helpers.js?v=7';

const PROJECT_CATALOG = {
  'meshwatch': {
    name: 'MeshWatch',
    slug: 'meshwatch',
    outcome: 'Full observability — metrics, logs, traces, AI incident analysis — for $5.12/month, 60% less than serverless alternatives.',
    caseStudyUrl: '/projects/meshwatch.html',
    description: 'Cost-optimized service mesh observability platform on k3s Kubernetes with Istio mTLS, OpenTelemetry, and Ollama Phi-3 AI incident analysis.',
    category: 'devops',
    tags: ['cloud-native', 'kubernetes', 'service-mesh', 'ai-ops'],
    techStack: [
      { name: 'Kubernetes (k3s)', level: 'Core' },
      { name: 'Istio Service Mesh', level: 'mTLS, Traffic Splitting' },
      { name: 'Prometheus + Grafana', level: 'Metrics & Dashboards' },
      { name: 'Loki', level: 'Log Aggregation' },
      { name: 'Tempo', level: 'Distributed Tracing' },
      { name: 'Ollama Phi-3', level: 'AI Incident Analysis' },
      { name: 'Flagger', level: 'Canary Deployments' }
    ],
    metrics: {
      costSaved: '$7/month vs serverless',
      podsDeployed: 15,
      servicesMonitored: 5,
      errorRate: '0.2%',
      avgResponseTime: '45ms',
      monthlyCost: '$5.12'
    },
    badges: ['⭐ Production', '🤖 AI-Powered', '💰 Cost-Optimized'],
    githubUrl: 'https://github.com/evince55/meshwatch',
    liveUrl: 'https://chai-homelab.com/grafana',
    keyAchievements: [
      'Reduced monitoring costs by 60% vs serverless alternatives',
      'Implemented AI-powered incident analysis with Ollama Phi-3',
      'Automated canary deployments with Flagger rollback',
      'Full observability stack (metrics, traces, logs) on $5/month'
    ],
    demoNote: 'Demo mode shows cached metrics. Live data requires Azure Functions + Tailscale deployment.'
  },
  'minecraft-monitoring': {
    name: 'Minecraft Monitoring',
    slug: 'minecraft-monitoring',
    outcome: '99.8% uptime with real-time TPS, heap, and player metrics, plus a 10-command Discord bot for alerts and control.',
    caseStudyUrl: '/projects/minecraft-monitoring.html',
    description: 'Full-stack Minecraft server observability with Istio service mesh, Prometheus metrics (TPS, heap, players), Discord bot integration, and automated alerting.',
    category: 'iot',
    tags: ['minecraft', 'service-mesh', 'discord-bot', 'monitoring'],
    techStack: [
      { name: 'PaperMC 26.1.2', level: 'Java 25 Game Server' },
      { name: 'JMX Exporter', level: 'TPS, Heap, GC Metrics' },
      { name: 'RCON Protocol', level: 'Server Control' },
      { name: 'Discord.py Bot', level: '10 Slash Commands' },
      { name: 'Prometheus + Grafana', level: 'Real-time Dashboards' },
      { name: 'Flagger', level: 'Canary Deployments' }
    ],
    metrics: {
      tpsMonitored: true,
      playersTracked: true,
      discordAlertsToday: 0,
      uptime: '99.8%',
      
    },
    badges: ['⭐ Live', '🎮 Discord Bot', '📊 Real-time'],
    githubUrl: 'https://github.com/evince55/minecraft-monitoring',
    liveUrl: 'https://chai-homelab.com/grafana/d/minecraft',
    keyAchievements: [
      'Integrated JMX + RCON exporters for real-time Minecraft metrics',
      'Discord bot with 10 slash commands (/status, /players, /tps, etc.)',
      'Implemented AI-powered lag analysis via Ollama Phi-3',
      'Automated alerting with incident responder pipeline'
    ],
    demoNote: 'Demo mode shows cached metrics. Live data requires Azure Functions + Tailscale deployment.'
  },

  'career-portal': {
    name: 'Career Portal',
    slug: 'career-portal',
    outcome: 'Zero-dependency vanilla JS PWA scoring Lighthouse 95+, WCAG 2.1 accessible, hosted free on Cloudflare Pages.',
    caseStudyUrl: '/projects/career-portal.html',
    description: 'This site: a zero-dependency vanilla JS portfolio PWA with a token-driven dark design system, command-palette navigation, WCAG 2.1 accessibility, and live homelab stats read from a Cloudflare Pages Function.',
    category: 'web',
    tags: ['portfolio', 'pwa', 'accessibility', 'offline'],
    techStack: [
      { name: 'Vanilla JS (ES6)', level: 'Zero dependencies, no bundler' },
      { name: 'CSS design tokens', level: 'Per-page accent theming' },
      { name: 'Service worker', level: 'Root-scope, real offline support' },
      { name: 'Cloudflare Pages', level: 'Hosting + CDN, deployed by CI' },
      { name: 'Pages Functions + KV', level: 'Live stats API + contact relay' }
    ],
    metrics: {
      testsPassing: 155,
      commandsAvailable: 10,
      lighthouseScore: '95+',
      accessibilityScore: 'WCAG 2.1 Compliant'
    },
    badges: ['⚡ Zero-dependency', '♻️ Accessible', '📦 Offline-ready'],
    githubUrl: 'https://github.com/evince55/career-portal',
    liveUrl: 'https://chai-homelab.com',
    keyAchievements: [
      'Ctrl+K command palette for keyboard-first navigation',
      'Root-scoped service worker: pages load fully offline',
      'WCAG 2.1 accessible (ARIA, keyboard nav, screen reader)',
      'Live homelab metrics via a Cloudflare Pages Function backed by KV'
    ],
    demoNote: 'You are currently viewing this project!'
  },
  'monitoring-stack': {
    name: 'Monitoring Stack',
    slug: 'monitoring-stack',
    outcome: '5 services monitored through GitOps with 7 alert rules and a 20-panel Grafana dashboard — no manual deploys.',
    caseStudyUrl: '/projects/monitoring-stack.html',
    description: 'Production-grade monitoring platform with ArgoCD GitOps, External Secrets Operator, cert-manager TLS, and Discord integration for automated alerting.',
    category: 'devops',
    tags: ['kubernetes', 'argocd', 'prometheus', 'loki'],
    techStack: [
      { name: 'ArgoCD', level: 'GitOps / App of Apps' },
      { name: 'External Secrets Operator', level: 'Azure Key Vault Backend' },
      { name: 'cert-manager', level: 'Let\'s Encrypt TLS' },
      { name: 'kube-prometheus-stack', level: 'v85.2.1 Helm Chart' },
      { name: 'Loki + Promtail', level: 'Log Aggregation (7d retention)' }
    ],
    metrics: {
      servicesMonitored: 5,
      alertRules: 7,
      grafanaPanels: 20,
      logRetentionDays: 7
    },
    badges: ['🏷 Production', '🔗 GitOps', '🔖 Secure'],
    githubUrl: null, // Local project - not on GitHub
    liveUrl: 'https://chai-homelab.com/loki',
    keyAchievements: [
      'ArgoCD App of Apps pattern for multi-namespace management',
      'External Secrets Operator with Azure Key Vault backend',
      'cert-manager with Let\'s Encrypt TLS auto-provisioning',
      '20-panel Grafana dashboard for Minecraft monitoring'
    ],
    demoNote: 'Demo mode shows cached metrics. Live data requires Tailscale + Prometheus access.'
  },
  'azure-functions': {
    name: 'Azure Functions',
    slug: 'azure-functions',
    outcome: 'Serverless health checks every 15 minutes with 5-minute dedup windows that stop Discord alert storms.',
    caseStudyUrl: '/projects/azure-functions.html',
    description: 'Serverless Python functions for homelab service health monitoring and alert processing via Azure Service Bus with Discord webhook integration.',
    category: 'cloud',
    tags: ['serverless', 'python', 'service-bus', 'discord'],
    techStack: [
      { name: 'Azure Functions v2.0', level: 'Python Runtime' },
      { name: 'Service Bus Trigger', level: 'Incident Events Topic' },
      { name: 'Timer Trigger', level: 'Health Checker (15min interval)' },
      { name: 'Pydantic', level: 'Data Validation Models' },
      { name: 'aiohttp', level: 'Async HTTP Client' }
    ],
    metrics: {
      functionsDeployed: 2,
      healthCheckInterval: '15 minutes',
      serviceBusTopic: 'incident-events',
      webhookRouting: 'Discord Embeds'
    },
    badges: ['☁️ Serverless', '💬 Webhooks', '📊 Health Checks'],
    githubUrl: null, // Local project - not on GitHub
    liveUrl: null, // Function endpoint - requires deployment
    keyAchievements: [
      'Health checker function with 15-minute cron interval',
      'Service Bus trigger for incident event processing',
      'Deduplication windows (5-min) to prevent alert storms',
      'Pydantic models for Service Bus message validation'
    ],
    demoNote: 'Demo mode shows cached metrics. Live data requires Azure Functions deployment.'
  }
};

// Default projects to display (ordered by importance)
const DEFAULT_PROJECT_ORDER = [
  'meshwatch',
  'minecraft-monitoring',
  'monitoring-stack',
  'azure-functions',
  'career-portal'
];

// Helper: Get all projects, optionally filtered by category
function getProjects(filterCategory = '', filterKeyword = '') {
  let projects = Object.values(PROJECT_CATALOG);
  
  // Filter by category
  if (filterCategory) {
    const cat = filterCategory.toLowerCase();
    projects = projects.filter(p => p.category === cat || p.tags.includes(cat));
  }
  
  // Filter by keyword (name, description, tags, tech stack)
  if (filterKeyword) {
    const kw = filterKeyword.toLowerCase();
    projects = projects.filter(p =>
      p.name.toLowerCase().includes(kw) ||
      p.description.toLowerCase().includes(kw) ||
      p.tags.some(t => t.includes(kw)) ||
      p.techStack.some(t => t.name.toLowerCase().includes(kw))
    );
  }
  
  // Sort by default order, then alphabetically
  const orderMap = {};
  DEFAULT_PROJECT_ORDER.forEach((slug, idx) => { orderMap[slug] = idx; });
  
  projects.sort((a, b) => {
    const aIdx = orderMap[a.slug] ?? 999;
    const bIdx = orderMap[b.slug] ?? 999;
    if (aIdx !== bIdx) return aIdx - bIdx;
    return a.name.localeCompare(b.name);
  });
  
  return projects;
}

// Helper: Get a single project by slug or name
function getProject(identifier) {
  const slug = normalizeSlug(identifier);
  return PROJECT_CATALOG[slug] || null;
}

// Helper: Generate badge HTML string (with escaping for safety)
function generateBadges(badges) {
  if (!badges || badges.length === 0) return '';
  return badges
    .filter(b => b != null && String(b).trim() !== '')
    .map(b => `<span class="project-badge">${escapeHtml(b)}</span>`)
    .join(' ');
}

export { PROJECT_CATALOG, DEFAULT_PROJECT_ORDER, getProjects, getProject, generateBadges };
export default PROJECT_CATALOG;
