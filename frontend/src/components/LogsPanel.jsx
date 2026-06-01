import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';

function nowHHMMSS() {
  const d = new Date();
  const p2 = (n) => String(n).padStart(2, '0');
  return `${p2(d.getHours())}:${p2(d.getMinutes())}:${p2(d.getSeconds())}`;
}

// CHANGE 1: Updated function signature to ingest global simulator state parameters
export function LogsPanel({ initialLines = [], scenario, incidentPhase, timeline, isMasked = false }) {
  const lines = initialLines;
  const scrollerRef = useRef(null);

  // Extract role identifier safely (fallback to 'swe')
  const role = scenario?.role || 'swe';

  // Distinct role-specific operational telemetry logs
  const LOG_TEMPLATES = useMemo(() => ({
    swe: [
      'kube: readiness probe failed pod=payments-api',
      'edge-gw: elevated 5xx rate detected',
      'redis: memory pressure exceeding threshold',
      'db: replication lag increasing',
      'slo: error budget burn rate critical'
    ],
    cybersecurity: [
      'auth: suspicious login from unknown ASN',
      'firewall: outbound traffic spike detected',
      'audit: privilege escalation attempt flagged',
      'ids: reverse shell signature matched',
      'siem: multiple failed MFA challenges'
    ],
    pr: [
      'social: negative sentiment spike detected',
      'media: journalist requesting comment',
      'support: customer complaint volume rising',
      'brandwatch: outage hashtag trending',
      'exec: board requesting public statement'
    ]
  }), []);

  // Distinct scenario-specific operational telemetry logs
  const SCENARIO_LOG_TEMPLATES = useMemo(() => ({
    payments_retry_storm: [
      'db: lock contention on orders table index',
      'payments-api: upstream socket timed out at gateway',
      'ingress: active client retries spiking to 12.8k rps',
      'pg_stat: transaction queue length exceeded 500 connections',
      'kube: ReplicaSet saturation - scaling payments-api...',
      'gateway: retry-after header ignored by legacy clients'
    ],
    aws_s3_outage: [
      'aws: s3:GetObject latency p99 > 15s in us-east-1',
      's3_routing: fallback config file s3_routing.yaml invalid',
      'gateway: S3 storage interface thread pool exhausted',
      'storage: bucket read failures spiking, HTTP 500',
      'kube: pod restart loop on storage-agent',
      'alert: local cached objects stale, invalid routes'
    ],
    cloudflare_global_outage: [
      'cloudflare: border gateway routing advertisement withdrew',
      'edge: ingress cloudflare-waf CPU utilization 100%',
      'nginx: regex compile error on custom waf_rules.conf',
      'dns: recursive lookup failure for api.crisulator.io',
      'gateway: proxy routing loop detected, HTTP 502 Bad Gateway',
      'cdn: origin shield unreachable in 8 edge zones'
    ],
    facebook_bgp_outage: [
      'bgp: BGP peer session 10.0.0.1 closed: HoldTimer expired',
      'router: invalid AS-path filter applied in bgp_peers.cfg',
      'dns: authority name servers withdrew BGP routes',
      'network: unreachable route to internal backbone fabric',
      'alert: zero routes active on production edge gateway',
      'console: remote console OOB disconnected'
    ],
    gitlab_database_deletion: [
      'db: manual execution of db_cleanup.sh started',
      'postgresql: rm -rf executed on active replica data directory',
      'db: WAL archiver failed to sync checkpoint',
      'storage: disk space alert: active primary database data missing',
      'alert: pg_stat_activity shows zero active read queries',
      'replica: connection refused: database system is shutting down'
    ],
    knight_capital_disaster: [
      'trading: router.cpp: aggressive live order loop detected',
      'exchange: volume spike on symbol XYZ: 4.2M orders/sec',
      'brokerage: capital reserve margins depleted past limits',
      'router: power peg feature executing on legacy software build',
      'trading: infinite order route loop locking primary memory',
      'alert: broker margin call triggered, critical liquidation'
    ],
    uber_mfa_attack: [
      'audit: session creation bypassed standard VPN auth',
      'mfa: Duo Push fatigue event: 24 requests in 2 minutes',
      'vpn: contractor Duo denial overridden by secondary authentication',
      'auth: session IP leased from Moscow proxy (185.220.101.4)',
      'powershell: payload injected to AD domain controller via remote script (JHN5cyA9IE5ldy1PYmplY3QgU3lzdGVtLk5ldC5XZWJDbGllbnQ7ICRzeXMuRG93bmxvYWRGaWxlKCdodHRwOi8vMTg1LjE0My4yMjMuNDEvcGF5bG9hZC5leGUnLCAnJGVudjpURU1QL3N5cy5leGUnKTsgU3RhcnQtUHJvY2VzcygnJGVudjpURU1QL3N5cy5leGUnKSAtV2luZG93U3R5bGUgSGlkZGVuOw==)',
      'contain: lateral movement detected to contractor workspace'
    ],
    colonial_pipeline_ransomware: [
      'vpn: DarkSide legacy VPN account connection from 94.130.12.3',
      'ot_network: anomalous SCADA/PLC read operations on segment 4',
      'malware: ransomware payload darkside_backdoor.exe compiled: JGMgPSBOZXctT2JqZWN0IFN5c3RlbS5OZXQuU29ja2V0cy5UQ1BDbGllbnQoJzkzLjE4NC4yMTYuMzQnLDQ0NDQpOyAkcyA9ICRjLkdldFN0cmVhbSgpOyB3aGlsZSgkYy5Db25uZWN0ZWQpIHsgLyogRGFya1NpZGUgUmFuc29td2FyZSBCYWNrZG9vciAqLyB9',
      'system: cryptor module started encrypting volume /vol/data',
      'ot: pipeline pressure telemetry stream interrupted',
      'contain: unauthorized privilege shift on domain admin'
    ],
    solarwinds_supply_chain: [
      'build: golden ticket injection into SolarWinds.Orion.Core.BusinessLayer.dll',
      'network: Sunburst compiler backdoor payload active: IyBTdW5idXJzdCBCYWNrZG9vciBDb21waWxlciBJbmplY3Rvcg0KZnVuY3Rpb24gSW5qZWN0LUJhY2tkb29yIHsNCiAgaWYgKFRlc3QtUGF0aCAiLlxzb3VyY2VcY29yZS5jcyIpIHsNCiAgICBBZGQtQ29udGVudCAiLlxzb3VyY2VcY29yZS5jcyIgIlxuLy8gU3VuYnVyc3QgQmFja2Rvb3JcbnB1YmxpYyBzdGF5aWMgdm9pZCBFeGZpbHRyYXRlKCkgeyBHZXQtQUQtVmF1bHQtVG9rZW5zKCk7IH0iDQogIH0NCn0=',
      'dns: outbound domain lookup to avsvmcloud.com',
      'exfil: bulk telemetry data encoded inside HTTP GET payloads',
      'secops: Golden SAML token signature injection identified',
      'auth: domain administrator bypass via federated certificate'
    ],
    target_retail_breach: [
      'network: external HVAC subcontractor jump-box established SSH link',
      'pos: memory scrapers active on register memory: IyBQT1MgVHJhY2stMiBDcmVkaXQgQ2FyZCBNZW1vcnkgU2NyYXBlcg0KJHByb2Nlc3NlcyA9IEdldC1Qcm9jZXNzOw0KZm9yZWFjaCAoJHAgaW4gJHByb2Nlc3Nlcykgew0KICBpZiAoJHAuTmFtZSAtbGlrZSAiKnBvcyoiKSB7DQogICAgW1N5c3RlbS5JTy5GaWxlXTo6V3JpdGVBbGxUZXh0KCIkZW52OlRFTVAvY2FyZHMudHh0IiwgIlNjcmFwZWQ6IDQxMTEtWFhYWC1YWFhYLTExMTE7IEVYUDogMTIvMjg7IENWVjogOTk5Iik7DQogIH0NCn0=',
      'vlan: unsegmented network path from billing to internal credit cards',
      'exfil: bulk raw text file transfer of card numbers via FTP',
      'audit: credential theft tools executed in memory',
      'alert: point-of-sale central database credentials dumped'
    ],
    equifax_breach: [
      'httpd: Apache Struts exploit CVE-2017-5638 injected: IyBBcGFjaGUgU3RydXRzIFJlbW90ZSBTaGVsbCBFeHBsb2l0IChDVkUtMjAxNy01NjM4KQ0Kd2hvYW1pOw0KY2F0IC9ldGMvcGFzc3dkOw0KcGdfZHVtcCAtVSByb290IGNvbnN1bWVyX2NyZWRpdF9kYXRhYmFzZSA+IC90bXAvY3JlZGl0X2R1bXAuc3FsOw0KY3VybCAtWCBQT1NUIC1GICJkYXRhPUBsdG1wL2NyZWRpdF9kdW1wLnNxbCIgaHR0cDovLzE5OC41MS4xMDAuNzIvdXBsb2FkOw==',
      'db: massive bulk query select on primary tax_id table',
      'exfil: gzip payload transferred over secure TLS connection',
      'system: whoami returned uid=0 (root) on web portal host',
      'alert: unencrypted customer personal records retrieved',
      'audit: file upload path abused to drop custom web shell'
    ],
    boeing_737max_crisis: [
      'press: Reuters publishing draft: \'MCAS flaw suspected in crash\'',
      'social: hashtag #737MaxGrounding trending globally',
      'faa: regulatory notice of inquiry into MCAS certification',
      'airlines: flight operations center requesting immediate simulator telemetry',
      'crisis: internal memo leak: engineers flagged sensor issues in 2016',
      'support: cancellation queue spikes for airline tickets'
    ],
    ghc_crisis: [
      'comms: negative sentiment spike: diversity panel cancelled',
      'press: Bloomberg draft: \'GHC Keynote Sparking Executive Outrage\'',
      'social: tech Twitter trending #GHCOutrage: \'Systemic bias in tech\'',
      'organizer: booth coordinators withdrawing from main hall',
      'pr: AP journalist calling PR line requesting executive response',
      'crisis: internal Slack leak of keynote feedback surveys'
    ],
    pepsi_ad_backlash: [
      'media: CNBC broadcast: \'Pepsi ad accused of trivializing protest movement\'',
      'social: hashtag #PepsiAdBacklash trending #1 worldwide',
      'sponsor: brand ambassadors requesting immediate contract revision',
      'support: retailer feedback: Pepsi product display boycotted in 4 regions',
      'crisis: creative deck leak detailing protest theme approvals',
      'pr: live press briefing scheduled in 60s for corporate comms response'
    ],
    samsung_note7_recall: [
      'media: viral video of thermal battery failure in airport terminal',
      'social: airline banners: \'Samsung Note 7 banned on all flights\'',
      'faa: emergency directive: strict device ban on domestic carriers',
      'support: battery safety reports spike 300% in 12 hours',
      'pr: media inquiries asking if battery vendor will be terminated',
      'crisis: stock price down 7.2% on market opening'
    ],
    united_airlines_crisis: [
      'press: viral video of passenger removal reaches 40M views',
      'social: boycott United campaigns trending on global networks',
      'pr: legal advisory: force majeure clause does not cover removal',
      'crisis: share value dropping, market capitalization down $1.4B',
      'exec: CEO requested to testify before congressional committee',
      'media: international news coverage focusing on customer treatment'
    ],
    volkswagen_dieselgate: [
      'press: EPA issuing notice of clean air act violation to VW',
      'social: hashtag #Dieselgate trending: \'defeat device exposed\'',
      'legal: class-action filing prepared by European consumer coalition',
      'media: technical breakdown of emissions bypass code published',
      'crisis: regulatory bodies worldwide ordering vehicle recall',
      'exec: emergency board meeting convened to address CEO status'
    ]
  }), []);

  // CHANGE 3: Dynamic phase-based status logs to structure incident progression
  const PHASE_LOGS = useMemo(() => ({
    detection: [
      'monitoring: anomaly threshold breach detected',
      'alerts: elevated latency observed across cluster route endpoints'
    ],
    investigation: [
      'investigation: tracing internal root cause vectors',
      'telemetry: narrowing affected microservice system boundaries'
    ],
    escalation: [
      'sev0: executive escalation protocol initiated',
      'bridge: emergency response workspace bridge active'
    ],
    mitigation: [
      'recovery: mitigation operational procedures applied',
      'services: workload stabilization profiles improving'
    ],
    recovery: [
      'systems: error rates declining toward historical baseline',
      'traffic: client session load recovery approaching normal balance'
    ]
  }), []);

  // CHANGE 5: Hidden investigative clues injected to reward parsing observation
  const clueLogs = useMemo(() => ({
    cybersecurity: [
      'clue: outbound traffic patterns targeting suspicious malicious IP range',
      'clue: web server version tracker shows unpatched vulnerability surface',
      'clue: unusual privileged administrative token usage signature detected'
    ],
    swe: [
      'clue: historical state data confirms deployment rollback restores partial traffic',
      'clue: customer retries amplifying gateway queue buffer saturation loops',
      'clue: intensive cache invalidation operations storm detected'
    ],
    pr: [
      'clue: targeted misinformation spreading on speculative social platforms',
      'clue: verified source indicates journalist leaked internal bridge snapshots',
      'clue: live metrics confirm enterprise customers demanding technical transparency'
    ]
  }), []);


  // Maintain screen anchor locks down on new row generations
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [lines]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className={`flex h-full min-h-0 flex-col overflow-hidden rounded bg-transparent ${isMasked ? 'blur-sm opacity-50 transition-all duration-1000' : ''}`}
    >
      {/* Panel Top Title Header */}
      <div className="flex items-center justify-between border-b border-ops-border bg-ops-desk/50 px-4 py-2 shrink-0">
        <div className="flex items-center gap-2">
          {/* CHANGE 8: Swapped out flashy cyberpunk indicators for minimal clean status badges */}
          <div className="h-1.5 w-1.5 rounded-full bg-green-500/80" />
          <div className="font-mono text-xs tracking-wide text-ops-muted font-semibold">
            STREAMING PRODUCTION TELEMETRY LOGS
          </div>
        </div>

        {/* CHANGE 7: Added dynamic status monitoring block header tags */}
        <div className="flex items-center gap-3">
          <div className="font-mono text-[9px] tracking-wider font-bold border border-ops-border px-2 py-0.5 rounded text-ops-muted/60 bg-black/20">
            PHASE: {incidentPhase?.toUpperCase() || 'DETECTION'}
          </div>
          <div className="font-mono text-[10px] text-ops-muted/40">tail -f console.log</div>
        </div>
      </div>

      {/* Scrolling Text Workspace Terminal Display Panel */}
      <div
        ref={scrollerRef}
        className="scrollbar-ops flex-1 overflow-auto p-4 font-mono text-[12px] leading-relaxed text-ops-muted bg-black/10"
      >
        {lines.map((l, idx) => {
          // Add semantic context parsing markers to color alerts or system commands differently
          let logColorClass = 'text-ops-muted/90';
          if (l.includes('EVENT:')) {
            logColorClass = 'text-ops-green font-bold tracking-wide border-y border-ops-green/10 bg-ops-green/5 py-0.5 my-1';
          } else if (l.includes('clue:')) {
            logColorClass = 'text-yellow-400 font-medium tracking-wide';
          } else if (l.includes('sev0:') || l.includes('critical') || l.includes('failed')) {
            logColorClass = 'text-ops-red font-medium';
          }

          return (
            <div key={`${idx}-${l}`} className={`group flex gap-3 ${logColorClass} hover:bg-white/5 px-1 rounded transition-colors`}>
              <span className="select-none text-ops-muted/30 group-hover:text-ops-muted/50 font-sans text-[11px]">
                {String(idx + 1).padStart(3, '0')}
              </span>
              <span className="break-all whitespace-pre-wrap">
                <span className="text-ops-glow/60 font-medium mr-1">{l.slice(0, 11)}</span>
                <span className="normal-case">{l.slice(11)}</span>
              </span>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}