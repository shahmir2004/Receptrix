"""
Configuration loader for business details and environment.
"""
import os
import json
from pathlib import Path
from typing import Optional
from dotenv import load_dotenv
from models import BusinessConfig


# Load environment variables
load_dotenv()

_CONFIG: Optional[BusinessConfig] = None


def load_config(config_path: str = "business_config.json") -> BusinessConfig:
    """
    Load business configuration from JSON file.
    
    Args:
        config_path: Path to the configuration JSON file
        
    Returns:
        BusinessConfig object with loaded data
    """
    global _CONFIG
    
    if _CONFIG is not None:
        return _CONFIG
    
    config_file = Path(config_path)
    if not config_file.exists():
        raise FileNotFoundError(f"Configuration file not found: {config_path}")
    
    with open(config_file, "r", encoding="utf-8") as f:
        data = json.load(f)
    
    # Add timezone if not present
    if "timezone" not in data:
        data["timezone"] = os.getenv("TIMEZONE", "Asia/Karachi")
    
    _CONFIG = BusinessConfig(**data)
    return _CONFIG


def get_config() -> BusinessConfig:
    """Get the loaded configuration."""
    if _CONFIG is None:
        return load_config()
    return _CONFIG


def reload_config(config_path: str = "business_config.json") -> BusinessConfig:
    """Reload configuration from file."""
    global _CONFIG
    _CONFIG = None
    return load_config(config_path)


# Environment variable helpers
def get_env(key: str, default: str = "") -> str:
    """Get environment variable with default."""
    return os.getenv(key, default)


def get_twilio_config() -> dict:
    """Get Twilio configuration from environment."""
    return {
        "account_sid": os.getenv("TWILIO_ACCOUNT_SID", ""),
        "auth_token": os.getenv("TWILIO_AUTH_TOKEN", ""),
        "phone_number": os.getenv("TWILIO_PHONE_NUMBER", ""),
        "my_phone": os.getenv("MY_PHONE_NUMBER", "+923095218142")
    }


def get_openai_config() -> dict:
    """Get OpenAI configuration from environment."""
    return {
        "api_key": os.getenv("OPENAI_API_KEY", ""),
        "model": os.getenv("OPENAI_MODEL", "gpt-4o-mini")
    }


def get_server_config() -> dict:
    """Get server configuration from environment."""
    return {
        "url": os.getenv("SERVER_URL", "http://localhost:8000"),
        "port": int(os.getenv("PORT", "8000")),
        "debug": os.getenv("DEBUG", "false").lower() == "true"
    }


