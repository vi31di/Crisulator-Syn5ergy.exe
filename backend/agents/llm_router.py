"""
llm_router.py — Multi-provider LLM router with automatic fallback.

Provider priority (fastest / most generous limits first):
  1. Groq          — ~14,400 TPM free, ultra-low latency  ← best for pressure testing
  2. Gemini Flash  — free tier, high quota
  3. Local Llama   — offline, unlimited, slower
  4. OpenRouter    — existing key (DeepSeek), lowest TPM  ← last resort

Each provider tracks its own call count and cooldown so we never
hammer one endpoint. The router picks the least-used available provider.

Usage:
    from agents.llm_router import llm_router
    text = await llm_router.generate(system_prompt, user_msg, max_tokens=150)
    text = llm_router.generate_sync(system_prompt, user_msg, max_tokens=150)
"""

from __future__ import annotations
import os, time, asyncio, logging
from dataclasses import dataclass, field
from typing import Optional, Callable

log = logging.getLogger(__name__)


# ── Provider config ────────────────────────────────────────────────────────────

@dataclass
class ProviderState:
    name:            str
    calls_this_min:  int   = 0
    tokens_this_min: int   = 0
    window_start:    float = field(default_factory=time.time)
    total_calls:     int   = 0
    failures:        int   = 0
    last_failure:    float = 0.0
    # Limits
    max_calls_per_min:  int = 60
    max_tokens_per_min: int = 14000

    def reset_window_if_needed(self) -> None:
        if time.time() - self.window_start >= 60:
            self.calls_this_min  = 0
            self.tokens_this_min = 0
            self.window_start    = time.time()

    def is_available(self, needed_tokens: int = 200) -> bool:
        self.reset_window_if_needed()
        # Back off 30s after 3 consecutive failures
        if self.failures >= 3 and time.time() - self.last_failure < 30:
            return False
        return (
            self.calls_this_min  < self.max_calls_per_min and
            self.tokens_this_min + needed_tokens < self.max_tokens_per_min
        )

    def record_call(self, tokens_used: int) -> None:
        self.reset_window_if_needed()
        self.calls_this_min  += 1
        self.tokens_this_min += tokens_used
        self.total_calls     += 1
        self.failures         = 0   # reset on success

    def record_failure(self) -> None:
        self.failures     += 1
        self.last_failure  = time.time()


# ── Individual provider call functions ────────────────────────────────────────

def _call_groq(system_prompt: str, user_msg: str, max_tokens: int) -> str:
    """
    Groq API — llama3-8b-instruct or mixtral-8x7b.
    Free tier: ~14,400 TPM, 30 RPM. Extremely fast (<500ms).
    Get key: https://console.groq.com
    """
    import requests
    api_key = os.getenv("GROQ_API_KEY", "")
    if not api_key:
        raise ValueError("GROQ_API_KEY not set")

    resp = requests.post(
        "https://api.groq.com/openai/v1/chat/completions",
        headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
        json={
            "model":      "llama-3.1-8b-instant",   # fast, generous limits
            "messages":   [
                {"role": "system", "content": system_prompt},
                {"role": "user",   "content": user_msg},
            ],
            "max_tokens": max_tokens,
            "temperature": 0.85,   # higher = more varied questions
        },
        timeout=10,
    )
    resp.raise_for_status()
    return resp.json()["choices"][0]["message"]["content"].strip()


def _call_gemini(system_prompt: str, user_msg: str, max_tokens: int) -> str:
    """
    Google Gemini Flash — modern implementation supporting standard (AIza) 
    and newer Authorization (AQ.) API keys.
    """
    import requests
    api_key = os.getenv("GEMINI_API_KEY", "")
    if not api_key:
        raise ValueError("GEMINI_API_KEY not set")

    prompt = f"{system_prompt}\n\n{user_msg}"
    
    # MODERN STANDARD: Pass key via 'x-goog-api-key' header instead of query parameters.
    # This solves the 404 / auth validation errors for newer 'AQ.' prefix keys.
    resp = requests.post(
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",
        headers={
            "Content-Type": "application/json",
            "x-goog-api-key": api_key
        },
        json={
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {"maxOutputTokens": max_tokens, "temperature": 0.85},
        },
        timeout=15,
    )
    resp.raise_for_status()
    return resp.json()["candidates"][0]["content"]["parts"][0]["text"].strip()


def _call_local_llm(system_prompt: str, user_msg: str, max_tokens: int) -> str:
    """Local Llama GGUF — zero rate limit, works offline."""
    import sys
    backend_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    if backend_root not in sys.path:
        sys.path.insert(0, backend_root)
    from services.local_llm_service import llm_service
    if llm_service._model is None:
        raise RuntimeError("Local model not loaded")
    return llm_service.generate_response(system_prompt, user_msg, max_tokens)


def _call_openrouter(system_prompt: str, user_msg: str, max_tokens: int) -> str:
    """OpenRouter / DeepSeek — existing key, lowest TPM, last resort."""
    import requests
    api_key = os.getenv("OPENROUTER_API_KEY", "")
    if not api_key:
        raise ValueError("OPENROUTER_API_KEY not set")

    resp = requests.post(
        "https://openrouter.ai/api/v1/chat/completions",
        headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
        json={
            "model": "deepseek/deepseek-chat",
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user",   "content": user_msg},
            ],
            "max_tokens": max_tokens,
        },
        timeout=30,
    )
    resp.raise_for_status()
    return resp.json()["choices"][0]["message"]["content"].strip()


# ── Router ─────────────────────────────────────────────────────────────────────

class LLMRouter:
    """
    Routes LLM calls across providers, automatically falling back when
    a provider is rate-limited or unavailable.
    """

    def __init__(self):
        # Order = priority. Groq first because highest TPM + lowest latency.
        self._providers: list[tuple[ProviderState, Callable]] = [
            (ProviderState("groq",       max_calls_per_min=28,  max_tokens_per_min=13000), _call_groq),
            (ProviderState("gemini",     max_calls_per_min=55,  max_tokens_per_min=30000), _call_gemini),
            (ProviderState("local_llm",  max_calls_per_min=999, max_tokens_per_min=999999), _call_local_llm),
            (ProviderState("openrouter", max_calls_per_min=4,   max_tokens_per_min=3000),  _call_openrouter),
        ]

    def _pick_provider(self, needed_tokens: int) -> Optional[tuple[ProviderState, Callable]]:
        """Return the highest-priority available provider."""
        for state, fn in self._providers:
            if state.is_available(needed_tokens):
                return state, fn
        return None

    def generate_sync(
        self,
        system_prompt: str,
        user_msg:      str,
        max_tokens:    int = 200,
    ) -> str:
        """Synchronous generation — tries providers in priority order."""
        needed = max_tokens + len(system_prompt.split()) + len(user_msg.split())
        pick   = self._pick_provider(needed)

        if pick is None:
            log.warning("All LLM providers rate-limited — returning fallback")
            return ""   # empty string → caller uses pure-Python fallback

        state, fn = pick
        try:
            result = fn(system_prompt, user_msg, max_tokens)
            state.record_call(len(result.split()))
            log.debug(f"LLM call via {state.name} ({state.calls_this_min}/{state.max_calls_per_min} this min)")
            return result
        except Exception as e:
            state.record_failure()
            log.warning(f"Provider {state.name} failed: {e}. Trying next...")
            # Recurse once — try remaining providers
            return self._fallback_generate(system_prompt, user_msg, max_tokens, skip=state.name)

    def _fallback_generate(
        self,
        system_prompt: str,
        user_msg:      str,
        max_tokens:    int,
        skip:          str,
    ) -> str:
        for state, fn in self._providers:
            if state.name == skip:
                continue
            if not state.is_available(max_tokens):
                continue
            try:
                result = fn(system_prompt, user_msg, max_tokens)
                state.record_call(len(result.split()))
                return result
            except Exception as e:
                state.record_failure()
                log.warning(f"Fallback provider {state.name} also failed: {e}")
        return ""   # all providers failed

    async def generate(
        self,
        system_prompt: str,
        user_msg:      str,
        max_tokens:    int = 200,
    ) -> str:
        """Async wrapper — runs sync call in thread pool."""
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(
            None,
            self.generate_sync,
            system_prompt,
            user_msg,
            max_tokens,
        )

    def provider_status(self) -> list[dict]:
        """Return current status of all providers (for /api/sandbox/status)."""
        result = []
        for state, _ in self._providers:
            state.reset_window_if_needed()
            result.append({
                "name":              state.name,
                "calls_this_min":    state.calls_this_min,
                "max_calls_per_min": state.max_calls_per_min,
                "tokens_this_min":   state.tokens_this_min,
                "total_calls":       state.total_calls,
                "failures":          state.failures,
                "available":         state.is_available(),
            })
        return result


# Singleton
llm_router = LLMRouter()
