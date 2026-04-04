"""
Compatibility shim for the `ollama` Python package.
This provides a tiny subset of the Ollama client API by proxying calls to a local
Ollama REST API (default: http://localhost:11434).

This file is included to avoid ModuleNotFoundError on deployments where the
`ollama` package isn't installed. It aims to be a minimal, non-breaking shim.
"""
import os
import requests
from typing import List, Dict, Any, Optional

BASE_URL = os.getenv("OLLAMA_URL", "http://localhost:11434")


def _post(path: str, json: dict, timeout: int = 60) -> dict:
    url = f"{BASE_URL}{path}"
    resp = requests.post(url, json=json, timeout=timeout)
    resp.raise_for_status()
    return resp.json()


def chat(model: str, messages: List[Dict[str, str]], stream: bool = False, options: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    payload = {
        "model": model,
        "messages": messages,
        "stream": stream
    }
    if options:
        payload["options"] = options
    return _post("/api/chat", payload)


def generate(model: str, prompt: str, options: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    payload = {
        "model": model,
        "prompt": prompt
    }
    if options:
        payload["options"] = options
    return _post("/api/generate", payload)


def list() -> List[Dict[str, Any]]:
    url = f"{BASE_URL}/api/models"
    resp = requests.get(url, timeout=10)
    resp.raise_for_status()
    return resp.json()


def show(model: str) -> Dict[str, Any]:
    url = f"{BASE_URL}/api/models/{model}"
    resp = requests.get(url, timeout=10)
    resp.raise_for_status()
    return resp.json()


def pull(model: str) -> Dict[str, Any]:
    return _post("/api/models/pull", {"model": model})


def embeddings(model: str, prompt: str) -> Dict[str, Any]:
    return _post("/api/embeddings", {"model": model, "input": prompt})
