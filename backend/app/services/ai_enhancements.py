import json
import os
from typing import Optional

import google.generativeai as genai
from app.config import GEMINI_API_KEY, GEMINI_MODEL

_genai_configured = False


def _ensure_gemini():
    global _genai_configured
    if not _genai_configured and GEMINI_API_KEY:
        genai.configure(api_key=GEMINI_API_KEY)
        _genai_configured = True


async def _call_llm(prompt: str, system: str, max_tokens: int = 800) -> Optional[str]:
    try:
        return await _call_gemini(prompt, system, max_tokens)
    except Exception as e:
        print(f"AI enhancement failed: {e}")
        return None


async def _call_gemini(prompt: str, system: str, max_tokens: int) -> Optional[str]:
    if not GEMINI_API_KEY:
        raise Exception("GEMINI_API_KEY not configured")
    _ensure_gemini()
    model = genai.GenerativeModel(GEMINI_MODEL, system_instruction=system)
    response = await model.generate_content_async(
        prompt,
        generation_config={"max_output_tokens": max_tokens},
    )
    return response.text


async def maintenance_summary(
    asset_name: str,
    technician_notes: str,
    parts_replaced: list[str],
    cost: float,
) -> Optional[str]:
    prompt = f"""Convert the following rough field technician notes into a professional, concise maintenance service report.

Asset: {asset_name}
Technician notes: {technician_notes or 'N/A'}
Parts replaced: {', '.join(parts_replaced) if parts_replaced else 'None'}
Cost: ${cost}

Return a clean professional summary (3-5 sentences) suitable for an asset history log. No markdown."""
    system = "You are a professional maintenance report writer. Produce factual, non-promotional summaries."
    return await _call_llm(prompt, system, 500)


async def asset_health_analysis(
    asset_name: str,
    category: str,
    history_summary: str,
) -> Optional[dict]:
    prompt = f"""Analyze the maintenance history of an asset and detect recurring failure patterns.

Asset: {asset_name} ({category})
Recent history:
{history_summary or 'No history available'}

Respond with ONLY valid JSON (no markdown):
{{
  "health_score": <integer 0-100 representing overall condition>,
  "recurring_issues": ["pattern1", "pattern2"],
  "risk_level": "low|medium|high",
  "analysis": "short professional assessment"
}}"""
    system = "You are a reliability engineer. Respond only with valid JSON."
    text = await _call_llm(prompt, system, 600)
    if not text:
        return None
    try:
        return json.loads(text)
    except Exception:
        return {"health_score": 70, "recurring_issues": [], "risk_level": "medium", "analysis": text}


async def preventive_recommendation(
    asset_name: str,
    category: str,
    condition: str,
    last_service_date: Optional[str],
    next_service_date: Optional[str],
    history_summary: str,
) -> Optional[dict]:
    prompt = f"""Suggest a preventive maintenance recommendation for an asset.

Asset: {asset_name} ({category})
Condition: {condition}
Last service: {last_service_date or 'Unknown'}
Next scheduled service: {next_service_date or 'Not scheduled'}
History:
{history_summary or 'No history'}

Respond with ONLY valid JSON (no markdown):
{{
  "recommended_action": "what to do",
  "suggested_next_service": "ISO date or 'ASAP' or 'within 30 days'",
  "priority": "low|medium|high",
  "rationale": "short explanation"
}}"""
    system = "You are a preventive maintenance planner. Respond only with valid JSON."
    text = await _call_llm(prompt, system, 500)
    if not text:
        return None
    try:
        return json.loads(text)
    except Exception:
        return {"recommended_action": text, "suggested_next_service": "within 30 days", "priority": "medium", "rationale": ""}


async def translate_to_english(text: str) -> Optional[str]:
    prompt = f"""Translate the following complaint into clear, professional English. If it is already in English, improve grammar and structure. Preserve technical meaning.

Original:
\"\"\"
{text}
\"\"\"

Return only the translated/cleaned English text, no explanations."""
    system = "You are a multilingual maintenance assistant. Translate Roman Urdu, Urdu, or other languages into clean English. Do not add commentary."
    return await _call_llm(prompt, system, 400)
