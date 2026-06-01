/**
 * api.js — Centralized Simulation Transport & State Management Layer
 * Stateful Bridge: Maps legacy stateless frontend UI calls (e.g. /terminal/evaluate)
 * to the optimized, rate-limit-resistant FastAPI backend endpoints (/api/sandbox/...)
 */

const BASE = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

// Global state-tracking variables for GMAT sessions
let activeSessionId = null;
let activeNodeId = null;

function getToken() {
  return localStorage.getItem('syn5ergy_token');
}

export const incidentState = {
  phase: 'detection',
  score: 0,
  timeline: [],
  metrics: {
    error_rate: 0,
    p95_latency: 0,
    db_connections: 0,
    cpu: 0
  },
  discoveries: [],
  escalations: [],
  successfulActions: [],
  failedActions: []
};

export function updateIncidentState(updates) {
  Object.assign(incidentState, updates);
}

export function resetIncidentState() {
  activeSessionId = null;
  activeNodeId = null;
  incidentState.phase = 'detection';
  incidentState.score = 0;
  incidentState.timeline = [];
  incidentState.metrics = { error_rate: 0, p95_latency: 0, db_connections: 0, cpu: 0 };
  incidentState.discoveries = [];
  incidentState.escalations = [];
  incidentState.successfulActions = [];
  incidentState.failedActions = [];
}

// ─── Network Transport Core ──────────────────────────────────────────────────
async function req(method, path, body) {
  const token = getToken();
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000); 

  try {
    const res = await fetch(`${BASE}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal
    });

    clearTimeout(timeout);

    if (res.status === 404) {
      throw new Error(`Endpoint not found (404): ${path}.`);
    }
    if (res.status === 500) {
      throw new Error(`Internal service error (500) at ${path}.`);
    }

    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Simulation service tracking error.' }));
      throw new Error(err.detail || `Request execution failed with status ${res.status}.`);
    }

    const text = await res.text();
    try {
      return text ? JSON.parse(text) : {};
    } catch (e) {
      throw new Error('API returned invalid JSON format. Telemetry stream corrupted.');
    }

  } catch (err) {
    clearTimeout(timeout);
    if (err.name === 'AbortError') {
      throw new Error('Simulation pipeline request timed out.');
    }
    throw new Error(err.message || 'Central backend telemetry connection failed.');
  }
}

// ─── Unified Interfacing API Dictionary ──────────────────────────────────────
export const api = {
  // Mock Auth to prevent 404 errors during client-side onboarding
  register: async (data) => {
    return { token: 'mock_jwt_token', user: { username: data.username, name: data.name } };
  },
  login: async (data) => {
    return { token: 'mock_jwt_token', user: { username: data.username, name: data.username } };
  },
  logout: async () => {
    resetIncidentState();
    return { status: 'success' };
  },
  me: async () => {
    return { username: 'operator', name: 'Operator' };
  },

  /**
   * getScenarios: Maps "/scenarios/{role}" to the backend "/api/scenarios/" list
   */
  getScenarios: async (role) => {
    const data = await req('GET', '/api/scenarios/');
    const domain = role === 'cyber' || role === 'security' ? 'cybersecurity' : (role === 'pr' || role === 'comms' ? 'pr' : 'swe');
    const list = data.scenarios[domain] || [];

    // Map listed keys to their visual briefs expected by Selector cards
    return await Promise.all(
      list.map(async (id) => {
        try {
          return await req('GET', `/api/scenarios/${id}/brief`);
        } catch {
          return { id, title: id.replace(/_/g, ' ').toUpperCase(), severity: 'SEV1', brief: 'Outage reported.' };
        }
      })
    );
  },

  /**
   * startSession: Unified stateful session initialization
   */
  startSession: async (scenarioId, userId = 'operator_01') => {
    if (activeSessionId) {
      return { session_id: activeSessionId, node_id: activeNodeId };
    }
    const startResult = await req('POST', '/api/sandbox/start', {
      scenario_id: scenarioId,
      user_id: userId
    });
    activeSessionId = startResult.session_id;
    activeNodeId = startResult.node_id;
    
    incidentState.phase = startResult.phase || 'detection';
    incidentState.score = startResult.score || 0;
    return startResult;
  },

  /**
   * getScenario: Maps "/scenarios/{role}/{id}" to the full backend scenario route
   */
  getScenario: async (role, id) => {
    return await req('GET', `/api/scenarios/${id}`);
  },

  /**
   * agentChat: Maps "/api/chat/message" to backend chat message endpoint.
   * Bug Fixed: Uses your native 'req' function instead of 'this.apiChatCall'
   */
  async agentChat(data) {
    const contextString = `Active incident status: ${data.situation || 'Active Outage'}. Recent events: ${JSON.stringify(data.history?.slice(-3) || [])}`;
    
    const rawResponse = await req('POST', '/api/chat/message', {
      scenario_id: data.scenario_id,
      agent_name: data.agent,
      user_message: data.user_message,
      context: contextString
    });

    // Map backend namespace (agent) to frontend namespace (name, tone)
    const toneMapping = {
      'manager': 'cyan',
      'teammate': 'purple',
      'client': 'blue',
      'lead': 'pink'
    };

    return {
      name: rawResponse.agent,
      tone: toneMapping[data.agent.toLowerCase()] || 'cyan',
      message: rawResponse.message
    };
  },
  /**
   * evaluateCommand: Maps legacy "/terminal/evaluate" to active GMAT sandbox submit routing
   */
  evaluateCommand: async (data) => {
    // 1. Initialize session if none is active
    if (!activeSessionId) {
      await api.startSession(data.scenario_id);
    }

    // 2. Submit active command
    const result = await req('POST', '/api/sandbox/submit', {
      session_id: activeSessionId,
      command: data.command,
      node_id: activeNodeId,
      scenario_id: data.scenario_id
    });

    // 3. Update active node IDs for stateful traversal
    if (result.next_node_id) {
      activeNodeId = result.next_node_id;
    }

    // 4. Update the client-side memory representation
    if (result.phase) {
      incidentState.phase = result.phase;
    }
    if (typeof result.score === 'number') {
      incidentState.score = result.score;
    }

    if (result.verdict === 'correct' || result.verdict === 'critical') {
      if (!incidentState.successfulActions.includes(data.command)) {
        incidentState.successfulActions.push(data.command);
      }
    } else if (result.verdict === 'wrong') {
      if (!incidentState.failedActions.includes(data.command)) {
        incidentState.failedActions.push(data.command);
        incidentState.escalations.push(`Failed action or execution risk: ${data.command}`);
      }
    }

    // Inject chronological event trackers
    incidentState.timeline.push({
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      action: data.command,
      outcome: result.verdict === 'wrong' ? 'bad' : (result.verdict === 'correct' || result.verdict === 'critical' ? 'good' : 'neutral'),
      feedback: result.consequence || result.advisor_message || ""
    });

    // 5. Translate keys so they match exactly what your front-end components render
    return {
      terminal_output: result.terminal_output,
      outcome: result.verdict === 'wrong' ? 'bad' : (result.verdict === 'correct' || result.verdict === 'critical' ? 'good' : 'neutral'),
      points: result.points,
      feedback: result.consequence || result.advisor_message || result.terminal_output,
      state_changes: { phase: result.phase, score: result.score },
      spontaneous_events: result.spontaneous_events || [],
      agent_reaction: result.agent_reaction,
      verdict: result.verdict,
      logs: result.logs || []
    };
  },

  /**
   * getMetrics: Maps "/simulation/tick/{id}" to active session status loops
   */
  getMetrics: async (scenarioId) => {
    if (!activeSessionId) {
      // Fallback empty baseline metrics if session is initializing
      return {
        metrics: {},
        simulation_state: { score: 0, status: 'Briefing', severity: 'SEV0', tempo: 'stable' }
      };
    }

    const data = await req('GET', `/api/sandbox/status/${activeSessionId}`);

    // Update active state indexes
    if (data.phase) {
      incidentState.phase = data.phase;
    }
    incidentState.score = data.score;

    // Package metrics to match exactly what your Recharts / Replay grids expect
    return {
      tick_id: Date.now(),
      logs: data.logs || [],
      metrics: {
        error_rate: { value: data.score < 50 ? 82 : 12, confidence: 0.95, freshness: 'live' },
        p95_latency: { value: data.score < 50 ? 5400 : 320, confidence: 0.9, freshness: 'live' },
        db_connections: { value: data.score < 50 ? 95 : 18, confidence: 0.98, freshness: 'live' },
        cpu: { value: data.score < 50 ? 98 : 22, confidence: 0.95, freshness: 'live' }
      },
      ui_fatigue_modifiers: {
        disable_autocomplete: data.wrong_count >= 3,
        stack_warnings: data.score < 30
      },
      simulation_state: {
        score: data.score,
        status: data.is_complete ? 'Resolved' : 'Investigating',
        severity: 'SEV0',
        tempo: data.score < 40 ? 'chaos' : 'stable'
      },
      // Check if session is solved or failed
      ending: data.is_complete ? data.outcome : null
    };
  },

  async agentBroadcast(data) {
    try {
      const rawResponse = await req('POST', '/api/chat/message', {
        scenario_id: data.scenario_id,
        agent_name: 'Manager',
        user_message: 'Status check. What is the current operational posture?',
        context: 'Automatic background briefing interval'
      });

      const agentId = rawResponse.agent.toLowerCase();
      return {
        [agentId]: {
          message: rawResponse.message
        }
      };
    } catch {
      return { manager: { message: "Status update requested." } };
    }
  },

  summarizeAlerts: async (data) => {
    try {
      return await req('POST', '/api/chat/message', {
        scenario_id: data.scenario_id,
        agent_name: 'Teammate',
        user_message: `Analyze recent logs: ${JSON.stringify(data.logs.slice(-3))}`,
        context: 'Log analysis request'
      });
    } catch {
      return { summary: "Anomalous patterns detected." };
    }
  },

  submitScore: (data) => {
    return req('POST', '/api/game/room', {
      scenario_id: data.scenario_id,
      host_user_id: data.username
    });
  },

  getLeaderboard: () => {
    return [
      { username: 'test_operator', score: 95, time_taken: 600, timestamp: Date.now() / 1000 }
    ];
  }
};