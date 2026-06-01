class CommandClassifier:
    """Classifies commands into distinct operational categories."""
    
    CATEGORIES = {
        "diagnostic": ["kubectl get", "kubectl describe", "kubectl logs", "tail", "cat", "top", "htop", "ping", "curl", "dig", "grep", "ls"],
        "mitigation": ["kubectl scale", "kubectl drain", "kubectl cordon", "systemctl restart", "service restart", "block", "throttle"],
        "recovery": ["kubectl rollout undo", "rollback", "restore", "promote"],
        "destructive": ["rm -rf", "drop table", "truncate", "kill -9", "flush", "format"],
        "administrative": ["ack", "help", "clear", "sudo"],
        "communication": ["status page", "email", "slack", "pagerduty"]
    }

    @staticmethod
    def classify(normalized_command: str) -> str:
        for category, triggers in CommandClassifier.CATEGORIES.items():
            for trigger in triggers:
                if normalized_command.startswith(trigger):
                    return category
        
        return "unknown"
