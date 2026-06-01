import React, { useMemo, useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Star, Clock, AlertTriangle, Shield, Check, Play, HelpCircle, Terminal as TermIcon, Heart, Settings, Info, Server } from 'lucide-react';

const COMMAND_DATABASE = [
  {
    name: 'kubectl top pods',
    purpose: 'Display resource (CPU/Memory) usage of active cluster pods',
    category: 'Investigation',
    difficulty: 'Beginner',
    usefulness: '90%',
    risk: 'Safe (Read Only)',
    isDestructive: false,
    roles: ['swe', 'oncall'],
    whySuggested: 'Allows quick detection of CPU hogs and memory-saturated container instances.',
    expectedOutput: 'NAME                     CPU(cores)   MEMORY(bytes)\ngateway-api-router-84b   890m         412Mi\npostgres-db-primary-0    120m         1200Mi',
    affectedSystems: ['Kubernetes cluster']
  },
  {
    name: 'kubectl rollout undo <dep-name>',
    purpose: 'Undo and roll back a previous microservice deployment',
    category: 'Recovery Actions',
    difficulty: 'Intermediate',
    usefulness: '95%',
    risk: 'Medium (Alters deployment state)',
    isDestructive: false,
    roles: ['swe', 'oncall'],
    whySuggested: 'Instantly rolls back unstable changes (like infinite retry loops) to the last stable deployment state.',
    expectedOutput: 'deployment.apps/gateway-api-router rolled back successfully.',
    affectedSystems: ['Kubernetes cluster'],
    parameters: ['gateway-api-router', 'aws-s3-connector', 'api-gateway']
  },
  // SWE / On-Call SRE commands
  {
    name: 'kubectl get pods',
    purpose: 'View active health status of all orchestration pods',
    category: 'Investigation',
    difficulty: 'Beginner',
    usefulness: '98%',
    risk: 'Safe (Read Only)',
    isDestructive: false,
    roles: ['swe', 'oncall'],
    whySuggested: 'Highly recommended first-step to check for CrashLoopBackOff, Pending, or Volume mounting failures.',
    expectedOutput: 'pod/aws-s3-connector-v2   Running   0   12m\npod/postgres-db-primary   Running   0   45m\npod/gateway-api-router    CrashLoopBackOff   4   3m',
    affectedSystems: ['s3-connector', 'postgres-db', 'Kubernetes cluster']
  },
  {
    name: 'kubectl describe pod <pod-name>',
    purpose: 'Inspect detailed resource configs and lifecycle events',
    category: 'Investigation',
    difficulty: 'Intermediate',
    usefulness: '92%',
    risk: 'Safe (Read Only)',
    isDestructive: false,
    roles: ['swe', 'oncall'],
    whySuggested: 'Essential to check volume mount staleness, event warning logs, and container state transitions.',
    expectedOutput: 'Name:         gateway-api-router-84b8fdf79f-q8xl4\nStatus:       Running\nRestart Count: 4\nEvents:\n  Warning  FailedScheduling  12m  kubelet  Volume mount stalled.',
    affectedSystems: ['Kubernetes cluster'],
    parameters: ['aws-s3-connector-v2', 'postgres-db-primary', 'gateway-api-router-84b8']
  },
  {
    name: 'kubectl logs <pod-name>',
    purpose: 'Fetch standard out runtime container logs',
    category: 'Investigation',
    difficulty: 'Beginner',
    usefulness: '90%',
    risk: 'Safe (Read Only)',
    isDestructive: false,
    roles: ['swe', 'oncall'],
    whySuggested: 'Enables quick checks for connection socket timeouts, postgres starvation pool, or panic alerts.',
    expectedOutput: '2026-05-30T07:54:12Z [FATAL] [s3-connector] Socket timeout trying to reach bucket volumes.\n2026-05-30T07:54:14Z [ERROR] Upstream DB pool connection failed.',
    affectedSystems: ['Container logs'],
    parameters: ['aws-s3-connector-v2', 'postgres-db-primary', 'gateway-api-router-84b8']
  },
  {
    name: 'systemctl restart nginx',
    purpose: 'Hard restart the main ingress reverse proxy service',
    category: 'Recovery Actions',
    difficulty: 'Intermediate',
    usefulness: '85%',
    risk: 'Medium (Drops active proxy connections)',
    isDestructive: false,
    roles: ['swe', 'oncall'],
    whySuggested: 'Clears hung connection buffers and resets routing tables on client-facing ingress layers.',
    expectedOutput: 'Stopping Nginx Ingress Reverse Proxy daemon... [OK]\nStarting Nginx Ingress Reverse Proxy daemon... [OK]',
    affectedSystems: ['nginx-ingress']
  },
  {
    name: 'aws-s3 restore-routing-entries',
    purpose: 'Rebuild detached AWS S3 administrative directory paths',
    category: 'Recovery Actions',
    difficulty: 'Advanced',
    usefulness: '98%',
    risk: 'Safe (Alters system states)',
    isDestructive: false,
    roles: ['swe', 'oncall'],
    whySuggested: 'Directly mitigates detached volume routing entries caused by admin typo in PR #422.',
    expectedOutput: 'Reading routing config backup s3_config_bkp.json... [OK]\nRebuilding detached storage volume endpoints... [OK]\nRestored 4 directory path endpoints.',
    affectedSystems: ['aws-s3', 'storage volume']
  },
  {
    name: 'ack',
    purpose: 'Acknowledge operational page alerts to silence alerts',
    category: 'Monitoring',
    difficulty: 'Beginner',
    usefulness: '100%',
    risk: 'Safe (Read Only)',
    isDestructive: false,
    roles: ['swe', 'oncall', 'cybersecurity', 'cyber', 'pr', 'comms'],
    whySuggested: 'Signals to executive team and paging daemons that active SRE triage has begun.',
    expectedOutput: '[system] Incident #492 acknowledged by SRE operator. Pager Duty alerts silenced.',
    affectedSystems: ['PagerDuty API']
  },
  {
    name: 'resolve',
    purpose: 'Verify recovery indicators and close active bridge',
    category: 'Verification',
    difficulty: 'Beginner',
    usefulness: '100%',
    risk: 'Safe (Closes Incident)',
    isDestructive: false,
    roles: ['swe', 'oncall', 'cybersecurity', 'cyber', 'pr', 'comms'],
    whySuggested: 'Execute once system telemetry queues have stabilized and returned to baseline thresholds.',
    expectedOutput: '[system] Incident successfully closed. telemetric indicators within normal baselines.',
    affectedSystems: ['Incident Bridge']
  },
  {
    name: 'scale deployment <dep-name> --replicas=<num>',
    purpose: 'Scale microservice active replicas inside cluster',
    category: 'Recovery Actions',
    difficulty: 'Intermediate',
    usefulness: '82%',
    risk: 'Medium (Modifies resource maps)',
    isDestructive: false,
    roles: ['swe', 'oncall'],
    whySuggested: 'Scaling up replica sets absorbs traffic amplification surges and SRE retry storms.',
    expectedOutput: 'deployment.apps/gateway-api-router scaled to 5 replicas.',
    affectedSystems: ['Kubernetes cluster'],
    parameters: ['gateway-api-router', 'aws-s3-connector', 'api-gateway'],
    paramValues: {
      '<dep-name>': ['gateway-api-router', 'aws-s3-connector', 'api-gateway'],
      '<num>': ['3', '5']
    }
  },
  {
    name: 'format database',
    purpose: 'Wipe all relational tables and schema metrics',
    category: 'Recovery Actions',
    difficulty: 'Advanced',
    usefulness: '5%',
    risk: 'DESTRUCTIVE (Wipes all customer transactions!)',
    isDestructive: true,
    roles: ['swe', 'oncall'],
    whySuggested: 'Speculative action. High risk: Wipes transaction tables completely.',
    expectedOutput: 'ERROR: cascading database constraints active. Refusing database format command.',
    affectedSystems: ['postgres-db']
  },
  {
    name: 'drop tables',
    purpose: 'Delete current relational schemas in PG cluster',
    category: 'Recovery Actions',
    difficulty: 'Advanced',
    usefulness: '5%',
    risk: 'DESTRUCTIVE (Irreversible data loss!)',
    isDestructive: true,
    roles: ['swe', 'oncall'],
    whySuggested: 'Speculative action. High risk: Drops core relational database structures.',
    expectedOutput: 'ERROR: database connection string is active. Refusing drop tables command.',
    affectedSystems: ['postgres-db']
  },

  // Cybersecurity commands
  {
    name: 'netstat -antp',
    purpose: 'Display active host TCP network socket queues',
    category: 'Network Analysis',
    difficulty: 'Beginner',
    usefulness: '92%',
    risk: 'Safe (Read Only)',
    isDestructive: false,
    roles: ['cybersecurity', 'cyber'],
    whySuggested: 'Required to identify unauthorized foreign network connection listening ports.',
    expectedOutput: 'Proto Recv-Q Send-Q Local Address      Foreign Address    State       PID/Program\ntcp        0      0 127.0.0.1:5432     127.0.0.1:39021    ESTABLISHED 1204/postgres\ntcp        0      0 0.0.0.0:80         192.168.1.92:5542  ESTABLISHED 1092/nginx',
    affectedSystems: ['Host sockets', 'Firewall rules']
  },
  {
    name: 'tcpdump -c 20 -nnXXi any port <port-num>',
    purpose: 'Sniff and dump live network raw packet headers',
    category: 'Network Analysis',
    difficulty: 'Advanced',
    usefulness: '88%',
    risk: 'Safe (Read Only)',
    isDestructive: false,
    roles: ['cybersecurity', 'cyber'],
    whySuggested: 'Analyzes raw packet headers to identify malware payload footprints or IP DDoS traces.',
    expectedOutput: '20 packets captured\n40 packets received by filter\n0 packets dropped by kernel',
    affectedSystems: ['Network interface card'],
    parameters: ['80', '443', '5432']
  },
  {
    name: 'iptables -A INPUT -s <suspicious_ip> -j DROP',
    purpose: 'Block incoming packets from a suspicious target IP',
    category: 'Security Analysis',
    difficulty: 'Intermediate',
    usefulness: '95%',
    risk: 'Medium (Alters firewall tables)',
    isDestructive: false,
    roles: ['cybersecurity', 'cyber'],
    whySuggested: 'Instantly stops DDoS retry storm query amplification from brute-force IPs.',
    expectedOutput: 'Applying iptables rule insertion... [OK]',
    affectedSystems: ['iptables-firewall'],
    parameters: ['192.168.1.92', '10.0.4.15', '185.220.101.4']
  },
  {
    name: 'kill -9 <suspicious_pid>',
    purpose: 'Force terminate illegal rogue processes',
    category: 'Security Analysis',
    difficulty: 'Intermediate',
    usefulness: '90%',
    risk: 'Medium (Terminates running processes)',
    isDestructive: false,
    roles: ['cybersecurity', 'cyber'],
    whySuggested: 'Instantly kills rogue background shells or crypto-miners eating CPU cycles.',
    expectedOutput: 'Process PID 4920 successfully terminated.',
    affectedSystems: ['Host processes'],
    parameters: ['4920', '8012']
  },
  {
    name: 'check auth logs',
    purpose: 'Audit user authorization credentials audit logs',
    category: 'Security Analysis',
    difficulty: 'Beginner',
    usefulness: '90%',
    risk: 'Safe (Read Only)',
    isDestructive: false,
    roles: ['cybersecurity', 'cyber'],
    whySuggested: 'Required to audit compromised admin accounts and unauthorized API token creations.',
    expectedOutput: '2026-05-30T07:12:04Z [AUTH] Successful admin login from IP 192.168.1.92\n2026-05-30T07:12:44Z [AUTH] Failed login count: 142 from suspicious IP.',
    affectedSystems: ['host auth audit']
  },

  // PR / Comms commands
  {
    name: 'draft holding statement',
    purpose: 'Draft an internal legal Holding Statement document',
    category: 'Recovery Actions',
    difficulty: 'Beginner',
    usefulness: '96%',
    risk: 'Safe',
    isDestructive: false,
    roles: ['pr', 'comms'],
    whySuggested: 'Establishes initial PR narrative bounds and secures triage time.',
    expectedOutput: 'Drafting holding statement: \"We are aware of storage volume constraints in US-EAST-1 and are working actively to remediate them...\"',
    affectedSystems: ['PR brand communication']
  },
  {
    name: 'review legal response',
    purpose: 'Audit compliance guidelines for regulatory disclosures',
    category: 'Verification',
    difficulty: 'Intermediate',
    usefulness: '92%',
    risk: 'Safe',
    isDestructive: false,
    roles: ['pr', 'comms'],
    whySuggested: 'Required to assess SLA contract boundaries and prevent legal liabilities.',
    expectedOutput: 'Legal team has cleared holding statement for distribution under minor SLA liability scales.',
    affectedSystems: ['Legal compliance API']
  },
  {
    name: 'respond to journalists',
    purpose: 'Draft approved tech journalism statements',
    category: 'Recovery Actions',
    difficulty: 'Intermediate',
    usefulness: '85%',
    risk: 'Medium (Brand exposure)',
    isDestructive: false,
    roles: ['pr', 'comms'],
    whySuggested: 'Manages incoming media surges to maintain executive confidence.',
    expectedOutput: 'Replied to journalists with approved SRE status timeline briefings.',
    affectedSystems: ['Public media registry']
  },
  {
    name: 'publish customer update',
    purpose: 'Publish formal progress post on public StatusPage',
    category: 'Verification',
    difficulty: 'Beginner',
    usefulness: '98%',
    risk: 'Safe',
    isDestructive: false,
    roles: ['pr', 'comms'],
    whySuggested: 'Restores client trust by providing transparent mitigation updates.',
    expectedOutput: 'Published to StatusPage: "Operational issues stabilized in US-EAST-1 storage groups."',
    affectedSystems: ['StatusPage API']
  },

  // Knight Capital Disaster
  {
    name: "ssh smars6 'killall -9 power_peg_test'",
    purpose: "Kill the rogue Power Peg trading process on SMARS6",
    category: "Recovery Actions",
    difficulty: "Intermediate",
    usefulness: "98%",
    risk: "Medium",
    isDestructive: false,
    roles: ['swe', 'oncall'],
    whySuggested: "Terminates the runaway high-frequency trading routine to stop capital bleed immediately.",
    expectedOutput: "Connection to smars6 closed by remote host.\nProcess power_peg_test (PID 7821) terminated.",
    affectedSystems: ["High Frequency Trading Engine", "SMARS6 Server"]
  },
  {
    name: "iptables -A INPUT -p tcp --dport 9090 -j DROP -s smars6",
    purpose: "Isolate the rogue SMARS6 server from the primary network fabric",
    category: "Security Analysis",
    difficulty: "Advanced",
    usefulness: "95%",
    risk: "Safe",
    isDestructive: false,
    roles: ['swe', 'oncall'],
    whySuggested: "Blocks all downstream or external TCP traffic from SMARS6 to completely contain trading network loops.",
    expectedOutput: "Applying iptables firewall rules... [OK]",
    affectedSystems: ["Network Firewall", "SMARS6 Server"]
  },
  {
    name: "git revert HEAD~1 --no-edit && ./deploy.sh --rollback",
    purpose: "Rollback to the last known stable deployment commit on the gateway",
    category: "Recovery Actions",
    difficulty: "Intermediate",
    usefulness: "92%",
    risk: "Medium",
    isDestructive: false,
    roles: ['swe', 'oncall'],
    whySuggested: "Reverts the botched deployment that awakened the legacy test routine, restoring stable gateway states.",
    expectedOutput: "[git] Reverted HEAD~1 successfully.\n[deploy] Initiating cluster rollback... [OK]\nRestoring server configurations.",
    affectedSystems: ["Trading Gateway", "Git Repository"]
  },
  {
    name: "notify_sec --case-id=KC-2012-08-01 --severity=market-disruption",
    purpose: "Issue official SEC/Regulatory compliance and incident warnings",
    category: "Verification",
    difficulty: "Beginner",
    usefulness: "90%",
    risk: "Safe",
    isDestructive: false,
    roles: ['swe', 'oncall'],
    whySuggested: "Complies with regulatory standards during extreme market disruptions to manage SEC/legal risk.",
    expectedOutput: "[SEC-API] CASE KC-2012-08-01 registered. Severity: MARKET-DISRUPTION. Compliance report generated.",
    affectedSystems: ["Regulatory Reporting API"]
  },

  // GitLab Database Deletion
  {
    name: "sudo systemctl stop gitlab-background-jobs",
    purpose: "Stop all GitLab sidekiq/background job queues",
    category: "Recovery Actions",
    difficulty: "Intermediate",
    usefulness: "90%",
    risk: "Safe",
    isDestructive: false,
    roles: ['swe', 'oncall'],
    whySuggested: "Prevents concurrent queue tasks from executing or writing during active database recovery operations.",
    expectedOutput: "Stopping gitlab-sidekiq background workers... [OK]",
    affectedSystems: ["GitLab Queues", "Sidekiq workers"]
  },
  {
    name: "lvcreate --size 300G --name snap gitlab_vg",
    purpose: "Create a filesystem-level snapshot of the active gitlab_vg volume group",
    category: "Recovery Actions",
    difficulty: "Advanced",
    usefulness: "85%",
    risk: "Safe",
    isDestructive: false,
    roles: ['swe', 'oncall'],
    whySuggested: "Ensures we have a restore point of the current disk state before executing massive SQL rebuild scripts.",
    expectedOutput: "Logical volume 'snap' created successfully.",
    affectedSystems: ["Logical Volume Manager (LVM)"]
  },
  {
    name: "aws s3 cp s3://gitlab-backups/latest_backup.sql /var/lib/postgresql/backup.sql",
    purpose: "Download the latest secure SQL cluster backup from S3 bucket",
    category: "Investigation",
    difficulty: "Beginner",
    usefulness: "95%",
    risk: "Safe",
    isDestructive: false,
    roles: ['swe', 'oncall'],
    whySuggested: "Retrieves the recent stable snapshot of production tables to begin primary server restore.",
    expectedOutput: "download: s3://gitlab-backups/latest_backup.sql to /var/lib/postgresql/backup.sql [OK]",
    affectedSystems: ["AWS S3", "PostgreSQL host"]
  },
  {
    name: "psql -U gitlab -d gitlabhq_production -f /var/lib/postgresql/backup.sql",
    purpose: "Rebuild primary PostgreSQL production schema and tables from backup",
    category: "Recovery Actions",
    difficulty: "Advanced",
    usefulness: "98%",
    risk: "High (Overwrites active schemas)",
    isDestructive: true,
    roles: ['swe', 'oncall'],
    whySuggested: "Performs full production table restoral, recovering deleted records from the secure backup snapshot.",
    expectedOutput: "SET\nCREATE TABLE\nALTER TABLE\nIMPORT 4.2M ROWS... [OK]",
    affectedSystems: ["PostgreSQL primary cluster"]
  },

  // Facebook BGP Outage
  {
    name: "ssh oob-admin@backup-router --port=2222",
    purpose: "Establish SSH session to backbone backup router via Out-of-Band (OOB) link",
    category: "Investigation",
    difficulty: "Intermediate",
    usefulness: "92%",
    risk: "Safe",
    isDestructive: false,
    roles: ['swe', 'oncall'],
    whySuggested: "Accesses backup network router interfaces when standard in-band gateways are down due to BGP drops.",
    expectedOutput: "Connecting to backup-router on OOB port 2222... [OK]\nWelcome oob-admin. backup-router#",
    affectedSystems: ["Backbone router interface"]
  },
  {
    name: "revert --file=/scripts/bgp/automated_withdrawal.sh --commit=last_known_good",
    purpose: "Revert BGP automated withdrawal script to the last known good configuration commit",
    category: "Recovery Actions",
    difficulty: "Advanced",
    usefulness: "95%",
    risk: "Medium",
    isDestructive: false,
    roles: ['swe', 'oncall'],
    whySuggested: "Reverts BGP route filtering typos that triggered global network withdrawals.",
    expectedOutput: "Reverted BGP routes configuration to version LKG-1.0. Routing rules prepared.",
    affectedSystems: ["BGP configuration fabric"]
  },
  {
    name: "reboot --force backbone-router-core-01",
    purpose: "Hard power-cycle the primary backbone core routing appliance",
    category: "Recovery Actions",
    difficulty: "Advanced",
    usefulness: "80%",
    risk: "High (Drops all routing queues)",
    isDestructive: false,
    roles: ['swe', 'oncall'],
    whySuggested: "Resets the physical routing tables and clears memory locks after a total peer routing crash.",
    expectedOutput: "Initiating force hardware reboot sequence... [OK]\nResetting AS filters.",
    affectedSystems: ["Physical Backbone Router Core"]
  },
  {
    name: "bgp advertise --routes=/backup_routes/all_routes.json",
    purpose: "Advertise secure backup routes via active external peer sessions",
    category: "Recovery Actions",
    difficulty: "Advanced",
    usefulness: "98%",
    risk: "Medium",
    isDestructive: false,
    roles: ['swe', 'oncall'],
    whySuggested: "Re-establishes internet routing pathing to restore external access to core application data layers.",
    expectedOutput: "Advertising BGP routes to peer 10.0.0.1... [OK]\nBGP hold time synced, all networks reachable.",
    affectedSystems: ["BGP Peering Session"]
  },

  // Cloudflare Global Outage
  {
    name: "cf-router rollback --config v1.2.3",
    purpose: "Rollback custom CF WAF config rules to stable version v1.2.3",
    category: "Recovery Actions",
    difficulty: "Intermediate",
    usefulness: "98%",
    risk: "Safe",
    isDestructive: false,
    roles: ['swe', 'oncall'],
    whySuggested: "Removes the CPU-saturating custom WAF regular expressions that caused 100% gateway lockups.",
    expectedOutput: "Rolling back cf-router to configuration signature v1.2.3... [OK]\nWAF rules compiled successfully.",
    affectedSystems: ["Cloudflare Ingress WAF Engine"]
  },
  {
    name: "cf-traffic throttle --retries 10",
    purpose: "Configure active client request retry limit throttle to 10 max per sec",
    category: "Monitoring",
    difficulty: "Beginner",
    usefulness: "85%",
    risk: "Safe",
    isDestructive: false,
    roles: ['swe', 'oncall'],
    whySuggested: "Throttles client retry storm loops to alleviate SRE gateway queue saturation thresholds.",
    expectedOutput: "Traffic rate throttled. Client retries capped at 10 max.",
    affectedSystems: ["Ingress client queue"]
  },
  {
    name: "cf-router restart --region EU-West",
    purpose: "Perform a rolling restart of WAF routing appliances in the EU-West region",
    category: "Recovery Actions",
    difficulty: "Intermediate",
    usefulness: "82%",
    risk: "Medium",
    isDestructive: false,
    roles: ['swe', 'oncall'],
    whySuggested: "Resets the region's active proxy processes, cleaning up frozen microservices.",
    expectedOutput: "Restarting cf-router hosts in region EU-West... [OK]\nRouting tables online.",
    affectedSystems: ["Cloudflare EU-West Routing Edge"]
  },
  {
    name: "cf-traffic shift --region EU-West --target US-East",
    purpose: "Failover and shift EU-West client traffic to active US-East edge data centers",
    category: "Recovery Actions",
    difficulty: "Advanced",
    usefulness: "90%",
    risk: "Medium",
    isDestructive: false,
    roles: ['swe', 'oncall'],
    whySuggested: "Bypasses the locked-up region completely by shifting traffic loads to healthy target data centers.",
    expectedOutput: "Rerouting EU-West ingress paths to US-East data center... [OK]\nLatency adjusted.",
    affectedSystems: ["Cloudflare Traffic load balancer"]
  }
];

const CATEGORY_STYLES = {
  'Investigation': { border: 'border-cyan-500/25 hover:border-cyan-500/60', text: 'text-cyan-400', bg: 'bg-cyan-500/5' },
  'Monitoring': { border: 'border-blue-500/25 hover:border-blue-500/60', text: 'text-blue-400', bg: 'bg-blue-500/5' },
  'Network Analysis': { border: 'border-emerald-500/25 hover:border-emerald-500/60', text: 'text-emerald-400', bg: 'bg-emerald-500/5' },
  'Database Inspection': { border: 'border-yellow-500/25 hover:border-yellow-500/60', text: 'text-yellow-400', bg: 'bg-yellow-500/5' },
  'Security Analysis': { border: 'border-rose-500/25 hover:border-rose-500/60', text: 'text-rose-400', bg: 'bg-rose-500/5' },
  'Recovery Actions': { border: 'border-purple-500/25 hover:border-purple-500/60', text: 'text-purple-400', bg: 'bg-purple-500/5' },
  'Verification': { border: 'border-orange-500/25 hover:border-orange-500/60', text: 'text-orange-400', bg: 'bg-orange-500/5' }
};

export function Terminal({ onCommand, scenario, incidentPhase, timeline, className = '' }) {
  const [value, setValue] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [hoveredCommand, setHoveredCommand] = useState(null);
  const [favorites, setFavorites] = useState(() => {
    try {
      const stored = localStorage.getItem('s5_fav_commands');
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  });

  const [history, setHistory] = useState([
    { type: 'sys', text: '[bridge] Incident terminal connected.' },
    { type: 'sys', text: '[bridge] Monitoring telemetry streams.' }
  ]);
  const [recentCommands, setRecentCommands] = useState([]);

  const historyEndRef = useRef(null);
  const inputRef = useRef(null);

  const roleRaw = scenario?.role || 'swe';
  const role = roleRaw.includes('swe') || roleRaw.includes('oncall') ? 'swe' : 
               roleRaw.includes('cyber') || roleRaw.includes('security') ? 'cybersecurity' : 
               roleRaw.includes('pr') || roleRaw.includes('comms') ? 'pr' : roleRaw;

  useEffect(() => {
    localStorage.setItem('s5_fav_commands', JSON.stringify(favorites));
  }, [favorites]);

  useEffect(() => {
    historyEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history]);

  // Filter commands by active role and search queries
  const filteredCommands = useMemo(() => {
    let list = COMMAND_DATABASE.filter(cmd => 
      cmd.roles.includes(role) || 
      (role === 'swe' && cmd.roles.includes('oncall')) ||
      (role === 'cybersecurity' && cmd.roles.includes('cyber')) ||
      (role === 'pr' && cmd.roles.includes('comms'))
    );

    if (selectedCategory !== 'All') {
      list = list.filter(cmd => cmd.category === selectedCategory);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      list = list.filter(cmd => 
        cmd.name.toLowerCase().includes(query) || 
        cmd.purpose.toLowerCase().includes(query) || 
        cmd.category.toLowerCase().includes(query)
      );
    }

    return list;
  }, [role, selectedCategory, searchQuery]);

  // Extract dynamic recommended commands based on scenario possible actions
  const recommendedCommands = useMemo(() => {
    const scenarioId = scenario?.id;
    if (scenarioId === 'knight_capital_disaster') {
      const targetNames = [
        'ack',
        "ssh smars6 'killall -9 power_peg_test'",
        "iptables -A INPUT -p tcp --dport 9090 -j DROP -s smars6",
        "git revert HEAD~1 --no-edit && ./deploy.sh --rollback",
        "notify_sec --case-id=KC-2012-08-01 --severity=market-disruption",
        "resolve"
      ];
      return filteredCommands.filter(cmd => targetNames.includes(cmd.name));
    }
    if (scenarioId === 'gitlab_database_deletion') {
      const targetNames = [
        'ack',
        "sudo systemctl stop gitlab-background-jobs",
        "lvcreate --size 300G --name snap gitlab_vg",
        "aws s3 cp s3://gitlab-backups/latest_backup.sql /var/lib/postgresql/backup.sql",
        "psql -U gitlab -d gitlabhq_production -f /var/lib/postgresql/backup.sql",
        "resolve"
      ];
      return filteredCommands.filter(cmd => targetNames.includes(cmd.name));
    }
    if (scenarioId === 'facebook_bgp_outage') {
      const targetNames = [
        'ack',
        "ssh oob-admin@backup-router --port=2222",
        "revert --file=/scripts/bgp/automated_withdrawal.sh --commit=last_known_good",
        "reboot --force backbone-router-core-01",
        "bgp advertise --routes=/backup_routes/all_routes.json",
        "resolve"
      ];
      return filteredCommands.filter(cmd => targetNames.includes(cmd.name));
    }
    if (scenarioId === 'cloudflare_global_outage') {
      const targetNames = [
        'ack',
        "cf-router rollback --config v1.2.3",
        "cf-traffic throttle --retries 10",
        "cf-router restart --region EU-West",
        "cf-traffic shift --region EU-West --target US-East",
        "resolve"
      ];
      return filteredCommands.filter(cmd => targetNames.includes(cmd.name));
    }

    const scenarioActions = scenario?.possibleActions || scenario?.scoring?.winning_actions || [];
    let list = filteredCommands.filter(cmd => 
      scenarioActions.some(sa => sa.toLowerCase().trim() === cmd.name.toLowerCase().trim())
    );
    
    // Fallback recommended list for all SWE scenarios so they have the playbook command cards experience
    if (list.length === 0 && (role === 'swe' || role === 'oncall')) {
      const targetNames = [
        'ack',
        'kubectl get pods',
        'kubectl logs <pod-name>',
        'kubectl describe pod <pod-name>',
        'kubectl top pods',
        'kubectl rollout undo <dep-name>',
        'resolve'
      ];
      list = filteredCommands.filter(cmd => targetNames.includes(cmd.name));
    }
    return list;
  }, [scenario, filteredCommands, role]);

  const toggleFavorite = (cmdName, e) => {
    e.stopPropagation();
    setFavorites(prev => ({
      ...prev,
      [cmdName]: !prev[cmdName]
    }));
  };

  const handleCommandCardClick = (cmd) => {
    setValue(cmd.name);
    inputRef.current?.focus();
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    const cmd = value.trim();
    if (!cmd) return;

    // Track command history
    setHistory(prev => [...prev, { type: 'cmd', text: `$ ${cmd}` }]);
    setRecentCommands(prev => {
      const filtered = prev.filter(c => c !== cmd);
      return [cmd, ...filtered].slice(0, 5); // Cache top 5 recently run
    });
    setValue('');

    if (cmd.toLowerCase() === 'help') {
      setHistory(prev => [...prev, { 
        type: 'sys', 
        text: 'OPERATIONAL HELP: Click recommended command cards to auto-complete, or use search fields to isolate diagnostics.' 
      }]);
      return;
    }

    if (onCommand) {
      setHistory(prev => [...prev, { type: 'sys', text: 'Executing...' }]);
      const result = await onCommand(cmd);
      if (result && result.terminal_output) {
        setHistory(prev => {
          const filtered = prev.filter(l => l.text !== 'Executing...');
          return [...filtered, { type: 'output', text: result.terminal_output }];
        });
      } else {
        setHistory(prev => {
          const filtered = prev.filter(l => l.text !== 'Executing...');
          return [...filtered, { type: 'sys', text: '[shell] request executed successfully.' }];
        });
      }
    }
  };

  // Auto-completing parameter chips logic
  const parameterExtraction = useMemo(() => {
    // If value matches <something>, find the command with those params
    const matchedCmd = COMMAND_DATABASE.find(c => {
      const parts = c.name.split(/[<>]/);
      return parts.length > 1 && value.includes(parts[0].trim());
    });
    
    if (matchedCmd && matchedCmd.parameters) {
      const placeholder = value.match(/<[^>]+>/)?.[0] || '';
      return {
        placeholder,
        chips: matchedCmd.parameters
      };
    }
    return null;
  }, [value]);

  const handleChipClick = (chipValue) => {
    if (parameterExtraction && parameterExtraction.placeholder) {
      const updated = value.replace(parameterExtraction.placeholder, chipValue);
      setValue(updated);
      inputRef.current?.focus();
    }
  };

  const categories = ['All', 'Investigation', 'Monitoring', 'Network Analysis', 'Security Analysis', 'Recovery Actions', 'Verification'];

  const phasePrompt = {
    detection: '[alert] abnormal telemetry signatures detected.',
    investigation: '[investigation] tracing root cause vectors via SRE dashboards.',
    escalation: '[sev0] executive escalation active. SLA degradation accumulating.',
    mitigation: '[mitigation] infrastructure containment protocols in progress.',
    recovery: '[recovery] workload states recovering toward production baseline.'
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className={`bg-[#060a0f] border border-slate-850 overflow-hidden rounded-xl shadow-2xl flex flex-col h-full relative z-10 ${className}`}
    >
      {/* Console Header Bar */}
      <div className="flex items-center justify-between border-b border-slate-900 px-4 py-3 bg-[#080d14]/80 shrink-0 select-none">
        <div className="flex items-center gap-2">
          <div className="h-1.5 w-1.5 rounded-full bg-ops-glow/85 animate-pulse shadow-[0_0_8px_#00f0ff]" />
          <div className="font-mono text-[10px] tracking-widest text-slate-400 font-extrabold uppercase">
            Incident Operations Workspace
          </div>
          <span className={`text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border border-slate-800 bg-slate-900 text-slate-500`}>
            {role.toUpperCase()} COMMAND DECK
          </span>
        </div>
        <div className="font-mono text-[9px] text-slate-655 flex items-center gap-1.5">
          <Server size={10} /> crisulator-shell-v2
        </div>
      </div>

      {/* Dynamic phase banner */}
      <div className="border-b border-slate-900/60 px-4 py-2 font-mono text-[9px] text-slate-500 bg-[#070b10] select-none uppercase tracking-widest flex items-center justify-between">
        <span>{phasePrompt[incidentPhase] || '[active] system telemetry online.'}</span>
        <span className="text-[8px] text-slate-600">Guidance System Active</span>
      </div>

      {/* GUIDED ACTION INTERACTIVE WORKSPACE DECK */}
      <div className="bg-[#070b10]/80 border-b border-slate-900 p-4 shrink-0 flex flex-col gap-3 relative select-none">
        {/* Search and category filters */}
        <div className="flex flex-col sm:flex-row gap-2 justify-between items-stretch sm:items-center">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" size={12} />
            <input 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter playbooks or commands..."
              className="w-full bg-[#0a0f16] border border-slate-850 hover:border-slate-750 focus:border-purple-500/50 rounded px-2.5 py-1.5 pl-7 text-[10px] font-mono text-slate-300 outline-none transition-all placeholder:text-slate-600"
            />
          </div>
          
          <div className="flex gap-1 overflow-x-auto scrollbar-none pb-1 sm:pb-0">
            {categories.slice(0, 5).map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-2 py-1 rounded text-[8px] font-mono font-bold uppercase border transition-all shrink-0 cursor-pointer ${
                  selectedCategory === cat
                    ? 'bg-purple-950/40 text-purple-400 border-purple-500/40 shadow-sm'
                    : 'bg-[#0a0f16]/40 border-slate-850 text-slate-500 hover:text-slate-350 hover:border-slate-800'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Recommended Cards Display Grid */}
        <div className="relative">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 max-h-[145px] overflow-y-auto pr-1 scrollbar-ops">
            {filteredCommands.length === 0 ? (
              <div className="col-span-full py-4 text-center text-[10px] text-slate-600 font-mono italic border border-dashed border-slate-850 rounded-xl">
                No playbook commands match current filter query.
              </div>
            ) : (
              filteredCommands.map(cmd => {
                const isRecommended = recommendedCommands.some(rc => rc.name === cmd.name);
                const isFav = favorites[cmd.name];
                const catStyle = CATEGORY_STYLES[cmd.category] || { border: 'border-slate-800', text: 'text-slate-400', bg: 'bg-slate-900/5' };

                return (
                  <motion.div
                    key={cmd.name}
                    whileHover={{ scale: 1.015, y: -1 }}
                    onClick={() => handleCommandCardClick(cmd)}
                    onMouseEnter={() => setHoveredCommand(cmd)}
                    onMouseLeave={() => setHoveredCommand(null)}
                    className={`p-3 rounded-xl border bg-[#080d14]/75 ${catStyle.border} ${cmd.isDestructive ? 'hover:border-red-500/40 hover:shadow-[0_0_12px_rgba(239,68,68,0.1)]' : 'hover:shadow-[0_0_12px_rgba(168,85,247,0.08)]'} cursor-pointer relative overflow-hidden transition-all duration-300 group`}
                  >
                    {/* Top Recommended glow border indicator */}
                    {isRecommended && (
                      <div className="absolute top-0 right-0 w-2 h-2 bg-purple-500 rounded-bl-lg shadow-[0_0_4px_#a855f7]" title="Top Action Recommended" />
                    )}

                    <div className="flex justify-between items-start mb-1.5 gap-2">
                      <span className={`text-[7px] font-mono font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${catStyle.bg} ${catStyle.text}`}>
                        {cmd.category}
                      </span>
                      <div className="flex items-center gap-1">
                        {isRecommended && (
                          <span className="text-[6.5px] font-mono font-black uppercase text-purple-400 animate-pulse bg-purple-950/20 px-1 rounded">AI SUGGESTED</span>
                        )}
                        <button
                          onClick={(e) => toggleFavorite(cmd.name, e)}
                          className="text-slate-600 hover:text-yellow-500 transition-colors"
                        >
                          <Star size={10} className={isFav ? 'fill-yellow-500 text-yellow-500' : ''} />
                        </button>
                      </div>
                    </div>

                    <div className="text-[10px] font-bold font-mono text-slate-100 truncate flex items-center gap-1 group-hover:text-purple-300 transition-colors">
                      <code className="text-purple-300 font-mono truncate">{cmd.name}</code>
                    </div>
                    
                    <p className="text-[9px] text-slate-500 font-sans truncate mt-1 leading-normal">
                      {cmd.purpose}
                    </p>

                    <div className="flex justify-between items-center text-[7.5px] font-mono text-slate-600 border-t border-slate-900/60 mt-2 pt-1.5">
                      <span>UTIL: <span className="text-slate-400 font-bold">{cmd.usefulness}</span></span>
                      <span className={cmd.isDestructive ? 'text-red-500 font-bold' : 'text-slate-500'}>{cmd.risk.split(' ')[0]}</span>
                    </div>
                  </motion.div>
                );
              })
            )}
          </div>

          {/* DYNAMIC DETAILS HOVER TOOLTIP OVERLAY */}
          <AnimatePresence>
            {hoveredCommand && (
              <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="absolute z-30 left-2 right-2 bottom-full mb-2 bg-[#070b10]/95 border border-purple-500/30 rounded-xl p-4 shadow-[0_8px_32px_rgba(0,0,0,0.6)] backdrop-blur-md text-[10px] text-slate-300 space-y-2 select-text"
              >
                <div className="flex justify-between items-center border-b border-slate-900 pb-2">
                  <div className="flex items-center gap-2">
                    <code className="text-[11px] font-bold font-mono text-purple-300">{hoveredCommand.name}</code>
                    <span className={`text-[7px] font-mono font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border border-slate-800 bg-slate-900 text-slate-500`}>
                      {hoveredCommand.difficulty}
                    </span>
                  </div>
                  <span className={`text-[8px] font-mono font-bold uppercase px-1.5 rounded ${hoveredCommand.isDestructive ? 'bg-red-950/40 text-red-400 border border-red-900/20' : 'bg-green-950/40 text-green-400 border border-green-900/20'}`}>
                    {hoveredCommand.risk}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <div>
                      <span className="text-[8px] font-bold uppercase text-slate-500 block">Why suggested:</span>
                      <p className="text-slate-350 leading-relaxed font-sans">{hoveredCommand.whySuggested}</p>
                    </div>
                    <div>
                      <span className="text-[8px] font-bold uppercase text-slate-500 block">Affected Targets:</span>
                      <div className="flex flex-wrap gap-1 mt-0.5">
                        {hoveredCommand.affectedSystems.map(sys => (
                          <span key={sys} className="px-1 py-0.5 rounded bg-slate-900 border border-slate-850 font-mono text-[8px] text-slate-400 uppercase">{sys}</span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div>
                    <span className="text-[8px] font-bold uppercase text-slate-500 block mb-0.5">Expected stdout preview:</span>
                    <pre className="p-2 rounded bg-black/45 border border-slate-900 text-[8.5px] font-mono text-purple-300 leading-normal overflow-x-auto whitespace-pre-wrap select-all">
                      {hoveredCommand.expectedOutput}
                    </pre>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* SHELL LOG PANEL */}
      <div className="flex-1 overflow-y-auto px-4 py-3.5 font-mono text-[11px] text-slate-400 space-y-1.5 bg-black/5 min-h-[100px] scrollbar-ops">
        {history.map((line, idx) => (
          <div 
            key={idx} 
            className={`leading-relaxed break-all whitespace-pre-wrap ${
              line.type === 'cmd' ? 'text-ops-glow font-medium' :
              (line && typeof line.text === 'string' && line.text.includes('[system]')) ? 'text-ops-green font-medium' :
              (line && typeof line.text === 'string' && (line.text.includes('[sev0]') || line.text.includes('[alert]') || line.text.includes('[WARNING]') || line.text.includes('CRITICAL'))) ? 'text-ops-red font-medium animate-pulse' :
              'text-slate-455'
            }`}
          >
            {line.text}
          </div>
        ))}
        <div ref={historyEndRef} />
      </div>

      {/* PARAMETER COMPLETION CHIPS */}
      <AnimatePresence>
        {parameterExtraction && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="px-4 py-2 bg-[#080d14] border-t border-slate-900 flex flex-wrap items-center gap-1.5 select-none relative z-10 shrink-0"
          >
            <span className="text-[8px] font-mono font-bold text-slate-500 uppercase mr-1">AutoComplete {parameterExtraction.placeholder || 'param'}:</span>
            {parameterExtraction.chips.map(chip => (
              <button
                key={chip}
                onClick={() => handleChipClick(chip)}
                className="px-2 py-0.5 rounded border border-purple-500/20 bg-purple-500/10 hover:bg-purple-600 hover:text-white text-[9px] font-mono text-purple-300 font-bold transition-all cursor-pointer"
              >
                {chip}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* CONSOLE INPUT BAR */}
      <form
        className="flex items-center gap-2 px-4 py-3 bg-[#070b10] border-t border-slate-900 shrink-0"
        onSubmit={handleSubmit}
      >
        <div className="select-none font-mono text-sm text-ops-glow font-bold">$</div>
        <input
          ref={inputRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={`Enter commands or click cards above...`}
          className="flex-1 bg-transparent font-mono text-xs text-slate-100 placeholder:text-slate-650 outline-none border-none focus:ring-0 p-0"
          spellCheck={false}
          autoComplete="off"
        />
        
        {value.trim() && (
          <button
            type="button"
            onClick={() => setValue('')}
            className="text-slate-600 hover:text-slate-300 font-mono text-[9px] font-bold uppercase transition-colors px-1"
          >
            Clear
          </button>
        )}

        <button
          type="submit"
          className="rounded border border-purple-500/20 bg-purple-500/10 px-3.5 py-1.5 font-mono text-[10px] text-purple-300 font-extrabold transition-all hover:bg-purple-600 hover:text-white hover:border-purple-500 shadow-[0_0_10px_rgba(168,85,247,0.15)] cursor-pointer"
        >
          EXECUTE
        </button>
      </form>
    </motion.div>
  );
}