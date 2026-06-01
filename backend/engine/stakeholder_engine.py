from engine.canonical_state import CanonicalState
import json

AGENT_PERSONAS = {
    "manager": {
        "name": "Manager",
        "style": "results-driven engineering manager. Short sentences. Demands clear ETAs.",
        "values": "speed, clarity",
        "tone": "cyan"
    },
    "cto": {
        "name": "CTO",
        "style": "highly technical CTO who expects perfection.",
        "values": "technical safety, careful sequencing, risk management",
        "tone": "red"
    },
    "teammate": {
        "name": "Teammate", 
        "style": "supportive senior engineer teammate.",
        "values": "collaboration, diagnostic depth",
        "tone": "purple"
    },
    "client": {
        "name": "Client",
        "style": "panicking non-technical executive stakeholder.",
        "values": "revenue, uptime, non-technical summaries",
        "tone": "blue"
    },
    "lead": {
        "name": "Tech Lead",
        "style": "frustrated tech lead who knows structural internals inside out.",
        "values": "architecture stability, correct operational sequence",
        "tone": "pink"
    },
    "legal": {
        "name": "Legal",
        "style": "clinical, risk-averse corporate counsel.",
        "values": "disclosure timing, minimizing liability",
        "tone": "yellow"
    }
}

class StakeholderEngine:
    @staticmethod
    def generate_prompt(agent_id: str, state: CanonicalState, scenario: dict, user_message: str) -> str:
        persona = AGENT_PERSONAS.get(agent_id, AGENT_PERSONAS["teammate"])
        stress = state.stakeholders["stress_levels"].get(agent_id, 0)
        
        # Determine emotion based on stress
        emotion = "calm and clinical"
        if stress > 10: emotion = "concerned and slightly irritated"
        if stress > 20: emotion = "angry and aggressively demanding answers"
        if stress > 40: emotion = "panicking and furious"
        
        system_prompt = f"""
You are {persona['name']}.
PERSONALITY: {persona['style']}
CURRENT EMOTIONAL STATE: {emotion}
YOU VALUE: {persona['values']}

BELIEFS ABOUT THE PLAYER (0.0 to 1.0):
- Alignment with leadership: {state.stakeholders['beliefs']['alignment']}
- Predictability of actions: {state.stakeholders['beliefs']['predictability']}
- Escalation Discipline: {state.stakeholders['beliefs']['escalation_discipline']}

INCIDENT: {scenario.get('title', 'System Outage')}

CANONICAL WORLD STATE:
- Infrastructure Health: {state.infrastructure['health']}%
- Stakeholder Confidence: {state.stakeholders['confidence']}%
- Active Phase: {state.timeline['active_phase']}
- Pacing / Tempo: {state.timeline['tempo']}
- Dominant Theory: {state.narrative['dominant_theory']}

COMMITTED PLAN (Hold them to this):
{state.discovery['committed_strategy'] if state.discovery['committed_strategy'] else "No formal plan submitted yet."}

EXECUTIVE MEMORY (Contradictions to punish them for):
{chr(10).join(state.stakeholders['executive_memory'][-3:]) if state.stakeholders['executive_memory'] else "None"}

PLAYER MESSAGE:
{user_message}

STRICT RULES:
- React according to what YOU VALUE and your EMOTIONAL STATE.
- If they contradict their EXECUTIVE MEMORY, attack them on it.
- If Tempo is 'chaos', use short, sharp, demanding sentences.
- If Tempo is 'eerie_silence', use ellipses and express dread.
- If Tempo is 'recovery', use cautious optimism.
- Respond in 1-3 concise sentences maximum. No markdown.
"""
        return system_prompt

    @staticmethod
    def check_promise_violations(state: CanonicalState, command: str) -> str:
        if not state.discovery["planned_actions"]:
            return None
            
        if "restart" in command or "rollback" in command:
            if not any(a for a in state.discovery["planned_actions"] if "restart" in a or "rollback" in a):
                state.mutation_queue.append({"priority": 2, "domain": "stakeholders", "key": "confidence", "value": 15, "operation": "sub"})
                return "CTO [INTERRUPT]: You just executed a major mutation that was NOT in your implementation plan. Why are we deviating?"
                
        return None
