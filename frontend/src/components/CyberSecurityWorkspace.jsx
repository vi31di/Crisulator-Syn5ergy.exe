import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ShieldAlert, 
  Terminal, 
  Activity, 
  AlertTriangle, 
  Lock, 
  RefreshCw, 
  Globe, 
  Radio, 
  Eye, 
  Zap, 
  Compass, 
  Server, 
  ShieldCheck,
  Send,
  EyeOff
} from 'lucide-react';

const CYBER_SCENARIO_DATA = {
  uber_mfa_attack: {
    vpnSessions: [
      { user: 'contractor.user@uber.com', ip: '185.143.223.41', location: 'Moscow, RU (VPN Proxy)', duration: '00:47:22', status: 'ACTIVE' },
      { user: 'admin.defense', ip: '10.42.0.12', location: 'Internal Jumpbox', duration: '02:14:05', status: 'SECURE' }
    ],
    duoLogs: [
      { time: '14:22:47', user: 'contractor.user', method: 'Duo Push', result: 'DENIED', ip: '185.143.223.41' },
      { time: '14:22:49', user: 'contractor.user', method: 'Duo Push', result: 'DENIED', ip: '185.143.223.41' },
      { time: '14:22:51', user: 'contractor.user', method: 'Duo Push', result: 'DENIED', ip: '185.143.223.41' },
      { time: '14:23:01', user: 'contractor.user', method: 'Duo Push', result: 'APPROVED (FATIGUE)', ip: '185.143.223.41' }
    ],
    payload: 'JHN5cyA9IE5ldy1PYmplY3QgU3lzdGVtLk5ldC5XZWJDbGllbnQ7ICRzeXMuRG93bmxvYWRGaWxlKCdodHRwOi8vMTg1LjE0My4yMjMuNDEvcGF5bG9hZC5leGUnLCAnJGVudjpURU1QL3N5cy5leGUnKTsgU3RhcnQtUHJvY2VzcygnJGVudjpURU1QL3N5cy5leGUnKSAtV2luZG93U3R5bGUgSGlkZGVuOw==',
    siem: {
      route: 'WAN_GATEWAY_10',
      ip: '185.143.223.41',
      loc: 'Moscow Proxy Hub',
      signal: 'MFA fatigue lateral IP scan'
    }
  },
  colonial_pipeline_ransomware: {
    vpnSessions: [
      { user: 'vpn_darkside', ip: '93.184.216.34', location: 'Moscow, RU (VPN Proxy)', duration: '00:12:04', status: 'ACTIVE' },
      { user: 'operator.scada', ip: '10.240.4.52', location: 'OT Control Console', duration: '04:55:10', status: 'SECURE' }
    ],
    duoLogs: [
      { time: '04:10:02', user: 'vpn_darkside', method: 'Password Login', result: 'SUCCESS', ip: '93.184.216.34' },
      { time: '04:10:05', user: 'vpn_darkside', method: 'Legacy MFA Bypass', result: 'APPROVED', ip: '93.184.216.34' }
    ],
    payload: 'JGMgPSBOZXctT2JqZWN0IFN5c3RlbS5OZXQuU29ja2V0cy5UQ1BDbGllbnQoJzkzLjE4NC4yMTYuMzQnLDQ0NDQpOyAkcyA9ICRjLkdldFN0cmVhbSgpOyB3aGlsZSgkYy5Db25uZWN0ZWQpIHsgLyogRGFya1NpZGUgUmFuc29td2FyZSBCYWNrZG9vciAqLyB9',
    siem: {
      route: 'WAN_GATEWAY_12',
      ip: '93.184.216.34',
      loc: 'DarkSide C2 Server',
      signal: 'SCADA Segment lateral scan'
    }
  },
  solarwinds_supply_chain: {
    vpnSessions: [
      { user: 'solarwinds_build_agent', ip: '192.168.12.98', location: 'Internal Subnet', duration: '01:14:02', status: 'ACTIVE' },
      { user: 'admin.ad_vault', ip: '10.0.1.25', location: 'AD Domain Controller', duration: '00:04:12', status: 'SECURE' }
    ],
    duoLogs: [
      { time: '02:04:15', user: 'solarwinds_build_agent', method: 'Service Cert', result: 'SUCCESS', ip: '192.168.12.98' },
      { time: '02:04:20', user: 'solarwinds_build_agent', method: 'Golden Ticket', result: 'GOLDEN TICKET INJECTED', ip: '192.168.12.98' }
    ],
    payload: 'IyBTdW5idXJzdCBCYWNrZG9vciBDb21waWxlciBJbmplY3Rvcg0KZnVuY3Rpb24gSW5qZWN0LUJhY2tkb29yIHsNCiAgaWYgKFRlc3QtUGF0aCAiLlxzb3VyY2VcY29yZS5jcyIpIHsNCiAgICBBZGQtQ29udGVudCAiLlxzb3VyY2VcY29yZS5jcyIgIlxuLy8gU3VuYnVyc3QgQmFja2Rvb3JcbnB1YmxpYyBzdGF0aWMgdm9pZCBFeGZpbHRyYXRlKCkgeyBHZXQtQUQtVmF1bHQtVG9rZW5zKCk7IH0iDQogIH0NCn0=',
    siem: {
      route: 'BUILD_PIPELINE_FLOW',
      ip: '20.140.23.82',
      loc: 'State-Sponsored Host',
      signal: 'AD Vault Credentials Exfiltration'
    }
  },
  target_retail_breach: {
    vpnSessions: [
      { user: 'hvac.subcontractor', ip: '64.233.160.10', location: 'External HVAC Vendor', duration: '00:55:00', status: 'ACTIVE' },
      { user: 'pos.terminal_94', ip: '172.16.42.94', location: 'POS Store Segment', duration: '12:00:00', status: 'ACTIVE' }
    ],
    duoLogs: [
      { time: '22:14:02', user: 'hvac.subcontractor', method: 'Portal Login', result: 'SUCCESS', ip: '64.233.160.10' },
      { time: '22:15:00', user: 'hvac.subcontractor', method: 'POS Segment Jump', result: 'APPROVED', ip: '64.233.160.10' }
    ],
    payload: 'IyBQT1MgVHJhY2stMiBDcmVkaXQgQ2FyZCBNZW1vcnkgU2NyYXBlcg0KJHByb2Nlc3NlcyA9IEdldC1Qcm9jZXNzOw0KZm9yZWFjaCAoJHAgaW4gJHByb2Nlc3Nlcykgew0KICBpZiAoJHAuTmFtZSAtbGlrZSAiKnBvcyoiKSB7DQogICAgW1N5c3RlbS5JTy5GaWxlXTo6V3JpdGVBbGxUZXh0KCIkZW52OlRFTVAvY2FyZHMudHh0IiwgIlNjcmFwZWQ6IDQxMTEtWFhYWC1YWFhYLTExMTE7IEVYUDogMTIvMjg7IENWVjogOTk5Iik7DQogIH0NCn0=',
    siem: {
      route: 'STORE_VLAN_7',
      ip: '64.233.160.10',
      loc: 'HVAC Compromised Link',
      signal: 'Track-2 credit card memory scrape'
    }
  },
  equifax_breach: {
    vpnSessions: [
      { user: 'apache_struts_daemon', ip: '198.51.100.72', location: 'Web Application Server', duration: '24:00:00', status: 'ACTIVE' },
      { user: 'db_reader_service', ip: '10.100.2.14', location: 'Internal Database Server', duration: '03:45:12', status: 'SECURE' }
    ],
    duoLogs: [
      { time: '11:02:14', user: 'struts_app', method: 'CVE-2017-5638 Exploit', result: 'SUCCESS', ip: '198.51.100.72' },
      { time: '11:02:18', user: 'struts_app', method: 'Database Bulk Dump', result: 'BULK QUERIES RUNNING', ip: '198.51.100.72' }
    ],
    payload: 'IyBBcGFjaGUgU3RydXRzIFJlbW90ZSBTaGVsbCBFeHBsb2l0IChDVkUtMjAxNy01NjM4KQ0Kd2hvYW1pOw0KY2F0IC9ldGMvcGFzc3dkOw0KcGdfZHVtcCAtVSByb290IGNvbnN1bWVyX2NyZWRpdF9kYXRhYmFzZSA+IC90bXAvY3JlZGl0X2R1bXAuc3FsOw0KY3VybCAtWCBQT1NUIC1GICJkYXRhPUBsdG1wL2NyZWRpdF9kdW1wLnNxbCIgaHR0cDovLzE5OC41MS4xMDAuNzIvdXBsb2FkOw==',
    siem: {
      route: 'DMZ_EXTERNAL_HTTPS',
      ip: '198.51.100.72',
      loc: 'Struts Vuln Exploit Host',
      signal: 'Apache Struts CVE-2017-5638 unpatched injection'
    }
  }
};

const CyberSecurityWorkspace = ({ scenario, incidentPhase, timeline, onCommand }) => {
  const [activeTab, setActiveTab] = useState('logs'); // logs | sandbox | map
  const [payloadText, setPayloadText] = useState('');
  const [decodedResult, setDecodedResult] = useState('');
  const [isDecoding, setIsDecoding] = useState(false);
  const [consoleLogs, setConsoleLogs] = useState([]);
  const [isExecuting, setIsExecuting] = useState(false);
  const [showHelpBook, setShowHelpBook] = useState(false);

  const scenarioId = scenario?.id || 'uber_mfa_attack';
  const activeCyberData = CYBER_SCENARIO_DATA[scenarioId] || CYBER_SCENARIO_DATA.uber_mfa_attack;

  const [vpnSessions, setVpnSessions] = useState(activeCyberData.vpnSessions);
  const [duoLogs, setDuoLogs] = useState(activeCyberData.duoLogs);

  const consoleEndRef = useRef(null);

  useEffect(() => {
    consoleEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [consoleLogs]);

  // Update scenario-specific dataset on change
  useEffect(() => {
    const freshData = CYBER_SCENARIO_DATA[scenarioId] || CYBER_SCENARIO_DATA.uber_mfa_attack;
    setVpnSessions(freshData.vpnSessions);
    setDuoLogs(freshData.duoLogs);
    setPayloadText('');
    setDecodedResult('');
    setConsoleLogs([
      { time: new Date().toLocaleTimeString(), text: `DFIR Forensic Terminal initialized for: ${scenario?.title || 'System Threat'}` },
      { time: new Date().toLocaleTimeString(), text: 'Awaiting operator containment directives.' }
    ]);
  }, [scenarioId, scenario?.title]);

  const loadPresetPayload = () => {
    setPayloadText(activeCyberData.payload);
    setDecodedResult('');
  };

  const handleDecode = () => {
    setIsDecoding(true);
    setTimeout(() => {
      try {
        const decoded = atob(payloadText.trim());
        setDecodedResult(decoded);
      } catch (err) {
        setDecodedResult('ERROR: Invalid Base64 payload block. Cryptographic signature parsing failed.');
      }
      setIsDecoding(false);
    }, 1200);
  };

  const executeContainment = async (actionKey, cmdString) => {
    setIsExecuting(true);
    setConsoleLogs(prev => [...prev, { time: new Date().toLocaleTimeString(), text: `[EXEC] ${cmdString}` }]);
    
    try {
      const result = await onCommand(cmdString);
      
      setConsoleLogs(prev => {
        const nextLogs = [
          ...prev, 
          { time: new Date().toLocaleTimeString(), text: `[SYSTEM] Containment routine applied.` },
          { time: new Date().toLocaleTimeString(), text: `[OUTPUT] ${result.terminal_output || 'Security parameter updated successfully.'}` }
        ];
        if (result.agent_reaction) {
          nextLogs.push({
            time: new Date().toLocaleTimeString(),
            text: `[ADVISORY - ${result.agent_reaction.agent.toUpperCase()} (${result.agent_reaction.role.toUpperCase()})] ${result.agent_reaction.message.replace(/^\[.*?\]\s*/, '')}`
          });
        }
        return nextLogs;
      });

      // Dynamic UI state updates for terminated sessions
      if (cmdString.includes('terminate')) {
        setVpnSessions(prev => prev.map(s => {
          const matched = cmdString.includes(s.user) || 
                          (cmdString.includes('contractor') && s.user.includes('contractor')) || 
                          (cmdString.includes('vpn_darkside') && s.user === 'vpn_darkside') ||
                          (cmdString.includes('hvac') && s.user.includes('hvac')) ||
                          (cmdString.includes('solarwinds') && s.user.includes('solarwinds')) ||
                          (cmdString.includes('struts') && s.user.includes('struts'));
          return matched ? { ...s, status: 'TERMINATED' } : s;
        }));
      }
      
    } catch (err) {
      setConsoleLogs(prev => [...prev, { time: new Date().toLocaleTimeString(), text: 'ERROR: Containment payload execution timed out.' }]);
    } finally {
      setIsExecuting(false);
    }
  };

  return (
    <div className="flex w-full h-full gap-3 text-slate-300 font-sans p-2 overflow-hidden relative">
      
      {/* Left Column: SIEM Alerts & Threat Map */}
      <div className="w-[30%] bg-[#080709] border border-red-950/40 rounded-2xl flex flex-col overflow-hidden relative">
        <div className="bg-[#0f0d11] border-b border-red-950/40 px-4 py-3 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <Radio className="text-red-500 animate-pulse" size={14} />
            <span className="font-bold text-xs uppercase tracking-wider text-red-400 font-mono">
              SIEM FORENSIC FEED
            </span>
          </div>
          <span className="px-2 py-0.5 rounded bg-red-950/30 text-[9px] text-red-400 border border-red-900/30 font-mono font-semibold animate-pulse">
            LIVE FEED
          </span>
        </div>
        
        <div className="flex-1 overflow-y-auto p-3 space-y-2.5 scrollbar-ops">
          {/* Geolocation Threat coordinates */}
          <div className="p-3 bg-[#0d090d]/60 border border-red-950/40 rounded-xl">
            <div className="flex justify-between items-center text-[10px] font-mono text-red-400/70 mb-2">
              <span>TARGET INTRUDER SIGNALS</span>
              <Compass size={12} className="animate-spin" />
            </div>
            <div className="bg-black/40 rounded-lg p-2 font-mono text-[9px] text-slate-400 space-y-1">
              <div>ROUTE: <span className="text-red-400 font-bold">{activeCyberData.siem.route}</span></div>
              <div>EXTERNAL IP: <span className="text-red-300">{activeCyberData.siem.ip}</span></div>
              <div>LOC: <span className="text-amber-400">{activeCyberData.siem.loc}</span></div>
              <div className="flex items-center gap-1.5 mt-2 text-[8px] bg-red-950/20 border border-red-900/30 p-1.5 rounded text-red-300">
                <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-ping" />
                {activeCyberData.siem.signal.toUpperCase()}
              </div>
            </div>
          </div>

          <div className="text-[10px] text-slate-500 uppercase tracking-widest font-mono font-bold pt-2 border-t border-slate-900">
            Intrusion Log Timeline
          </div>

          {timeline.map((evt, idx) => (
            <motion.div 
              initial={{ opacity: 0, x: -10 }} 
              animate={{ opacity: 1, x: 0 }} 
              key={idx} 
              className="p-2.5 rounded-xl border border-red-950/20 bg-[#0c0a0e]/50 text-[10px] font-mono"
            >
              <div className="flex items-center justify-between text-slate-500 text-[8px] mb-1">
                <span>{evt.time}</span>
                <span className="text-red-500 font-bold">WARNING</span>
              </div>
              <p className="text-slate-300 font-sans leading-relaxed">
                {evt.text}
              </p>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Center Column: SIEM & Sandbox Forensic Workspace */}
      <div className="flex-1 bg-[#080709] border border-red-950/40 rounded-2xl overflow-hidden flex flex-col relative">
        <div className="bg-[#0f0d11] border-b border-red-950/40 px-4 py-3 flex items-center justify-between shrink-0 select-none">
          <div className="flex gap-2">
            <button 
              onClick={() => setActiveTab('logs')}
              className={`px-3 py-1 font-mono text-xs rounded transition-all ${activeTab === 'logs' ? 'bg-red-950/40 text-red-400 border border-red-900/40' : 'text-slate-500 hover:text-slate-300'}`}
            >
              DEVICE ACCESS MONITOR
            </button>
            <button 
              onClick={() => setActiveTab('sandbox')}
              className={`px-3 py-1 font-mono text-xs rounded transition-all ${activeTab === 'sandbox' ? 'bg-red-950/40 text-red-400 border border-red-900/40' : 'text-slate-500 hover:text-slate-300'}`}
            >
              MALWARE DECODER SANDBOX
            </button>
          </div>
          {activeTab === 'sandbox' && (
            <span className="text-[9px] font-mono text-amber-500 animate-pulse uppercase">
              ISOLATED VM RUNNING
            </span>
          )}
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-ops">
          <AnimatePresence mode="wait">
            {activeTab === 'logs' && (
              <motion.div 
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                className="space-y-4"
              >
                {/* Active VPN Session list */}
                <div className="space-y-2">
                  <h3 className="text-xs font-mono text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                    <Server size={12} className="text-red-500" /> Active Perimeter VPN Leases
                  </h3>
                  <div className="border border-red-950/30 rounded-xl overflow-hidden bg-black/30 font-mono text-xs">
                    <div className="grid grid-cols-4 bg-[#0d0a0f] p-2 border-b border-red-950/40 text-[10px] text-slate-500 uppercase">
                      <span>User Session</span>
                      <span>Origin IP</span>
                      <span>Duration</span>
                      <span className="text-right">Status</span>
                    </div>
                    <div className="divide-y divide-red-950/20">
                      {vpnSessions.map((session, i) => (
                        <div key={i} className="grid grid-cols-4 p-2.5 items-center hover:bg-red-950/5">
                          <span className="font-bold text-slate-200 truncate">{session.user}</span>
                          <span className="text-slate-400 text-[11px]">{session.ip}</span>
                          <span className="text-slate-500 text-[11px]">{session.duration}</span>
                          <span className="text-right">
                            <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                              session.status === 'TERMINATED' ? 'bg-red-950/50 text-red-500 border border-red-900/30' :
                              session.status === 'SECURE' ? 'bg-green-950/40 text-green-400 border border-green-900/30' :
                              'bg-amber-950/40 text-amber-400 border border-amber-900/30 animate-pulse'
                            }`}>
                              {session.status}
                            </span>
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Duo Authenticator Spams */}
                <div className="space-y-2 pt-2">
                  <h3 className="text-xs font-mono text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                    <ShieldAlert size={12} className="text-amber-500" /> DUO ACCESS GATEWAY RECENT EVENTS
                  </h3>
                  <div className="border border-red-950/30 rounded-xl overflow-hidden bg-black/30 font-mono text-[11px]">
                    <div className="grid grid-cols-4 bg-[#0d0a0f] p-2 border-b border-red-950/40 text-[9px] text-slate-500 uppercase">
                      <span>Timestamp</span>
                      <span>User ID</span>
                      <span>Verification Method</span>
                      <span className="text-right">Outcome</span>
                    </div>
                    <div className="divide-y divide-red-950/10">
                      {duoLogs.map((log, i) => (
                        <div key={i} className="grid grid-cols-4 p-2 hover:bg-[#0c0a0e]">
                          <span className="text-slate-500">{log.time}</span>
                          <span className="font-bold text-slate-300">{log.user}</span>
                          <span className="text-slate-400">{log.method}</span>
                          <span className="text-right">
                            <span className={`font-bold ${log.result.includes('APPROVED') || log.result.includes('GOLDEN') || log.result.includes('RUNNING') ? 'text-red-500 animate-pulse' : 'text-green-500'}`}>
                              {log.result}
                            </span>
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="text-[10px] text-slate-500 italic mt-1 font-sans">
                    * Duo and application security gateway metrics monitor anomalous token activities in real-time.
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'sandbox' && (
              <motion.div 
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                className="space-y-3"
              >
                <div className="p-3.5 bg-amber-950/10 border border-amber-900/20 rounded-xl text-xs leading-relaxed text-amber-400/90 font-mono flex gap-2">
                  <AlertTriangle className="shrink-0 text-amber-500" size={16} />
                  <div>
                    <span className="font-bold uppercase block text-amber-300 mb-0.5">ISOLATED THREAT RECONSTRUCT CONSOLE</span>
                    Paste base64 payload strings extracted from intrusion logs to decode their execution instructions in our isolated container sandbox.
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center text-xs font-mono text-slate-500 select-none">
                    <span>Base64 Cipher String</span>
                    <button 
                      onClick={loadPresetPayload}
                      className="px-2 py-0.5 bg-red-950/40 hover:bg-red-950/70 text-red-400 border border-red-900/30 rounded text-[9px] transition-all font-semibold"
                    >
                      LOAD COMPROMISED PAYLOAD LOG
                    </button>
                  </div>
                  
                  <textarea 
                    value={payloadText}
                    onChange={(e) => setPayloadText(e.target.value)}
                    placeholder="Paste Base64 payload here..."
                    className="w-full h-24 bg-black/40 border border-red-950/30 rounded-xl p-3 text-xs font-mono resize-none focus:outline-none focus:border-red-900 transition-all text-red-400"
                  />
                </div>

                <button
                  onClick={handleDecode}
                  disabled={!payloadText.trim() || isDecoding}
                  className="w-full py-2.5 rounded bg-red-900/25 hover:bg-red-900/40 text-red-400 font-bold border border-red-900/30 tracking-widest text-xs font-mono transition-all disabled:opacity-40"
                >
                  {isDecoding ? 'DECODING AND ANALYZING MALWARE STRINGS...' : 'RUN FORENSIC DECODING CHAIN'}
                </button>

                {decodedResult && (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="space-y-2 pt-2"
                  >
                    <div className="text-[10px] font-mono text-slate-500 uppercase tracking-widest select-none">
                      Deobfuscated Script Trace Output
                    </div>
                    <pre className="p-3 bg-[#0d090d] border border-red-950/40 rounded-xl font-mono text-[11px] text-green-400 overflow-x-auto whitespace-pre-wrap leading-relaxed">
                      {decodedResult}
                    </pre>
                  </motion.div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
      
      {/* Right Column: Access Revocation & Containment Controls */}
      <div className="w-[300px] bg-[#080709] border border-red-950/40 rounded-2xl flex flex-col overflow-hidden relative">
        <div className="bg-[#0f0d11] border-b border-red-950/40 px-4 py-3 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <Zap className="text-red-500 animate-pulse" size={14} />
            <span className="font-bold text-xs uppercase tracking-wider text-red-400 font-mono">
              ACCESS CONTAINMENT
            </span>
          </div>
          <button 
            onClick={() => setShowHelpBook(true)}
            className="flex items-center gap-1 px-2 py-0.5 rounded bg-red-950/40 hover:bg-red-950/70 border border-red-900/40 text-[9px] text-red-400 hover:text-red-300 transition-all font-mono font-semibold"
          >
            📖 PLAYBOOK
          </button>
        </div>
        
        <div className="p-4 space-y-4 flex-1 flex flex-col justify-between overflow-hidden">
          {/* Scenario-specific mitigation trigger list */}
          <div className="space-y-3 overflow-y-auto pr-1 scrollbar-ops select-none">
            <div className="text-[9px] text-slate-500 uppercase tracking-widest font-mono font-bold">
              Containment Controls
            </div>

            {/* Scenario 1: Uber MFA Attack */}
            {scenarioId === 'uber_mfa_attack' && (
              <>
                <button
                  onClick={() => executeContainment('revoke_vpn', 'vpn-session-manager terminate --user contractor.user@uber.com')}
                  disabled={isExecuting}
                  className="w-full p-3 bg-red-950/10 hover:bg-red-950/30 border border-red-950/40 hover:border-red-900/50 rounded-xl text-left transition-all group disabled:opacity-40"
                >
                  <div className="font-bold text-red-400 text-xs font-mono group-hover:text-red-300 transition-colors flex items-center justify-between">
                    <span>Terminate Session</span>
                    <span className="text-[8px] bg-red-950 text-red-500 px-1 py-0.5 rounded border border-red-900/30">SEV1</span>
                  </div>
                  <div className="text-[10px] text-slate-400 mt-1 font-sans leading-relaxed">
                    Sever active IPSec tunnel for contractor.user@uber.com.
                  </div>
                </button>

                <button
                  onClick={() => executeContainment('enforce_mfa', 'duo-policy update --policy-id mfa_default --enforce-number-match true')}
                  disabled={isExecuting}
                  className="w-full p-3 bg-red-950/10 hover:bg-red-950/30 border border-red-950/40 hover:border-red-900/50 rounded-xl text-left transition-all group disabled:opacity-40"
                >
                  <div className="font-bold text-red-400 text-xs font-mono group-hover:text-red-300 transition-colors flex items-center justify-between">
                    <span>Enforce Duo Matching</span>
                    <span className="text-[8px] bg-amber-950 text-amber-500 px-1 py-0.5 rounded border border-amber-900/30">MFA</span>
                  </div>
                  <div className="text-[10px] text-slate-400 mt-1 font-sans leading-relaxed">
                    Require explicit number input for all push notifications.
                  </div>
                </button>

                <button
                  onClick={() => executeContainment('rotate_pam', 'thycotic-cli credentials rotate --id pam_admin_creds --length 32 --special-chars')}
                  disabled={isExecuting}
                  className="w-full p-3 bg-red-950/10 hover:bg-red-950/30 border border-red-950/40 hover:border-red-900/50 rounded-xl text-left transition-all group disabled:opacity-40"
                >
                  <div className="font-bold text-red-400 text-xs font-mono group-hover:text-red-300 transition-colors flex items-center justify-between">
                    <span>Rotate PAM Secrets</span>
                    <span className="text-[8px] bg-red-950 text-red-500 px-1 py-0.5 rounded border border-red-900/30">PAM</span>
                  </div>
                  <div className="text-[10px] text-slate-400 mt-1 font-sans leading-relaxed">
                    Invalidate compromised admin credentials in secrets manager.
                  </div>
                </button>
              </>
            )}

            {/* Scenario 2: Colonial Pipeline */}
            {scenarioId === 'colonial_pipeline_ransomware' && (
              <>
                <button
                  onClick={() => executeContainment('revoke_darkside', 'vpn-session-manager terminate --user vpn_darkside')}
                  disabled={isExecuting}
                  className="w-full p-3 bg-red-950/10 hover:bg-red-950/30 border border-red-950/40 hover:border-red-900/50 rounded-xl text-left transition-all group disabled:opacity-40"
                >
                  <div className="font-bold text-red-400 text-xs font-mono group-hover:text-red-300 transition-colors flex items-center justify-between">
                    <span>Disable VPN Profile</span>
                    <span className="text-[8px] bg-red-950 text-red-500 px-1 py-0.5 rounded border border-red-900/30">VPN</span>
                  </div>
                  <div className="text-[10px] text-slate-400 mt-1 font-sans leading-relaxed">
                    Lock down compromised inactive vpn_darkside account gateway.
                  </div>
                </button>

                <button
                  onClick={() => executeContainment('isolate_net', 'isolate-network IT_segment OT_segment')}
                  disabled={isExecuting}
                  className="w-full p-3 bg-red-950/10 hover:bg-red-950/30 border border-red-950/40 hover:border-red-900/50 rounded-xl text-left transition-all group disabled:opacity-40"
                >
                  <div className="font-bold text-red-400 text-xs font-mono group-hover:text-red-300 transition-colors flex items-center justify-between">
                    <span>Isolate Networks</span>
                    <span className="text-[8px] bg-red-950 text-red-500 px-1 py-0.5 rounded border border-red-900/30">SEGMENT</span>
                  </div>
                  <div className="text-[10px] text-slate-400 mt-1 font-sans leading-relaxed">
                    Decouple IT network domain entirely from SCADA pipelines.
                  </div>
                </button>

                <button
                  onClick={() => executeContainment('shutdown_pipeline', 'shutdown-pipeline --emergency')}
                  disabled={isExecuting}
                  className="w-full p-3 bg-red-950/10 hover:bg-red-950/30 border border-red-950/40 hover:border-red-900/50 rounded-xl text-left transition-all group disabled:opacity-40"
                >
                  <div className="font-bold text-red-400 text-xs font-mono group-hover:text-red-300 transition-colors flex items-center justify-between">
                    <span>Emergency Pipeline Stop</span>
                    <span className="text-[8px] bg-amber-950 text-amber-500 px-1 py-0.5 rounded border border-amber-900/30">OT</span>
                  </div>
                  <div className="text-[10px] text-slate-400 mt-1 font-sans leading-relaxed">
                    Safely stop active pipeline pumping to prevent environmental rupture.
                  </div>
                </button>
              </>
            )}

            {/* Scenario 3: SolarWinds Build Pipeline */}
            {scenarioId === 'solarwinds_supply_chain' && (
              <>
                <button
                  onClick={() => executeContainment('revoke_solarwinds', 'vpn-session-manager terminate --user solarwinds_build_agent')}
                  disabled={isExecuting}
                  className="w-full p-3 bg-red-950/10 hover:bg-red-950/30 border border-red-950/40 hover:border-red-900/50 rounded-xl text-left transition-all group disabled:opacity-40"
                >
                  <div className="font-bold text-red-400 text-xs font-mono group-hover:text-red-300 transition-colors flex items-center justify-between">
                    <span>Disable Build Agent</span>
                    <span className="text-[8px] bg-red-950 text-red-500 px-1 py-0.5 rounded border border-red-900/30">AGENT</span>
                  </div>
                  <div className="text-[10px] text-slate-400 mt-1 font-sans leading-relaxed">
                    Revoke compromised build pipeline agent's AD access token interface.
                  </div>
                </button>

                <button
                  onClick={() => executeContainment('secure_ad_vault', 'duo-policy update --policy-id ad_vault_policy --enforce-ad-auth true')}
                  disabled={isExecuting}
                  className="w-full p-3 bg-red-950/10 hover:bg-red-950/30 border border-red-950/40 hover:border-red-900/50 rounded-xl text-left transition-all group disabled:opacity-40"
                >
                  <div className="font-bold text-red-400 text-xs font-mono group-hover:text-red-300 transition-colors flex items-center justify-between">
                    <span>Enforce AD Policy</span>
                    <span className="text-[8px] bg-amber-950 text-amber-500 px-1 py-0.5 rounded border border-amber-900/30">MFA</span>
                  </div>
                  <div className="text-[10px] text-slate-400 mt-1 font-sans leading-relaxed">
                    Enforce strict MFA certificate controls on AD Vault access.
                  </div>
                </button>

                <button
                  onClick={() => executeContainment('rotate_ad_admin', 'thycotic-cli credentials rotate --id domain_admin_creds --length 32 --special-chars')}
                  disabled={isExecuting}
                  className="w-full p-3 bg-red-950/10 hover:bg-red-950/30 border border-red-950/40 hover:border-red-900/50 rounded-xl text-left transition-all group disabled:opacity-40"
                >
                  <div className="font-bold text-red-400 text-xs font-mono group-hover:text-red-300 transition-colors flex items-center justify-between">
                    <span>Rotate Domain Admin</span>
                    <span className="text-[8px] bg-red-950 text-red-500 px-1 py-0.5 rounded border border-red-900/30">AD</span>
                  </div>
                  <div className="text-[10px] text-slate-400 mt-1 font-sans leading-relaxed">
                    Rotate Golden Ticket Domain Administrator credentials in vault.
                  </div>
                </button>
              </>
            )}

            {/* Scenario 4: Target POS Breach */}
            {scenarioId === 'target_retail_breach' && (
              <>
                <button
                  onClick={() => executeContainment('revoke_hvac', 'vpn-session-manager terminate --user hvac.subcontractor')}
                  disabled={isExecuting}
                  className="w-full p-3 bg-red-950/10 hover:bg-red-950/30 border border-red-950/40 hover:border-red-900/50 rounded-xl text-left transition-all group disabled:opacity-40"
                >
                  <div className="font-bold text-red-400 text-xs font-mono group-hover:text-red-300 transition-colors flex items-center justify-between">
                    <span>Revoke HVAC Access</span>
                    <span className="text-[8px] bg-red-950 text-red-500 px-1 py-0.5 rounded border border-red-900/30">HVAC</span>
                  </div>
                  <div className="text-[10px] text-slate-400 mt-1 font-sans leading-relaxed">
                    Terminate external subcontractor gateway connection portal lease.
                  </div>
                </button>

                <button
                  onClick={() => executeContainment('isolate_pos', 'isolate-network IT_segment POS_VLAN_7')}
                  disabled={isExecuting}
                  className="w-full p-3 bg-red-950/10 hover:bg-red-950/30 border border-red-950/40 hover:border-red-900/50 rounded-xl text-left transition-all group disabled:opacity-40"
                >
                  <div className="font-bold text-red-400 text-xs font-mono group-hover:text-red-300 transition-colors flex items-center justify-between">
                    <span>Isolate POS Subnet</span>
                    <span className="text-[8px] bg-red-950 text-red-500 px-1 py-0.5 rounded border border-red-900/30">VLAN</span>
                  </div>
                  <div className="text-[10px] text-slate-400 mt-1 font-sans leading-relaxed">
                    Segment and decouple store POS registers logical network from domain.
                  </div>
                </button>

                <button
                  onClick={() => executeContainment('rotate_pos_keys', 'thycotic-cli credentials rotate --id pos_domain_creds --length 32 --special-chars')}
                  disabled={isExecuting}
                  className="w-full p-3 bg-red-950/10 hover:bg-red-950/30 border border-red-950/40 hover:border-red-900/50 rounded-xl text-left transition-all group disabled:opacity-40"
                >
                  <div className="font-bold text-red-400 text-xs font-mono group-hover:text-red-300 transition-colors flex items-center justify-between">
                    <span>Rotate POS Domain Secrets</span>
                    <span className="text-[8px] bg-red-950 text-red-500 px-1 py-0.5 rounded border border-red-900/30">POS</span>
                  </div>
                  <div className="text-[10px] text-slate-400 mt-1 font-sans leading-relaxed">
                    Rotate POS transaction directory database connection passwords.
                  </div>
                </button>
              </>
            )}

            {/* Scenario 5: Equifax App Injection */}
            {scenarioId === 'equifax_breach' && (
              <>
                <button
                  onClick={() => executeContainment('revoke_struts', 'vpn-session-manager terminate --user apache_struts_daemon')}
                  disabled={isExecuting}
                  className="w-full p-3 bg-red-950/10 hover:bg-red-950/30 border border-red-950/40 hover:border-red-900/50 rounded-xl text-left transition-all group disabled:opacity-40"
                >
                  <div className="font-bold text-red-400 text-xs font-mono group-hover:text-red-300 transition-colors flex items-center justify-between">
                    <span>Disable Struts App</span>
                    <span className="text-[8px] bg-red-950 text-red-500 px-1 py-0.5 rounded border border-red-900/30">APP</span>
                  </div>
                  <div className="text-[10px] text-slate-400 mt-1 font-sans leading-relaxed">
                    Stop external ingress proxy routing to unpatched Apache Struts server daemon.
                  </div>
                </button>

                <button
                  onClick={() => executeContainment('isolate_db_layer', 'isolate-network DMZ_HTTPS Internal_DB_Segment')}
                  disabled={isExecuting}
                  className="w-full p-3 bg-red-950/10 hover:bg-red-950/30 border border-red-950/40 hover:border-red-900/50 rounded-xl text-left transition-all group disabled:opacity-40"
                >
                  <div className="font-bold text-red-400 text-xs font-mono group-hover:text-red-300 transition-colors flex items-center justify-between">
                    <span>Block DB Queries</span>
                    <span className="text-[8px] bg-red-950 text-red-500 px-1 py-0.5 rounded border border-red-900/30">FIREWALL</span>
                  </div>
                  <div className="text-[10px] text-slate-400 mt-1 font-sans leading-relaxed">
                    Sever logical queries and database access routes from public application layers.
                  </div>
                </button>

                <button
                  onClick={() => executeContainment('rotate_db_root', 'thycotic-cli credentials rotate --id consumer_db_root --length 32 --special-chars')}
                  disabled={isExecuting}
                  className="w-full p-3 bg-red-950/10 hover:bg-red-950/30 border border-red-950/40 hover:border-red-900/50 rounded-xl text-left transition-all group disabled:opacity-40"
                >
                  <div className="font-bold text-red-400 text-xs font-mono group-hover:text-red-300 transition-colors flex items-center justify-between">
                    <span>Rotate DB Secrets</span>
                    <span className="text-[8px] bg-red-950 text-red-500 px-1 py-0.5 rounded border border-red-900/30">DB</span>
                  </div>
                  <div className="text-[10px] text-slate-400 mt-1 font-sans leading-relaxed">
                    Rotate master customer database password strings inside secrets manager.
                  </div>
                </button>
              </>
            )}

            {/* Fallback containment buttons */}
            {scenarioId !== 'uber_mfa_attack' && 
             scenarioId !== 'colonial_pipeline_ransomware' && 
             scenarioId !== 'solarwinds_supply_chain' && 
             scenarioId !== 'target_retail_breach' && 
             scenarioId !== 'equifax_breach' && (
              <>
                <button
                  onClick={() => executeContainment('generic_vpn', 'vpn-session-manager terminate --user compromised_user')}
                  disabled={isExecuting}
                  className="w-full p-3 bg-red-950/10 hover:bg-red-950/30 border border-red-950/40 hover:border-red-900/50 rounded-xl text-left transition-all group disabled:opacity-40"
                >
                  <div className="font-bold text-red-400 text-xs font-mono flex items-center justify-between">
                    <span>Revoke VPN Gateway</span>
                  </div>
                  <div className="text-[10px] text-slate-400 mt-1 font-sans">
                    Terminate active connections from external host IPs.
                  </div>
                </button>

                <button
                  onClick={() => executeContainment('generic_net', 'isolate-network IT_segment OT_segment')}
                  disabled={isExecuting}
                  className="w-full p-3 bg-red-950/10 hover:bg-red-950/30 border border-red-950/40 hover:border-red-900/50 rounded-xl text-left transition-all group disabled:opacity-40"
                >
                  <div className="font-bold text-red-400 text-xs font-mono flex items-center justify-between">
                    <span>Isolate Segments</span>
                  </div>
                  <div className="text-[10px] text-slate-400 mt-1 font-sans">
                    Isolate primary domain servers from OT segments.
                  </div>
                </button>
              </>
            )}
          </div>

          {/* Containment CLI output logs */}
          <div className="border border-red-950/30 rounded-xl bg-black/60 p-2.5 h-36 flex flex-col font-mono text-[9px]">
            <div className="text-red-500 uppercase tracking-widest font-mono font-bold border-b border-red-950/40 pb-1 mb-1.5 select-none">
              Containment Terminal Console
            </div>
            <div className="flex-1 overflow-y-auto space-y-1 scrollbar-ops">
              {consoleLogs.map((log, i) => (
                <div key={i} className="leading-normal">
                  <span className="text-slate-600">[{log.time}]</span>{' '}
                  <span className={log.text.startsWith('[EXEC]') ? 'text-amber-500' : log.text.startsWith('[SYSTEM]') ? 'text-red-400' : 'text-slate-400 whitespace-pre-wrap'}>
                    {log.text}
                  </span>
                </div>
              ))}
              <div ref={consoleEndRef} />
            </div>
          </div>
        </div>
      </div>

      {/* Cybersecurity Incident Playbook Sliding Drawer */}
      <AnimatePresence>
        {showHelpBook && (
          <motion.div 
            initial={{ opacity: 0, x: 300 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 300 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="absolute top-0 right-0 w-[420px] h-full bg-[#0a080d]/95 border-l border-red-950/50 backdrop-blur-xl z-50 flex flex-col shadow-2xl p-5"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-red-950/40 pb-3 mb-4 select-none">
              <div className="flex items-center gap-2">
                <span className="text-red-400">📖</span>
                <h3 className="font-mono font-bold text-xs uppercase text-red-400 tracking-wider">
                  Cyber Incident Playbook & Command Reference
                </h3>
              </div>
              <button 
                onClick={() => setShowHelpBook(false)}
                className="text-slate-500 hover:text-slate-300 font-mono text-xs uppercase tracking-widest px-2.5 py-1 rounded bg-[#16121b] border border-red-950/20 hover:border-red-900/40 transition-all font-semibold"
              >
                Close
              </button>
            </div>

            {/* Content list */}
            <div className="flex-1 overflow-y-auto space-y-4 pr-1 scrollbar-ops select-none font-sans text-xs">
              <div className="text-[10px] text-slate-500 font-mono leading-relaxed mb-1 uppercase tracking-widest font-bold">
                SCENARIO SPECIFIC CONTAINMENT PATHWAYS
              </div>

              <div className="p-3 rounded-xl border border-red-950/30 bg-red-950/5 space-y-1.5">
                <div className="font-bold text-[10px] text-red-400 font-mono">1. UBER MFA ATTACK</div>
                <p className="text-slate-300 text-[11px] leading-relaxed">
                  Adversary uses MFA Fatigue (Push Bombing) to exhaust a contractor. The priority is revoking the active VPN lease of <code>contractor.user@uber.com</code>, enforcing Duo number matching policies, and rotating PAM passwords.
                </p>
              </div>

              <div className="p-3 rounded-xl border border-amber-950/30 bg-amber-950/5 space-y-1.5">
                <div className="font-bold text-[10px] text-amber-400 font-mono">2. COLONIAL PIPELINE RANSOMWARE</div>
                <p className="text-slate-300 text-[11px] leading-relaxed">
                  Adversary accesses IT network via a legacy inactive VPN profile. DarkSide ransomware is laterally traversing to OT networks. You must disable the compromised legacy VPN, isolate the logical IT/OT segments, and stop pumping systems safely.
                </p>
              </div>

              <div className="p-3 rounded-xl border border-cyan-950/30 bg-cyan-950/5 space-y-1.5">
                <div className="font-bold text-[10px] text-cyan-400 font-mono">3. SOLARWINDS SUPPLY CHAIN</div>
                <p className="text-slate-300 text-[11px] leading-relaxed">
                  Backdoor injected into update pipeline allows golden Active Directory token creation. Target containment by invalidating the build agent token, enforcing strict cert verification, and rotating domain admin credentials in Thycotic.
                </p>
              </div>

              <div className="p-3 rounded-xl border border-purple-950/30 bg-purple-950/5 space-y-1.5">
                <div className="font-bold text-[10px] text-purple-400 font-mono">4. TARGET RETAIL POS BREACH</div>
                <p className="text-slate-300 text-[11px] leading-relaxed">
                  Intruder gains initial portal access via HVAC supplier and jumps to POS VLANS to scrape Track-2 card credentials. Containment requires terminating HVAC vendor access, separating POS VLANS, and rotating database secrets.
                </p>
              </div>

              <div className="p-3 rounded-xl border border-green-950/30 bg-green-950/5 space-y-1.5">
                <div className="font-bold text-[10px] text-green-400 font-mono">5. EQUIFAX DB BREACH</div>
                <p className="text-slate-300 text-[11px] leading-relaxed">
                  Threat actors exploit unpatched Apache Struts shells to query databases in bulk. Your actions must isolate the Struts application traffic proxy, segment internal database subnets, and rotate master DB connection passwords.
                </p>
              </div>

              <div className="text-[10px] text-slate-500 font-mono leading-relaxed mb-1 mt-4 uppercase tracking-widest font-bold">
                GENERAL SECURITY COMMAND GLOSSARY
              </div>

              {/* vpn-session-manager */}
              <div className="p-3 rounded-xl border border-slate-800 bg-[#0f0d11] space-y-2">
                <div className="flex items-center justify-between font-mono">
                  <span className="font-bold text-[11px] text-red-400">vpn-session-manager terminate</span>
                  <span className="px-1.5 py-0.5 rounded bg-red-950/50 text-[8px] font-mono text-red-400 border border-red-900/20">ACCESS REVOCATION</span>
                </div>
                <p className="text-slate-300 text-[11px] leading-relaxed">
                  <strong>Description:</strong> Instantly severs the active secure tunnel interface associated with the target VPN user IP address lease.
                </p>
                <p className="text-slate-400 text-[11px] leading-relaxed italic border-t border-red-950/10 pt-1">
                  💡 <strong>Strategic Context:</strong> Critical for containing active adversaries in real-time when perimeter credentials have been compromised.
                </p>
              </div>

              {/* duo-policy */}
              <div className="p-3 rounded-xl border border-slate-800 bg-[#0f0d11] space-y-2">
                <div className="flex items-center justify-between font-mono">
                  <span className="font-bold text-[11px] text-amber-400">duo-policy update</span>
                  <span className="px-1.5 py-0.5 rounded bg-amber-950/50 text-[8px] font-mono text-amber-400 border border-amber-900/20">MFA REINFORCEMENT</span>
                </div>
                <p className="text-slate-300 text-[11px] leading-relaxed">
                  <strong>Description:</strong> Updates active Duo corporate policies to enforce strict number-matching input parameters on user authentication prompts prompts.
                </p>
                <p className="text-slate-400 text-[11px] leading-relaxed italic border-t border-amber-950/10 pt-1">
                  💡 <strong>Strategic Context:</strong> Defeats MFA Fatigue attacks (Prompt Bombing) where the attacker repeatedly triggers authentications until the exhausted employee clicks "Approve".
                </p>
              </div>

              {/* thycotic-cli */}
              <div className="p-3 rounded-xl border border-slate-800 bg-[#0f0d11] space-y-2">
                <div className="flex items-center justify-between font-mono">
                  <span className="font-bold text-[11px] text-cyan-400">thycotic-cli credentials rotate</span>
                  <span className="px-1.5 py-0.5 rounded bg-cyan-950/50 text-[8px] font-mono text-cyan-400 border border-cyan-900/20">CREDENTIAL ROTATION</span>
                </div>
                <p className="text-slate-300 text-[11px] leading-relaxed">
                  <strong>Description:</strong> Forcefully rotates and regenerates cryptographically strong secrets inside the central Privileged Access Management (PAM) system vault.
                </p>
                <p className="text-slate-400 text-[11px] leading-relaxed italic border-t border-cyan-950/10 pt-1">
                  💡 <strong>Strategic Context:</strong> Revokes systemic persistence capabilities from adversaries who have dumped local system memory hash keys or extracted passwords.
                </p>
              </div>

              {/* isolate-network */}
              <div className="p-3 rounded-xl border border-slate-800 bg-[#0f0d11] space-y-2">
                <div className="flex items-center justify-between font-mono">
                  <span className="font-bold text-[11px] text-purple-400">isolate-network</span>
                  <span className="px-1.5 py-0.5 rounded bg-purple-950/50 text-[8px] font-mono text-purple-400 border border-purple-900/20">SEGMENT LOCKDOWN</span>
                </div>
                <p className="text-slate-300 text-[11px] leading-relaxed">
                  <strong>Description:</strong> Tears down network-level bridging and isolates core IT business networks entirely from critical SCADA/OT segments.
                </p>
                <p className="text-slate-400 text-[11px] leading-relaxed italic border-t border-purple-950/10 pt-1">
                  💡 <strong>Strategic Context:</strong> A defensive perimeter firewall segment action to halt rapid horizontal malware or ransomware traversal across internal segments.
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default CyberSecurityWorkspace;
