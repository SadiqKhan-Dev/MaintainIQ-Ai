import json
import re
from typing import Optional

import google.generativeai as genai
from app.config import GEMINI_API_KEY, GEMINI_MODEL

_genai_configured = False


def _ensure_gemini():
    global _genai_configured
    if not _genai_configured and GEMINI_API_KEY:
        genai.configure(api_key=GEMINI_API_KEY)
        _genai_configured = True


TRIAGE_PROMPT_TEMPLATE = """You are an expert maintenance triage AI for facility and equipment management.
Given the following information about an asset and a reported issue, provide a structured triage assessment.

Asset Information:
- Type/Category: {asset_category}
- Name: {asset_name}
- Condition: {asset_condition}
- Location: {asset_location}
- Recent History: {recent_history}

Reported Issue:
"{description}"

Respond with ONLY a valid JSON object (no markdown, no extra text) with this exact structure:
{{
  "title": "Brief issue title",
  "category": "Issue category (e.g., Mechanical, Electrical, Plumbing, Structural, Cosmetic, Safety, Other)",
  "priority": "low or medium or high or critical",
  "possible_causes": ["cause1", "cause2"],
  "initial_checks": ["check1", "check2"],
  "recurring_pattern_warning": "null or a warning string if the history suggests a recurring problem"
}}

SAFETY RULES:
- If the issue involves electrical hazards, gas leaks, structural collapse risk, fire, or medical emergencies, ALWAYS set priority to "critical".
- For critical/safety issues, do NOT suggest DIY fixes. Always recommend a qualified professional.
- Never suggest actions that could cause injury or property damage."""


async def call_ai_triage(
    asset_category: str,
    asset_name: str,
    asset_condition: str,
    asset_location: str,
    recent_history: str,
    description: str,
) -> Optional[dict]:
    prompt = TRIAGE_PROMPT_TEMPLATE.format(
        asset_category=asset_category,
        asset_name=asset_name,
        asset_condition=asset_condition,
        asset_location=asset_location,
        recent_history=recent_history or "No recent history available",
        description=description,
    )

    try:
        return await _call_gemini(prompt)
    except Exception as e:
        print(f"AI triage failed: {e}")
        return None


async def _call_gemini(prompt: str) -> Optional[dict]:
    if not GEMINI_API_KEY:
        raise Exception("GEMINI_API_KEY not configured")
    _ensure_gemini()
    model = genai.GenerativeModel(
        GEMINI_MODEL,
        system_instruction="You are a maintenance triage assistant. Respond only with valid JSON.",
    )
    response = await model.generate_content_async(
        prompt,
        generation_config={"max_output_tokens": 1024},
    )
    text = response.text or ""
    cleaned = re.sub(r"^```(?:json)?\s*|\s*```$", "", text.strip(), flags=re.DOTALL)
    match = re.search(r"\{.*\}", cleaned, re.DOTALL)
    if not match:
        raise Exception("No JSON found in Gemini response")
    return json.loads(match.group(0))
