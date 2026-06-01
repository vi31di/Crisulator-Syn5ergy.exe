import re

class CommandParser:
    """Handles normalizing commands, aliases, and regex extraction. No fuzzy matching."""
    
    ALIASES = {
        "k": "kubectl",
        "po": "pods",
        "svc": "services",
        "deploy": "deployment",
        "log": "logs",
        "ls": "list",
        "describe": "describe",
    }

    @staticmethod
    def parse(raw_command: str) -> str:
        cmd = raw_command.strip().lower()
        
        # Split by spaces and resolve aliases
        tokens = cmd.split()
        resolved_tokens = []
        for token in tokens:
            resolved_tokens.append(CommandParser.ALIASES.get(token, token))
            
        # Rejoin and clean up extra spaces
        normalized = " ".join(resolved_tokens)
        
        # Remove flags for core parsing (e.g., -A, -n namespace, -f file) if needed
        # We will keep it simple for now and just strip basic flags to match against scenarios
        normalized = re.sub(r' -[a-zA-Z]+', '', normalized)
        
        return normalized.strip()
