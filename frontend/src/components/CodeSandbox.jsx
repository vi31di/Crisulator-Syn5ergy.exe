import React, { useState, useEffect } from 'react';
import { FileCode, Play } from 'lucide-react';

const SANDBOX_REGISTRY = {
  payments_retry_storm: {
    language: 'bash',
    template: `# Payments Retry Storm Recovery Runbook
# 1. Inspect live gateway status and connection errors
curl -X GET https://api.production.gateway/health

# 2. Halt retry storm using emergency connection drain
kubectl exec -it payments-deployment -- python -m scripts.drain_connections

# 3. Apply backup rate limiter configuration
kubectl apply -f configs/rate-limiter-emergency.yaml
`
  },
  aws_s3_outage: {
    language: 'bash',
    template: `# AWS S3 Failover Recovery Runbook
# 1. Perform DNS lookup diagnostic on primary global vault
nslookup s3-global-vault.aws.com

# 2. Terminate cascading us-east-1 DNS loop
kubectl exec -it s3-resolver -- dns-cli --terminate-loop --target s3-global-vault.aws.com

# 3. Reroute backup traffic away from US-EAST-1 to local US-WEST-2
kubectl set env deployment/s3-routing DEFAULT_REGION=us-west-2
`
  },
  cloudflare_global_outage: {
    language: 'bash',
    template: `# WAF Regex Backtracking Recovery Runbook
# 1. Probe local edge nodes for active worker load
curl -s http://localhost:8080/edge-metrics | grep cpu_usage

# 2. Hot-patch WAF configuration to disable vulnerable backtracking regex
nginx-waf-cli rules disable --rule-id WAF-510-BRUTE

# 3. Force safe reload on all edge Nginx routing containers
nginx -s reload
`
  },
  facebook_bgp_outage: {
    language: 'bash',
    template: `# BGP Peering Cascade Isolation Runbook
# 1. Query route leaks from peer maps
bgp-status --show-leaks --neighbor 129.250.0.11

# 2. Tear down compromised peer neighbor session to stop global leak
bgp-peer-ctl neighbor 129.250.0.11 shutdown

# 3. Push safe peer map to edge router interfaces
bgp-peer-ctl commit-config --file configs/bgp_peers_secure.cfg
`
  },
  gitlab_database_deletion: {
    language: 'bash',
    template: `# Postgres relfilenode filesystem restore
# 1. Check primary postgres mount directory storage space
df -h /var/lib/postgresql/data

# 2. Stop compromised PG engine to prevent corrupt WAL generation
pg_ctl stop -m immediate

# 3. Pull last clean database snapshot backup from remote S3 cold vault
aws s3 cp s3://db-backups-cold/gitlab_prod_0400.tar.gz ./db_restore.tar.gz
`
  },
  knight_capital_disaster: {
    language: 'bash',
    template: `# HFT Margin Breach Containment Runbook
# 1. Check current cash balance exposure on NYSE gateway
nyse-gateway-cli --exposure --account PEG_HFT_09

# 2. Kill the duplicate HFT trading daemon processes immediately
killall power_peg_hft_engine

# 3. Disable PowerPeg configuration flag to prevent trade generation
redis-cli SET trading:flags:power_peg 0
`
  },
  uber_mfa_attack: {
    language: 'bash',
    template: `# Cybersecurity Incident Containment Runbook
# 1. Identify active sessions for hijacked contractor account
vpn-session-manager list --user contractor.user@uber.com

# 2. Revoke contractor VPN session lease
vpn-session-manager terminate --user contractor.user@uber.com

# 3. Enable mandatory Duo number-matching policy
duo-policy update --policy-id mfa_default --enforce-number-match true
`
  },
  colonial_pipeline_ransomware: {
    language: 'bash',
    template: `# Pipeline Industrial Ransomware Isolation
# 1. Audit active VPN tunnel sessions
vpn-session-manager list

# 2. Immediately sever DarkSide ransomware jumpbox VPN tunnel lease
vpn-session-manager terminate --user vpn_darkside

# 3. Decouple IT billing systems from SCADA pipeline segments
isolate-network IT_segment OT_segment
`
  }
};

const defaultTemplates = {
  swe: {
    language: 'bash',
    template: `# Production Recovery Shell
# Investigate unhealthy services
kubectl get pods

# Scale infrastructure
kubectl scale deployment payments-api --replicas=10

# Restart ingress
kubectl rollout restart deployment ingress-gateway
`
  },
  cybersecurity: {
    language: 'bash',
    template: `# Incident Response Console
# Check active sessions
who

# Find suspicious processes
ps aux

# Check outbound traffic
netstat -antp

# Isolate compromised host
iptables -A INPUT -s suspicious_ip -j DROP
`
  },
  pr: {
    language: 'markdown',
    template: `# Public Statement Draft
We are actively investigating reports of service instability.
Our engineering and security teams are working to restore systems safely.
More updates will follow shortly.
`
  }
};

export const CodeSandbox = ({ scenario, phase, timeline, onCommand }) => {
  const role = scenario?.role || 'swe';
  const scenarioId = scenario?.id || 'payments_retry_storm';
  const sandbox = SANDBOX_REGISTRY[scenarioId] || scenario?.sandbox || defaultTemplates[role] || defaultTemplates['swe'];

  const [code, setCode] = useState(sandbox.template);
  const [output, setOutput] = useState('');

  // Track scenario swaps securely to override default templates when loading new incidents
  useEffect(() => {
    if (sandbox?.template) {
      setCode(sandbox.template);
      setOutput('');
    }
  }, [scenario, role, scenarioId]);

  // Ambient phase messages defining operational state narratives
  const phaseMessages = {
    detection: 'Initial anomaly detection underway.',
    investigation: 'Investigating root cause vectors.',
    escalation: 'Incident severity escalating rapidly.',
    mitigation: 'Mitigation procedures active.',
    recovery: 'Systems stabilizing toward recovery.'
  };

  const handleRun = async () => {
    if (!onCommand) {
      setOutput("Error: Kernel connection not established.");
      return;
    }
    
    setOutput("Executing runbook...\n");
    const lines = code.split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('#'));
    
    for (const cmd of lines) {
      setOutput(prev => prev + `\n$ ${cmd}\n`);
      try {
        const result = await onCommand(cmd);
        if (result && result.terminal_output) {
            setOutput(prev => prev + result.terminal_output + "\n");
        } else {
            setOutput(prev => prev + "[No Output]\n");
        }
      } catch (err) {
        setOutput(prev => prev + `[Error executing command: ${err.message}]\n`);
      }
      // Add a slight delay for realism
      await new Promise(r => setTimeout(r, 600));
    }
    setOutput(prev => prev + "\n[Runbook Execution Complete]");
  };

  return (
    <div className="flex-1 bg-transparent flex flex-col relative h-full">
      <div className="bg-ops-desk/50 px-4 py-2 flex items-center justify-between border-b border-ops-border">
        <div className="flex gap-2 items-center text-ops-muted/70 font-mono text-xs capitalize">
          <FileCode size={14} />
          {/* Dynamically display editor workspace languages */}
          {sandbox.language} workspace
        </div>
        <div className="flex gap-2">
          <button
            className="flex items-center gap-1 bg-ops-green/10 hover:bg-ops-green/20 text-ops-green border border-ops-green/30 px-2 py-1 rounded text-[10px] font-mono transition-colors"
            onClick={handleRun}
          >
            <Play size={10} /> RUN
          </button>
        </div>
      </div>

      {/* Ambient operational phase message banner */}
      <div className="px-4 py-2 text-[10px] font-mono text-ops-muted/50 border-b border-ops-border bg-ops-terminal/30 select-none">
        {phaseMessages[phase] || 'Incident status tracking operational.'}
      </div>

      <div className="flex-1 flex flex-col h-[calc(100%-64px)]">
        <textarea
          value={code}
          onChange={(e) => setCode(e.target.value)}
          className="flex-1 bg-ops-terminal text-ops-muted/90 font-mono text-sm p-4 outline-none resize-none scrollbar-ops border-none focus:ring-0"
          spellCheck="false"
        />
        <div className="h-24 bg-ops-desk/30 border-t border-ops-border p-2 font-mono text-xs text-ops-muted/80 overflow-y-auto scrollbar-ops">
          <div className="text-ops-muted/40 mb-1 tracking-widest text-[10px]">CONSOLE OUTPUT</div>
          <pre className="font-mono text-xs leading-relaxed whitespace-pre-line text-ops-muted/90">
            {output || 'Ready...'}
          </pre>
        </div>
      </div>
    </div>
  );
};