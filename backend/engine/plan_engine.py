from engine.canonical_state import CanonicalState
from ai_client import ask_ai
import json

class PlanEngine:
    @staticmethod
    def evaluate(state: CanonicalState, scenario: dict, plan_text: str) -> dict:
        """
        Uses LLM strictly to grade the communication and reasoning of the plan.
        """
        system_prompt = """
        You are an organizational AI grading an SRE's implementation plan during a critical incident.
        Grade strictly based on:
        1. Clarity (is it easy to read under pressure?)
        2. Leadership Confidence (does it sound authoritative?)
        3. Prioritization (does it explicitly mention isolating damage before making changes?)
        
        DO NOT judge if the commands are technically perfect. Judge the organizational framing.
        
        Return STRICT JSON:
        {
            "plan_score": <int 0-100>,
            "feedback": "<1 sentence feedback from a CTO perspective>",
            "planned_actions": ["list", "of", "extracted", "key", "actions"]
        }
        """
        
        user_prompt = f"Incident Phase: {state.timeline['active_phase']}\nPlan:\n{plan_text}"
        messages = [{"role": "system", "content": system_prompt}, {"role": "user", "content": user_prompt}]
        
        try:
            raw_response = ask_ai(messages)
            start_idx = raw_response.find("{")
            end_idx = raw_response.rfind("}") + 1
            res = json.loads(raw_response[start_idx:end_idx])
            
            state.discovery["planned_actions"] = [a.lower() for a in res.get("planned_actions", [])]
            state.discovery["committed_strategy"] = plan_text
            
            score = res.get("plan_score", 50)
            if score >= 80:
                state.mutation_queue.append({"priority": 2, "domain": "stakeholders", "key": "confidence", "value": 15, "operation": "add"})
            elif score < 50:
                state.mutation_queue.append({"priority": 2, "domain": "stakeholders", "key": "confidence", "value": 15, "operation": "sub"})
                
            return res
        except Exception:
            state.discovery["planned_actions"] = ["unknown"]
            return {"plan_score": 50, "feedback": "Plan received but formatting was unclear.", "planned_actions": []}
