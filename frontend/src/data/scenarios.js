// ─── Scenario Registry ─────────────────────────────────────────────────────
// Single source of truth for frontend scenario data.
// Backend has authoritative copy; this is used for offline/fallback rendering.

export const SEV_COLORS = {
  SEV0: { bg: 'bg-red-600', text: 'text-red-400', border: 'border-red-500', label: 'CRITICAL' },
  SEV1: { bg: 'bg-orange-500', text: 'text-orange-400', border: 'border-orange-500', label: 'HIGH' },
  SEV2: { bg: 'bg-yellow-500', text: 'text-yellow-400', border: 'border-yellow-500', label: 'MEDIUM' },
  SEV3: { bg: 'bg-blue-500', text: 'text-blue-400', border: 'border-blue-500', label: 'LOW' },
  SEV4: { bg: 'bg-slate-500', text: 'text-slate-400', border: 'border-slate-500', label: 'INFORMATIONAL' },
}

export const ROLES = [
  {
    id: 'oncall',
    title: 'On-Call SWE',
    subtitle: 'Triage the blast radius, restore service, keep the war-room disciplined.',
    glow: 'cyan',
    icon: '⚡',
    scenarios: 5,
  },
  {
    id: 'security',
    title: 'Cybersecurity Analyst',
    subtitle: 'Hunt IOCs, verify suspicious traffic, and coordinate containment without panic.',
    glow: 'purple',
    icon: '🛡',
    scenarios: 5,
  },
  {
    id: 'comms',
    title: 'PR / Comms Manager',
    subtitle: 'Craft updates that are accurate, calm, and brutally clear under pressure.',
    glow: 'cyan',
    icon: '📢',
    scenarios: 5,
  },
]

export const COMMANDS = {
  oncall: {
    help: { desc: 'List all available commands' },
    ack: { desc: 'ENTER INCIDENT SPACE (do this first)' },
    status: { desc: 'View current incident status and metrics' },
    'throttle <target>': { desc: 'Apply rate limits (e.g. throttle ingress)' },
    'scale <target>': { desc: 'Scale a service (e.g. scale payments-api)' },
    'restart <target>': { desc: 'Restart a service (e.g. restart redis)' },
    'rollback <target>': { desc: 'Rollback a deployment (e.g. rollback checkout)' },
    'promote replica': { desc: 'Promote DB replica to primary' },
    'flush cache': { desc: 'Flush Redis/Memcached cache' },
    'isolate <host>': { desc: 'Network-isolate a host' },
    resolve: { desc: 'Resolve the incident (only when stable)' },
  },
  security: {
    help: { desc: 'List all available commands' },
    ack: { desc: 'ENTER INCIDENT SPACE' },
    status: { desc: 'View current incident status' },
    'block ips': { desc: 'Block malicious IP ranges at WAF' },
    'enable mfa': { desc: 'Force MFA for all active sessions' },
    'reset sessions': { desc: 'Invalidate all user sessions' },
    'revoke credentials': { desc: 'Revoke compromised service account credentials' },
    'isolate <host>': { desc: 'Network-isolate a compromised host' },
    'kill processes': { desc: 'Kill malicious processes on isolated hosts' },
    forensics: { desc: 'Begin forensic data collection' },
    'restore backups': { desc: 'Initiate backup restoration' },
    'notify users': { desc: 'Send user security notification' },
    'patch systems': { desc: 'Apply emergency security patches' },
    resolve: { desc: 'Close the incident' },
  },
  comms: {
    help: { desc: 'List all available commands' },
    ack: { desc: 'ENTER INCIDENT SPACE' },
    'draft statement': { desc: 'Draft a public-facing statement' },
    'notify users': { desc: 'Send user notification email' },
    'update status page': { desc: 'Update the public status page' },
    'coordinate legal': { desc: 'Loop in legal team' },
    'brief ceo': { desc: 'Brief the CEO with a 5-sentence summary' },
    'hold statement': { desc: 'Issue a holding statement to press' },
    resolve: { desc: 'Close the incident' },
  }
}

export const DUMMY_SCENARIO = {
  id: 'retry_storm',
  title: 'Checkout Retry Storm',
  severity: 'SEV0',
  service: 'payments-api',
  description: 'Upstream timeouts causing massive retry storm. DB deadlocked. 38% error rate.',
  root_cause: 'Latency spike → clients timeout and retry → floods DB with connections → deadlock.',
  ideal_steps: ['ack', 'throttle ingress', 'restart db', 'rollback checkout', 'resolve'],
  metrics: { error_rate: 38, p95_latency: 4900, db_connections: 95, cpu: 89 },
  logs: [
    '[15:42:08.112] edge-gw: 502 spike detected route=/checkout',
    '[15:42:09.904] payments-api: upstream timeout p95=4.9s',
    '[15:42:11.101] kube: HPA scaling payments-api replicas 8 → 14',
    '[15:42:12.004] redis: connection pool saturation 93%',
    '[15:42:13.778] db: deadlock detected on table=orders',
    '[15:42:14.613] pagerduty: incident triggered (SEV0) team=sre',
    '[15:42:15.292] traces: checkout flow error rate 38%',
    '[15:42:16.407] auth: token verification latency +220ms',
    '[15:42:18.031] ingress: retry storm suspected — 12k rps vs baseline 3.2k',
  ]
}
