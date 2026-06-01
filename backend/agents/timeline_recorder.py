"""
timeline_recorder.py — Swe Timeline Recorder Agent.
Chronologically records all executed commands, states, and verdicts for the Replay Viewer.
"""

from __future__ import annotations
import time
from typing import Optional, Dict, Any, List

class TimelineRecorder:
    def __init__(self):
        # In-memory store for session timelines: { session_id: [ events ] }
        self._timelines: Dict[str, List[Dict[str, Any]]] = {}

    def start_recording(self, session_id: str, scenario_id: str, initial_state: Optional[Dict[str, Any]] = None):
        self._timelines[session_id] = [{
            "timestamp": time.time(),
            "elapsed_seconds": 0,
            "event_type": "session_start",
            "scenario_id": scenario_id,
            "message": f"Incident simulation started for scenario: {scenario_id}.",
            "state_snapshot": initial_state or {}
        }]

    def record_event(
        self,
        session_id: str,
        command: str,
        verdict: str,
        points: int,
        phase: str,
        terminal_output: str,
        metrics_snapshot: Optional[Dict[str, Any]] = None
    ):
        if session_id not in self._timelines:
            self.start_recording(session_id, "unknown")

        timeline = self._timelines[session_id]
        start_time = timeline[0]["timestamp"]
        elapsed = time.time() - start_time

        timeline.append({
            "timestamp": time.time(),
            "elapsed_seconds": round(elapsed, 2),
            "event_type": "command_execution",
            "command": command,
            "verdict": verdict,
            "points": points,
            "phase": phase,
            "terminal_output": terminal_output[:300] + ("..." if len(terminal_output) > 300 else ""),
            "metrics_snapshot": metrics_snapshot or {}
        })

    def record_event_anomaly(self, session_id: str, sender: str, message: str, priority: str = "medium"):
        if session_id not in self._timelines:
            return
        
        timeline = self._timelines[session_id]
        elapsed = time.time() - timeline[0]["timestamp"]
        
        timeline.append({
            "timestamp": time.time(),
            "elapsed_seconds": round(elapsed, 2),
            "event_type": "spontaneous_event",
            "sender": sender,
            "message": message,
            "priority": priority
        })

    def export_timeline(self, session_id: str) -> List[Dict[str, Any]]:
        """Returns the chronological replay log for the Replay Viewer."""
        return self._timelines.get(session_id, [])

    def clear_recording(self, session_id: str):
        self._timelines.pop(session_id, None)

timeline_recorder = TimelineRecorder()