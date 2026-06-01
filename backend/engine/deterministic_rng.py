import hashlib

class DeterministicRNG:
    @staticmethod
    @staticmethod
    def _hash_to_float(engine_domain: str, seed: str) -> float:
        """Returns a deterministic float between 0.0 and 1.0 based on domain and seed."""
        h = hashlib.sha256(f"{engine_domain}:{seed}".encode('utf-8')).hexdigest()
        # Convert first 8 hex characters to a float in [0, 1)
        return int(h[:8], 16) / 0xFFFFFFFF
        
    @staticmethod
    def seeded_random(engine_domain: str, seed: str) -> float:
        """Returns a deterministic float between 0.0 and 1.0."""
        return DeterministicRNG._hash_to_float(engine_domain, seed)
        
    @staticmethod
    def seeded_randint(engine_domain: str, seed: str, min_val: int, max_val: int) -> int:
        """Returns a deterministic integer between min_val and max_val inclusive."""
        f = DeterministicRNG._hash_to_float(engine_domain, seed)
        return min_val + int(f * (max_val - min_val + 1))
        
    @staticmethod
    def seeded_uniform(engine_domain: str, seed: str, min_val: float, max_val: float) -> float:
        """Returns a deterministic float between min_val and max_val."""
        f = DeterministicRNG._hash_to_float(engine_domain, seed)
        return min_val + (f * (max_val - min_val))
        
    @staticmethod
    def seeded_choice(engine_domain: str, seed: str, seq: list):
        """Returns a deterministic choice from a sequence."""
        if not seq:
            raise IndexError("Cannot choose from an empty sequence")
        f = DeterministicRNG._hash_to_float(engine_domain, seed)
        idx = int(f * len(seq))
        return seq[idx]
