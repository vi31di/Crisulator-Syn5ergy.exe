import React, { useState, useEffect } from 'react';
import { Database, Play, CheckCircle2, AlertTriangle, Terminal } from 'lucide-react';

const SQL_REGISTRY = {
  payments_retry_storm: [
    {
      id: 'active_sessions',
      label: 'Show Active Sessions',
      sql: "SELECT pid, query, state, wait_event_type, wait_event FROM pg_stat_activity WHERE state != 'idle';",
      output: [
        { pid: 1402, query: "INSERT INTO payment_records (id, amount, status) VALUES ...", state: "active", wait_event_type: "Lock", wait_event: "transactionid" },
        { pid: 1405, query: "INSERT INTO payment_records (id, amount, status) VALUES ...", state: "active", wait_event_type: "Lock", wait_event: "transactionid" },
        { pid: 1411, query: "INSERT INTO payment_records (id, amount, status) VALUES ...", state: "active", wait_event_type: "Lock", wait_event: "transactionid" },
        { pid: 1419, query: "INSERT INTO payment_records (id, amount, status) VALUES ...", state: "active", wait_event_type: "Lock", wait_event: "transactionid" },
        { pid: 1530, query: "SELECT * FROM payment_records WHERE status = 'PENDING' FOR UPDATE;", state: "active", wait_event_type: "Lock", wait_event: "relation" }
      ],
      comment: "WARNING: High number of write transactions are blocked waiting on an exclusive lock!"
    },
    {
      id: 'lock_queues',
      label: 'Examine Exclusive Locks',
      sql: "SELECT relation::regclass, mode, granted, pid FROM pg_locks WHERE NOT granted;",
      output: [
        { relation: "payment_records_pkey", mode: "RowShareLock", granted: "false", pid: 1402 },
        { relation: "payment_records", mode: "ExclusiveLock", granted: "false", pid: 1405 },
        { relation: "payment_records", mode: "ExclusiveLock", granted: "false", pid: 1411 },
        { relation: "payment_records", mode: "ExclusiveLock", granted: "false", pid: 1419 }
      ],
      comment: "CRITICAL: Table-level lock contention detected on relation 'payment_records'."
    },
    {
      id: 'pool_saturation',
      label: 'Check Connection Pools',
      sql: "SELECT count(*), state FROM pg_stat_activity GROUP BY state;",
      output: [
        { count: 98, state: "active (transaction lock waits)" },
        { count: 2, state: "idle" }
      ],
      comment: "SYSTEM ERROR: Database pool saturation at 98%. Available slots: 2/100."
    },
    {
      id: 'db_efficiency',
      label: 'Analyze Database Rollbacks',
      sql: "SELECT xact_commit, xact_rollback, conflicts FROM pg_stat_database WHERE datname = 'payments';",
      output: [
        { xact_commit: 14920, xact_rollback: 29402, conflicts: 1840 }
      ],
      comment: "DEGRADED: Rollbacks exceed commits by 2x. High volume of conflict retries observed."
    }
  ],
  aws_s3_outage: [
    {
      id: 's3_index_locks',
      label: 'Check S3 Index Locks',
      sql: "SELECT bucket_name, lock_type, waiting_pids, lock_duration_sec FROM s3_index_locks WHERE active = true;",
      output: [
        { bucket_name: "production-assets-us-east-1", lock_type: "exclusive_index_write", waiting_pids: "1829, 1844, 1902", lock_duration_sec: 420 },
        { bucket_name: "production-backups-us-east-1", lock_type: "shared_index_read", waiting_pids: "None", lock_duration_sec: 12 }
      ],
      comment: "WARNING: us-east-1 index bucket write lock has been held for over 7 minutes, causing secondary region lookup buffers to overflow."
    },
    {
      id: 's3_throughput',
      label: 'Inspect Throughput Maps',
      sql: "SELECT region, ingress_mbps, egress_mbps, error_rate_percent, status FROM s3_regional_throughput;",
      output: [
        { region: "us-east-1", ingress_mbps: 12450.2, egress_mbps: 1802.4, error_rate_percent: 84.5, status: "DEGRADED" },
        { region: "us-west-2", ingress_mbps: 450.1, egress_mbps: 980.2, error_rate_percent: 0.05, status: "HEALTHY" },
        { region: "eu-west-1", ingress_mbps: 890.4, egress_mbps: 1240.1, error_rate_percent: 0.12, status: "HEALTHY" }
      ],
      comment: "CRITICAL: US-EAST-1 is experiencing 84.5% error rates. All global S3 fallbacks routing to US-EAST-1 are backing up."
    },
    {
      id: 's3_dns_queues',
      label: 'DNS Failover Queues',
      sql: "SELECT queue_id, target_endpoint, retry_count, last_dns_resolution FROM s3_dns_retry_queue;",
      output: [
        { queue_id: "dns_q_849", target_endpoint: "s3-global-vault.aws.com", retry_count: 14502, last_dns_resolution: "FAILED (TIMEOUT)" },
        { queue_id: "dns_q_850", target_endpoint: "s3-global-vault.aws.com", retry_count: 14498, last_dns_resolution: "FAILED (TIMEOUT)" }
      ],
      comment: "CRITICAL: DNS query lookup retry counts exceed 14,000+ attempts without exponential backoff. Loop saturation is choking local DNS resolvers."
    }
  ],
  cloudflare_global_outage: [
    {
      id: 'waf_latency',
      label: 'WAF Latency Queues',
      sql: "SELECT rule_id, description, matched_requests_sec, regex_eval_time_ms, status FROM WafRulePerformance;",
      output: [
        { rule_id: "WAF-510-BRUTE", description: "Catastrophic Backtracking Prevention", matched_requests_sec: 14202, regex_eval_time_ms: 12540.8, status: "TIMEOUT_DREAD" },
        { rule_id: "WAF-SQL-INJ", description: "SQL Injection Filter", matched_requests_sec: 84, regex_eval_time_ms: 0.12, status: "HEALTHY" }
      ],
      comment: "CRITICAL: WAF Rule WAF-510-BRUTE is taking 12.5 seconds per request evaluation. Severe CPU exhaustion on all Edge Nginx workers."
    },
    {
      id: 'backtrack_diagnostics',
      label: 'Backtracking Diagnostics',
      sql: "SELECT worker_thread_id, active_regex, backtrack_depth, cpu_utilization_pct FROM RegexBacktrackTracker;",
      output: [
        { worker_thread_id: "edge_worker_0", active_regex: "^(a+)+$", backtrack_depth: 4294967, cpu_utilization_pct: 100.0 },
        { worker_thread_id: "edge_worker_1", active_regex: "^(a+)+$", backtrack_depth: 4294931, cpu_utilization_pct: 100.0 },
        { worker_thread_id: "edge_worker_2", active_regex: "^(a+)+$", backtrack_depth: 4294884, cpu_utilization_pct: 100.0 }
      ],
      comment: "WARNING: Edge CPU cores are locked at 100% due to catastrophic regular expression backtracking on pattern '^(a+)+$'."
    },
    {
      id: 'edge_threads',
      label: 'Edge Worker Thread Pool',
      sql: "SELECT pool_name, active_threads, idle_threads, queued_requests FROM EdgeThreadPoolStatus;",
      output: [
        { pool_name: "nginx_edge_ingress", active_threads: 64, idle_threads: 0, queued_requests: 184502 }
      ],
      comment: "SYSTEM ERROR: Thread pool is fully saturated. 184,502 requests are in queue, leading to Gateway Timeouts."
    }
  ],
  facebook_bgp_outage: [
    {
      id: 'bgp_stats',
      label: 'AS Peering Updates',
      sql: "SELECT peer_address, autonomous_system, advertised_routes_count, last_bgp_update, status FROM BgpPeeringStats;",
      output: [
        { peer_address: "129.250.0.11", autonomous_system: "AS2914", advertised_routes_count: 854002, last_bgp_update: "2s ago", status: "FLAPPING" },
        { peer_address: "129.250.0.12", autonomous_system: "AS32934", advertised_routes_count: 0, last_bgp_update: "14s ago", status: "WITHDRAWN" }
      ],
      comment: "CRITICAL: BGP Peering Router has advertised 854,002 routes (entire global network map) to AS2914 and initiated a mass withdraw event."
    },
    {
      id: 'bgp_loops',
      label: 'Peering Path Loop Tracker',
      sql: "SELECT route_prefix, hop_path, local_preference, origin_source, valid FROM PeeringRouteLoopTracker;",
      output: [
        { route_prefix: "10.0.0.0/8", hop_path: "AS32934 -> AS2914 -> AS32934", local_preference: 100, origin_source: "BGP_LEAK", valid: "false" },
        { route_prefix: "0.0.0.0/0", hop_path: "AS32934 -> AS2914 -> AS32934", local_preference: 100, origin_source: "BGP_LEAK", valid: "false" }
      ],
      comment: "WARNING: AS Path recursion detected! Loop in hop path is causing packets to cycle and drop on edge router interfaces."
    },
    {
      id: 'router_load',
      label: 'Router Interface Buffer Load',
      sql: "SELECT interface_name, input_bytes_sec, output_bytes_sec, packet_drops_sec, queue_util_pct FROM RouterInterfaceLoad;",
      output: [
        { interface_name: "edge-transit-eth0", input_bytes_sec: 12500000000, output_bytes_sec: 12500000000, packet_drops_sec: 84502, queue_util_pct: 100.0 }
      ],
      comment: "SYSTEM ERROR: Transit interfaces are severely congested (100% queue utilization). Packet drop rate is extremely high."
    }
  ],
  gitlab_database_deletion: [
    {
      id: 'wal_receiver',
      label: 'WAL Archiving Status',
      sql: "SELECT archived_count, failed_count, last_archived_wal, last_failed_wal, wal_delay_bytes FROM pg_stat_wal_receiver;",
      output: [
        { archived_count: 14202, failed_count: 854, last_archived_wal: "0000000100000A12000000EF", last_failed_wal: "0000000100000A12000000F0", wal_delay_bytes: 42949672960 }
      ],
      comment: "CRITICAL: WAL receiver is delayed by 40+ GB. Secondary database replication cannot synchronize due to missing block headers."
    },
    {
      id: 'relfilenodes',
      label: 'File Allocation Slots',
      sql: "SELECT table_name, file_node, relfilenode_exists, disk_pages_allocated, data_integrity_checksum FROM pg_tbls_allocation;",
      output: [
        { table_name: "users", file_node: "16384/12502/19082", relfilenode_exists: "false", disk_pages_allocated: 0, data_integrity_checksum: "N/A (MISSING)" },
        { table_name: "projects", file_node: "16384/12502/19085", relfilenode_exists: "false", disk_pages_allocated: 0, data_integrity_checksum: "N/A (MISSING)" }
      ],
      comment: "CRITICAL DATABASE ANOMALY: Primary relfilenodes are MISSING from the filesystem. The table directories have been deleted at the OS level!"
    },
    {
      id: 'disk_space',
      label: 'PostgreSQL Disk Spaces',
      sql: "SELECT datname, pg_size_pretty(pg_database_size(datname)) AS size, stats_reset FROM pg_stat_database;",
      output: [
        { datname: "gitlab_production", size: "48 kB", stats_reset: "Just now" }
      ],
      comment: "SYSTEM ERROR: gitlab_production size is 48 kB (expected: 4.8 TB). Entire data directories are empty."
    }
  ],
  knight_capital_disaster: [
    {
      id: 'duplicate_orders',
      label: 'Duplicate Order Records',
      sql: "SELECT account_id, stock_ticker, COUNT(*), SUM(quantity) as total_shares, avg_price FROM active_trades GROUP BY account_id, stock_ticker HAVING COUNT(*) > 1000;",
      output: [
        { account_id: "PEG_HFT_09", stock_ticker: "AAPL", "COUNT(*)": 184502, total_shares: 184502000, avg_price: 154.20 },
        { account_id: "PEG_HFT_09", stock_ticker: "MSFT", "COUNT(*)": 94502, total_shares: 94502000, avg_price: 284.15 }
      ],
      comment: "CRITICAL: HFT Account PEG_HFT_09 is submitting duplicate orders at 450,000 requests per minute without standard stock balance limits."
    },
    {
      id: 'margin_limits',
      label: 'Account Margin Limits',
      sql: "SELECT account_id, gross_exposure, cash_balance, margin_limit_exceeded, alert_status FROM account_margins;",
      output: [
        { account_id: "PEG_HFT_09", gross_exposure: 44294967200, cash_balance: -43850204000, margin_limit_exceeded: "true", alert_status: "CRITICAL_BREACH" }
      ],
      comment: "WARNING: Gross exposure of account PEG_HFT_09 is $44.2B, exceeding margin limit by 400x! Automatic risk circuit breakers failed to engage."
    },
    {
      id: 'queue_saturation',
      label: 'Stock Balance Queue Saturation',
      sql: "SELECT gateway_id, incoming_rate_sec, queued_orders, max_capacity, backpressure_active FROM StockGatewayQueue;",
      output: [
        { gateway_id: "NYSE_FEED_1", incoming_rate_sec: 145020, queued_orders: 845000, max_capacity: 100000, backpressure_active: "false" }
      ],
      comment: "SYSTEM ERROR: Order queue is heavily saturated. Backpressure did not activate due to dormant flag collision overriding safeguards."
    }
  ]
};

const SQLConsole = ({ scenarioId }) => {
  const [selectedQuery, setSelectedQuery] = useState(null);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState(null);

  const cannedQueries = SQL_REGISTRY[scenarioId] || SQL_REGISTRY.payments_retry_storm;

  useEffect(() => {
    setSelectedQuery(null);
    setResult(null);
  }, [scenarioId]);

  const handleRun = (queryObj) => {
    setSelectedQuery(queryObj.id);
    setRunning(true);
    setResult(null);

    setTimeout(() => {
      setRunning(false);
      setResult(queryObj);
    }, 850);
  };

  return (
    <div className="flex-1 bg-[#0a0f14] flex flex-col h-full overflow-hidden text-slate-300 font-mono text-xs">
      
      {/* Tab bar header */}
      <div className="bg-[#11161d] border-b border-slate-800 px-4 py-2.5 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <Database size={14} className="text-cyan-400" />
          <span className="font-bold text-slate-200 uppercase tracking-wider text-[11px]">
            SQL Postgres Recovery Console
          </span>
        </div>
        <div className="text-[10px] text-slate-500 font-mono">
          HOST: postgres-primary.production.svc
        </div>
      </div>

      {/* Main split dashboard layout */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Left Side: Clickable Canned Queries */}
        <div className="w-[30%] border-r border-slate-800 p-4 space-y-3 bg-[#0d121a]/30 overflow-y-auto shrink-0 select-none">
          <div className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-1">
            Canned Diagnostics
          </div>
          {cannedQueries.map((query) => (
            <button
              key={query.id}
              onClick={() => handleRun(query)}
              className={`w-full p-3 rounded-lg text-left border font-sans transition-all flex flex-col gap-1.5 ${
                selectedQuery === query.id
                  ? 'bg-cyan-950/20 border-cyan-500/50 text-cyan-200'
                  : 'bg-[#121620]/60 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-300'
              }`}
            >
              <div className="font-bold text-xs flex items-center justify-between">
                <span>{query.label}</span>
                <Play size={10} className="text-cyan-400 opacity-60" />
              </div>
              <div className="font-mono text-[9px] text-slate-500 truncate w-full">
                {query.sql}
              </div>
            </button>
          ))}
        </div>

        {/* Right Side: SQL Console Area */}
        <div className="flex-1 flex flex-col overflow-hidden bg-[#070b0e] p-4">
          
          {/* Query input display */}
          <div className="bg-[#0b0f15] border border-slate-800 rounded-lg p-3 shrink-0 flex items-start gap-2.5">
            <Terminal size={14} className="text-slate-500 mt-0.5" />
            <div className="flex-1">
              <span className="text-slate-600 block text-[10px] uppercase font-bold mb-1">Query Editor</span>
              <pre className="text-cyan-400 font-semibold break-all leading-normal">
                {result ? result.sql : selectedQuery ? cannedQueries.find(q => q.id === selectedQuery)?.sql : "-- Select a query from the left to execute..."}
              </pre>
            </div>
          </div>

          {/* Query Output Display Area */}
          <div className="flex-1 overflow-y-auto border border-slate-800 rounded-lg bg-[#080d12] mt-4 flex flex-col p-4">
            
            {running && (
              <div className="flex-1 flex flex-col items-center justify-center text-cyan-400 space-y-2 font-sans select-none">
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-cyan-400 border-t-transparent" />
                <span className="animate-pulse tracking-widest text-[10px]">EXECUTING DBA QUERY...</span>
              </div>
            )}

            {!running && !result && (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-600 select-none">
                <Database size={24} className="opacity-20 mb-2" />
                <span className="font-sans text-[10px] tracking-wide text-slate-500 uppercase">NO QUERY ACTIVE</span>
                <span className="font-sans text-[9px] text-slate-600 mt-1">Select a diagnostic session query to inspect Postgres locked transaction rows.</span>
              </div>
            )}

            {!running && result && (
              <div className="space-y-4">
                
                {/* Result header */}
                <div className="flex items-center justify-between border-b border-slate-800 pb-2 text-[10px] text-slate-400 select-none">
                  <span>QUERY RESOLVED IN 0.08s</span>
                  <span>ROWS RETURNED: {result.output.length}</span>
                </div>

                {/* Table representation */}
                <div className="overflow-x-auto border border-slate-800 rounded-lg bg-[#060a0f]">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-[#11161d] text-slate-400 text-[10px] border-b border-slate-800 select-none">
                        {Object.keys(result.output[0]).map((key) => (
                          <th key={key} className="py-2 px-3 font-semibold uppercase tracking-wider">{key}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/50">
                      {result.output.map((row, idx) => (
                        <tr key={idx} className="hover:bg-slate-900/40 text-slate-300">
                          {Object.values(row).map((val, cellIdx) => (
                            <td key={cellIdx} className="py-2 px-3 text-[10px]">
                              {val === "false" || val === false ? (
                                <span className="px-1.5 py-0.5 rounded bg-red-950/40 border border-red-900/30 text-red-400 font-bold uppercase text-[9px]">
                                  false
                                </span>
                              ) : typeof val === "string" && val.includes("Lock") ? (
                                <span className="px-1.5 py-0.5 rounded bg-yellow-950/40 border border-yellow-900/30 text-yellow-400 font-bold uppercase text-[9px]">
                                  {val}
                                </span>
                              ) : typeof val === "string" && val.includes("saturation") ? (
                                <span className="px-1.5 py-0.5 rounded bg-red-950/40 border border-red-900/30 text-red-400 font-bold uppercase text-[9px]">
                                  {val}
                                </span>
                              ) : (
                                String(val)
                              )}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* DB Alerts Comment Box */}
                <div className="p-3 rounded-lg bg-red-950/10 border border-red-900/30 flex gap-2 items-start">
                  <AlertTriangle className="text-red-500 shrink-0" size={14} />
                  <div>
                    <h4 className="font-bold text-[10px] text-red-400 uppercase font-sans">
                      Database Telemetry Synthesis
                    </h4>
                    <p className="text-slate-300 text-[10px] mt-0.5 leading-relaxed font-sans">
                      {result.comment}
                    </p>
                  </div>
                </div>

              </div>
            )}

          </div>

        </div>

      </div>

    </div>
  );
};

export default SQLConsole;
