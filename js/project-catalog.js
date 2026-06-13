// Project Catalog - Centralized project metadata for portfolio showcase

import { escapeHtml, normalizeSlug } from './utils/helpers.js';

const PROJECT_CATALOG = {
  'meshwatch': {
    name: 'MeshWatch',
    slug: 'meshwatch',
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
    githubUrl: 'https://github.com/chaitea321/meshwatch',
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
    name: 'minecraft-monitoring',
    slug: 'minecraft-monitoring',
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
      lastGcPause: '45ms'
    },
    badges: ['⭐ Live', '🎮 Discord Bot', '📊 Real-time'],
    githubUrl: 'https://github.com/chaitea321/minecraft-monitoring',
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
    description: 'FAANG-quality terminal-themed portfolio with synthwave aesthetic, PWA support, accessibility (WCAG 2.1), and dynamic Azure Functions integration.',
    category: 'web',
    tags: ['portfolio', 'pwa', 'accessibility', 'synthwave'],
    techStack: [
      { name: 'Vanilla JS (ES6)', level: 'Terminal Interface' },
      { name: 'CSS3 + Animations', level: 'Synthwave Theme' },
      { name: 'PWA Manifest', level: 'Offline Support' },
      { name: 'Azure Blob Storage', level: '$0.50/month Hosting' },
      { name: 'Cloudflare CDN', level: 'Free Tier + SSL' },
      { name: 'GitHub OAuth', level: 'API Authentication' }
    ],
    metrics: {
      testsPassing: 102,
      commandsAvailable: 25,
      lighthouseScore: '95+',
      accessibilityScore: 'WCAG 2.1 Compliant'
    },
    badges: ['🎯 Synthwave', '♻️ Accessible', '📦 PWA Ready'],
    githubUrl: 'https://github.com/chaitea321/career-portal',
    liveUrl: 'https://chai-homelab.com',
    keyAchievements: [
      'Interactive terminal with 14+ commands and autocomplete',
      'PWA support with service worker offline caching',
      'WCAG 2.1 accessible (ARIA, keyboard nav, screen reader)',
      'Azure Functions API gateway with GitHub OAuth'
    ],
    demoNote: 'You are currently viewing this project!'
  },
  'monitoring': {
    name: 'Monitoring Stack',
    slug: 'monitoring',
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
  'monitoring',
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
  
  // Filter by keyword
  if (filterKeyword) {
    const kw = filterKeyword.toLowerCase();
    projects = projects.filter(p =>
      p.name.toLowerCase().includes(kw) ||
      p.description.toLowerCase().includes(kw) ||
      p.tags.some(t => t.includes(kw))
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
  return badges.map(b => `<span class="project-badge">${escapeHtml(b)}</span>`).join(' ');
}

export { PROJECT_CATALOG, DEFAULT_PROJECT_ORDER, getProjects, getProject, generateBadges };
export default PROJECT_CATALOG;
