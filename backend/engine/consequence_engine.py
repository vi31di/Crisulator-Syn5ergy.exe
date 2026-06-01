from engine.canonical_state import CanonicalState
import time

class ConsequenceEngine:
    @staticmethod
    def queue_event(state: CanonicalState, domain: str, key: str, value: int, delay_seconds: int, description: str, operation: str = "add"):
        """
        Adds a delayed consequence to the CanonicalState timeline.
        """
        state.delayed_events.append({
            "trigger_time": time.time() + delay_seconds,
            "domain": domain,
            "key": key,
            "value": value,
            "operation": operation,
            "description": description
        })
        
    @staticmethod
    def process_queue(state: CanonicalState) -> list:
        """
        Pops mature events and adds them to the Orchestrator mutation queue.
        Returns a list of descriptions for any popped events.
        """
        now = time.time()
        popped = []
        remaining = []
        
        for event in state.delayed_events:
            if now >= event["trigger_time"]:
                state.mutation_queue.append({
                    "priority": 1,
                    "domain": event["domain"],
                    "key": event["key"],
                    "value": event["value"],
                    "operation": event.get("operation", "add")
                })
                popped.append(event["description"])
            else:
                remaining.append(event)
                
        state.delayed_events = remaining
        return popped
