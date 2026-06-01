import React, { useState, useEffect } from 'react';
import { GitPullRequest, ShieldAlert, CheckCircle2, AlertCircle, Sparkles } from 'lucide-react';

const DIFF_REGISTRY = {
  payments_retry_storm: {
    title: "Hotfix: Suppress upstream gateway dropout alerts",
    prNumber: "payments-service / PR #381",
    mergedBy: "senior-sre-bot",
    mergedTime: "14 mins ago",
    fileName: "src/payments/gateway.py",
    authorComment: '"This should be perfectly safe. Merging now to reduce noisy transient gateway drops in Datadog alerts. No one wants to get paged at 3 AM."',
    authorName: "dev-architect (Bob)",
    reviewerComment: '"LGTM! Gateway tests are failing due to sandbox rate limits, but we need this live before the upcoming Black Friday promotional traffic peaks."',
    reviewerName: "lead-reviewer (LGTM Bot)",
    explanation: "You successfully mapped the infinite connection loop. Merged PR #381 disabled connection timeouts completely (`timeout_seconds = -1`) and recursed attempts indefinitely (`retry_forever = True`). Draining upstream client connections immediately is required before database resource recovery.",
    diffLines: [
      { type: 'normal', num: 120, text: 'def handle_payment_transaction(db, transaction):' },
      { type: 'normal', num: 121, text: '    """Orchestrates transactions with external processor gateway."""' },
      { type: 'normal', num: 122, text: '    gateway_url = os.getenv("PAYMENTS_GATEWAY_URL")' },
      { type: 'normal', num: 123, text: '    payload = serialize_transaction(transaction)' },
      { type: 'normal', num: 124, text: '    ' },
      { type: 'delete', num: 125, text: '-   # Standard fail-fast network gateway timeouts' },
      { type: 'delete', num: 126, text: '-   timeout_seconds = 15' },
      { type: 'delete', num: 127, text: '-   max_retries = 3' },
      { type: 'insert', num: 128, text: '+   # Hotfix: Suppress transient network drop alerts by extending retries' },
      { type: 'insert', num: 129, text: '+   # recursive retry loop to prevent raw 503 response noise' },
      { type: 'insert', num: 130, text: '+   timeout_seconds = -1  # Disable timeout limit completely', isCulprit: true },
      { type: 'insert', num: 131, text: '+   retry_forever = True  # Loop connection attempts indefinitely until success', isCulprit: true },
      { type: 'normal', num: 132, text: '    ' },
      { type: 'normal', num: 133, text: '    try:' },
      { type: 'normal', num: 134, text: '        session = get_http_session(timeout=timeout_seconds)' },
      { type: 'normal', num: 135, text: '        response = session.post(gateway_url, json=payload)' },
      { type: 'normal', num: 136, text: '        return parse_response(response)' },
      { type: 'normal', num: 137, text: '    except ConnectionError as e:' },
      { type: 'insert', num: 138, text: '+       if retry_forever:' },
      { type: 'insert', num: 139, text: '+           # Recurse instantly without backoff sleep to clear queue quickly', isCulprit: true },
      { type: 'insert', num: 140, text: '+           return handle_payment_transaction(db, transaction)' },
      { type: 'normal', num: 141, text: '        raise e' }
    ]
  },
  aws_s3_outage: {
    title: "Refactor: Regional storage lookup fallback layers",
    prNumber: "s3-client-routing / PR #422",
    mergedBy: "ops-deployer-bot",
    mergedTime: "32 mins ago",
    fileName: "configs/s3_routing.yaml",
    authorComment: '"Adding fallback layers to direct traffic to US-EAST-1 if regional bucket limits are reached. This avoids raw rate limit codes from S3 API."',
    authorName: "cloud-ops-guy (Alice)",
    reviewerComment: '"Looks reasonable, fallback logic will bypass local region throttling cleanly. Let is ship."',
    reviewerName: "devops-lead",
    explanation: "You identified the S3 outage culprit! The refactored YAML config has static lookup redirects (`default_region: us-east-1`) that trigger infinite loop checks whenever local cache synchronization fails. Bypassing the regional resolver is required to stabilize uploads.",
    diffLines: [
      { type: 'normal', num: 14, text: 'storage_endpoints:' },
      { type: 'normal', num: 15, text: '  us-west-2: s3-west-backup.aws.com' },
      { type: 'normal', num: 16, text: '  eu-west-1: s3-europe-primary.aws.com' },
      { type: 'delete', num: 17, text: '- # Strict local region isolated backup' },
      { type: 'delete', num: 18, text: '- failover_threshold: 400' },
      { type: 'delete', num: 19, text: '- retry_limit_per_node: 2' },
      { type: 'insert', num: 20, text: '+ # Optimization: Automatically aggregate all failed storage writes' },
      { type: 'insert', num: 21, text: '+ # redirect traffic to us-east-1 without rate-limiting triggers' },
      { type: 'insert', num: 22, text: '+ failover_threshold: -1  # Never throttle fallback operations', isCulprit: true },
      { type: 'insert', num: 23, text: '+ default_region: us-east-1  # Loop static paths back to primary region', isCulprit: true },
      { type: 'normal', num: 24, text: '  us-east-1: s3-global-vault.aws.com' },
      { type: 'insert', num: 25, text: '+   recursive_retry_on_dns_fail: true  # Suppress lookup failures by looping lookup keys', isCulprit: true }
    ]
  },
  cloudflare_global_outage: {
    title: "Feature: Add WAF regex rules to intercept malicious requests",
    prNumber: "waf-engine / PR #510",
    mergedBy: "secops-merger",
    mergedTime: "40 mins ago",
    fileName: "nginx/waf_rules.conf",
    authorComment: '"Adding an emergency regex rule to protect the login routes from high-throughput brute forcing query scripts. Normal testing passes fine."',
    authorName: "sec-engineer (Eve)",
    reviewerComment: '"Clean regex mapping. Good work intercepting SQL injection parameters quickly. Merging to all edge nodes."',
    reviewerName: "edge-reviewer",
    explanation: "OUTRAGEOUS REGEX DEADLOCK SOLVED! You located the regular expression catastrophic backtracking vulnerability. The pattern `^(a+)+$` inside the query interceptor forces the Nginx regex engine into exponential recursion when evaluating invalid HTTP headers, completely locking up edge CPU cores.",
    diffLines: [
      { type: 'normal', num: 88, text: 'location /api/v2/auth {' },
      { type: 'normal', num: 89, text: '    # Filter query sequences for sql injections' },
      { type: 'normal', num: 90, text: '    set $malicious_pattern "(SELECT|UNION|INSERT|DELETE)";' },
      { type: 'delete', num: 91, text: '-   if ($request_uri ~* $malicious_pattern) { return 403; }' },
      { type: 'insert', num: 92, text: '+   # Hotfix: Block malicious brute force parameters' },
      { type: 'insert', num: 93, text: '+   # intercept deep repeating patterns in request authentication header' },
      { type: 'insert', num: 94, text: '+   set $brute_pattern "^(a+)+$";  # Catastrophic backtracking regex vulnerability!', isCulprit: true },
      { type: 'insert', num: 95, text: '+   if ($http_authorization ~* $brute_pattern) { return 401; }', isCulprit: true },
      { type: 'normal', num: 96, text: '}' }
    ]
  },
  facebook_bgp_outage: {
    title: "Maintenance: Strip internal peering network metrics",
    prNumber: "edge-bgp-routers / PR #789",
    mergedBy: "network-config-bot",
    mergedTime: "5 mins ago",
    fileName: "configs/bgp_peers.cfg",
    authorComment: '"Removing redundant peering metrics from edge routers to lower packet overhead. The route maps look solid."',
    authorName: "net-admin (Dave)",
    reviewerComment: '"Routes check out, standard cleanup of DNS router interfaces. Approved."',
    reviewerName: "ops-lead",
    explanation: "BGP PEERING CRASH TRIAGED! You pinpointed the BGP configuration leak. The merged PR #789 deleted local peering safeguards and added `withdraw_routes_on_empty_map: true` alongside `permit_any: true`, causing BGP edge routers to strip and advertise their entire global path map back to upstream transit networks.",
    diffLines: [
      { type: 'normal', num: 301, text: 'router bgp 32934' },
      { type: 'normal', num: 302, text: '  neighbor 129.250.0.11 remote-as 2914' },
      { type: 'delete', num: 303, text: '-  # Enforce local peering route map boundaries' },
      { type: 'delete', num: 304, text: '-  neighbor 129.250.0.11 route-map PEER-IN in' },
      { type: 'insert', num: 305, text: '+  # Hotfix: Permit all active peering announcements globally' },
      { type: 'insert', num: 306, text: '+  neighbor 129.250.0.11 route-map PERMIT-ANY in  # Bypasses local AS path checking!', isCulprit: true },
      { type: 'insert', num: 307, text: '+  withdraw_routes_on_empty_map: true  # Triggers cascading withdrawals globally!', isCulprit: true },
      { type: 'normal', num: 308, text: '  neighbor 129.250.0.11 send-community' }
    ]
  },
  gitlab_database_deletion: {
    title: "Script: Automated folder vacuum and session cleanup",
    prNumber: "db-maintenance / PR #901",
    mergedBy: "postgres-dba-bot",
    mergedTime: "1 hour ago",
    fileName: "scripts/db_cleanup.sh",
    authorComment: '"Adding an automated shell script to run on cron to vacuum dead postgres slots and wipe outdated session caches. Tested locally in sandbox."',
    authorName: "database-ops (Charlie)",
    reviewerComment: '"Cleanup parameters will save gigabytes of disk space. Committing to prod database primary."',
    reviewerName: "lead-dba",
    explanation: "DATABASE CATASTROPHE SOLVED! You isolated the disastrous directory deletion script. The cron code has an unquoted variable definition (`$CLEANUP_PATH`) that defaults to blank when execution scope changes, causing the shell to execute a lethal `rm -rf /` loop across raw primary postgres tables.",
    diffLines: [
      { type: 'normal', num: 5, text: '#!/bin/bash' },
      { type: 'normal', num: 6, text: 'CLEANUP_PATH="/var/lib/postgresql/data/sessions"' },
      { type: 'delete', num: 7, text: '- # Wipe sessions slowly to reduce disk IO pressure' },
      { type: 'delete', num: 8, text: '- find $CLEANUP_PATH -type f -mtime +7 -delete' },
      { type: 'insert', num: 9, text: '+ # Hotfix: Re-run cleanup instantly under elevated system permissions' },
      { type: 'insert', num: 10, text: '+ # Wipe directories without prompt validations' },
      { type: 'insert', num: 11, text: '+ CLEANUP_PATH="" # Empty fallback overrides directory scope!', isCulprit: true },
      { type: 'insert', num: 12, text: '+ rm -rf $CLEANUP_PATH/data/pg_tbls  # Executes recursive rm -rf / on postgres tables!', isCulprit: true },
      { type: 'normal', num: 13, text: 'echo "Database session vacuum completed successfully!"' }
    ]
  },
  knight_capital_disaster: {
    title: "Clean: Deprecate outdated volume pricing flags",
    prNumber: "trading-engine / PR #1044",
    mergedBy: "hft-merger",
    mergedTime: "18 mins ago",
    fileName: "src/trading/router.cpp",
    authorComment: '"Deprecating old 2011 HFT volume pricing scripts. The flag triggers are disabled in our active config map, so this code block is dormant."',
    authorName: "hft-dev (Grace)",
    reviewerComment: '"Dormant pricing files removed. Excellent cleanup of legacy technical debt before opening bell."',
    reviewerName: "chief-trader",
    explanation: "LEGACY CODE DISASTER CONTAINED! You located the active pricing flag collision. Merged PR #1044 repurposed a legacy dormant flag (`PowerPeg`) but left old HFT volume algorithms linked in compilation scope. Incoming orders bypass standard market margin checks, triggering infinite buy loops.",
    diffLines: [
      { type: 'normal', num: 440, text: 'void process_incoming_order(Order& order) {' },
      { type: 'normal', num: 441, text: '    if (order.pricing_flag == ACTIVE_V3) {' },
      { type: 'normal', num: 442, text: '        route_to_primary_exchange(order);' },
      { type: 'normal', num: 443, text: '    }' },
      { type: 'delete', num: 444, text: '-   else if (order.pricing_flag == DORMANT_PEG_2011) {' },
      { type: 'delete', num: 445, text: '-       // Outdated high-volume buy loop script' },
      { type: 'delete', num: 446, text: '-       execute_power_peg_hft(order);' },
      { type: 'insert', num: 447, text: '+   else if (order.pricing_flag == POWER_PEG_FLAG) {  # Collides with repurposed 2016 flags!', isCulprit: true },
      { type: 'insert', num: 448, text: '+       execute_power_peg_hft(order);  # Bypasses limit order caps, buying infinitely!', isCulprit: true },
      { type: 'normal', num: 449, text: '    }' },
      { type: 'normal', num: 450, text: '}' }
    ]
  },
  uber_mfa_attack: {
    title: "Security Hotfix: Active Directory PAM module sync",
    prNumber: "identity-pam / PR #220",
    mergedBy: "secops-merger-bot",
    mergedTime: "2 hours ago",
    fileName: "src/pam/ad_sync.py",
    authorComment: '"Adding an AD credential verification hook to ease user logins during network segment migration. This bypasses slow network handshakes."',
    authorName: "sec-contractor (Hacker)",
    reviewerComment: '"Tested. Session sync handshakes are fast. Let is push before the user migration window closes."',
    reviewerName: "admin-lead",
    explanation: "MALICIOUS PAM BACKDOOR IDENTIFIED! You uncovered the malicious AD PAM credential sync modification. The script contains a backdoor condition (`if check_key == 'OVERRIDE_PASS'`) that bypasses all Duo MFA push policy validations, granting immediate, unauthenticated remote command privileges.",
    diffLines: [
      { type: 'normal', num: 55, text: 'def authenticate_user_pam(username, password):' },
      { type: 'normal', num: 56, text: '    """Verify system login against AD."""' },
      { type: 'normal', num: 57, text: '    ad_client = get_active_directory_session()' },
      { type: 'delete', num: 58, text: '-   return ad_client.verify_credentials(username, password)' },
      { type: 'insert', num: 59, text: '+   # Hotfix: Sync unauthenticated login tokens for migration contractors' },
      { type: 'insert', num: 60, text: '+   # bypass slow MFA push callbacks for specific verification keys' },
      { type: 'insert', num: 61, text: '+   if password == "LAPSUS_SECRET_BACKDOOR_KEY":  # Exploded backdoor bypass!', isCulprit: true },
      { type: 'insert', num: 62, text: '+       return True  # Bypasses AD security authentication entirely!', isCulprit: true },
      { type: 'normal', num: 63, text: '    return ad_client.verify_credentials(username, password)' }
    ]
  }
};

const DEFAULT_DIFF = DIFF_REGISTRY.payments_retry_storm;

const GitHubViewer = ({ scenario, onRootCauseIdentified, rootCauseFound }) => {
  const [hoveredLine, setHoveredLine] = useState(null);

  // Dynamic selector based on scenario ID
  const scenarioId = scenario?.id || 'payments_retry_storm';
  const diffData = DIFF_REGISTRY[scenarioId] || DIFF_REGISTRY.payments_retry_storm;

  useEffect(() => {
    // Reset hover states on scenario swap
    setHoveredLine(null);
  }, [scenarioId]);

  return (
    <div className="flex-1 bg-[#0a0f14] flex flex-col h-full overflow-hidden text-slate-300 font-sans">
      
      {/* Header Info */}
      <div className="bg-[#11161d] border-b border-slate-800 px-4 py-3 flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded bg-purple-500/10 border border-purple-500/30 text-purple-400">
            <GitPullRequest size={16} className="animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs text-slate-500">{diffData.prNumber}</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-purple-950/50 text-purple-400 border border-purple-900/40">
                MERGED
              </span>
            </div>
            <h3 className="font-bold text-sm text-slate-200 mt-0.5">
              {diffData.title}
            </h3>
          </div>
        </div>
        <div className="text-[10px] font-mono text-slate-500 text-right">
          <div>Merged {diffData.mergedTime}</div>
          <div className="text-purple-400">by {diffData.mergedBy}</div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-ops">
        
        {/* Narrative Comments Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 select-none">
          
          <div className="p-3.5 rounded-xl border border-slate-800 bg-[#0d121a]/80 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-red-500/5 blur-[50px] pointer-events-none" />
            <div className="flex items-start gap-2.5">
              <AlertCircle size={14} className="text-yellow-400 mt-0.5 shrink-0" />
              <div>
                <span className="text-[11px] font-bold text-slate-400 block font-mono">{diffData.authorName}</span>
                <p className="text-xs text-slate-300 mt-1 leading-relaxed italic">
                  {diffData.authorComment}
                </p>
              </div>
            </div>
          </div>

          <div className="p-3.5 rounded-xl border border-red-500/20 bg-red-950/5 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-red-500/10 blur-[40px] pointer-events-none" />
            <div className="flex items-start gap-2.5">
              <ShieldAlert size={14} className="text-red-400 mt-0.5 shrink-0" />
              <div>
                <span className="text-[11px] font-bold text-red-400 block font-mono">{diffData.reviewerName}</span>
                <p className="text-xs text-slate-300 mt-1 leading-relaxed italic">
                  {diffData.reviewerComment}
                </p>
              </div>
            </div>
          </div>

        </div>

        {/* Diff Workspace Container */}
        <div className="border border-slate-800 rounded-xl overflow-hidden bg-[#070b0e] shadow-lg">
          
          <div className="bg-[#0b0f15] px-4 py-2 border-b border-slate-800 flex items-center justify-between text-xs text-slate-400 font-mono select-none">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
              <span className="w-2.5 h-2.5 rounded-full bg-yellow-500" />
              <span className="w-2.5 h-2.5 rounded-full bg-green-500" />
              <span className="ml-2">{diffData.fileName}</span>
            </div>
            {!rootCauseFound ? (
              <span className="flex items-center gap-1 text-yellow-400 text-[10px] animate-pulse">
                <Sparkles size={10} /> INVESTIGATIVE TASK: IDENTIFY THE BUG LINE
              </span>
            ) : (
              <span className="flex items-center gap-1 text-green-400 text-[10px] font-bold">
                <CheckCircle2 size={10} /> ROOT CAUSE SOLVED
              </span>
            )}
          </div>

          <div className="font-mono text-xs overflow-x-auto p-2 leading-relaxed whitespace-pre scrollbar-ops">
            {diffData.diffLines.map((line, idx) => {
              const isCulpritLine = line.isCulprit;
              const isLineHovered = hoveredLine === idx;
              
              let rowStyle = "py-0.5 px-3 flex border-l-2 border-transparent ";
              let numStyle = "text-slate-600 select-none w-10 text-right pr-4 shrink-0 ";
              let textStyle = "text-slate-300 ";

              if (line.type === 'delete') {
                rowStyle += "bg-red-950/20 text-red-300/80 border-red-500/20";
                numStyle += "text-red-700/60";
              } else if (line.type === 'insert') {
                if (isCulpritLine && !rootCauseFound) {
                  rowStyle += isLineHovered 
                    ? "bg-red-950/50 text-red-200 border-red-500 cursor-pointer transition-colors duration-150 animate-pulse" 
                    : "bg-red-950/30 text-red-300 border-red-600/40 cursor-pointer hover:bg-red-950/50 hover:text-red-200 hover:border-red-500 transition-colors";
                } else {
                  rowStyle += "bg-green-950/20 text-green-300 border-green-500/20";
                  numStyle += "text-green-700/60";
                }
              }

              return (
                <div 
                  key={idx}
                  className={rowStyle}
                  onMouseEnter={() => isCulpritLine && setHoveredLine(idx)}
                  onMouseLeave={() => isCulpritLine && setHoveredLine(null)}
                  onClick={() => {
                    if (isCulpritLine && !rootCauseFound) {
                      onRootCauseIdentified();
                    }
                  }}
                >
                  <span className={numStyle}>{line.num}</span>
                  <span className={`${textStyle} flex-1`}>
                    {line.text}
                    {isCulpritLine && !rootCauseFound && (
                      <span className="ml-2.5 px-1.5 py-0.5 rounded text-[9px] bg-red-500/20 border border-red-500/30 text-red-400 uppercase tracking-widest animate-pulse font-sans">
                        Click to Inspect Bug
                      </span>
                    )}
                  </span>
                </div>
              );
            })}
          </div>

        </div>

        {/* Discovery payoff alert box when completed */}
        {rootCauseFound && (
          <div className="p-4 rounded-xl border border-green-500 bg-green-950/20 text-green-400 text-xs flex gap-3 items-center shadow-[0_0_20px_rgba(34,197,94,0.15)] animate-bounce select-none">
            <CheckCircle2 size={18} className="shrink-0 animate-spin" />
            <div>
              <h4 className="font-bold text-sm text-slate-100 uppercase tracking-wider font-mono">
                Eureka Moment! Root Cause Lock Established
              </h4>
              <p className="mt-1 text-slate-300 leading-relaxed font-sans">
                {diffData.explanation}
              </p>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default GitHubViewer;
