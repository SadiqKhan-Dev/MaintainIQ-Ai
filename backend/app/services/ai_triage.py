import json
from typing import Optional
import httpx
from app.config import AI_API_KEY, AI_PROVIDER


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
        if AI_PROVIDER == "openai":
            return await _call_openai(prompt)
        else:
            return await _call_anthropic(prompt)
    except Exception as e:
        print(f"AI triage failed: {e}")
        return None


async def _call_anthropic(prompt: str) -> Optional[dict]:
    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.post(
            "https://api.anthropic.com/v1/messages",
            headers={
                "x-api-key": AI_API_KEY,
                "anthropic-version": "2023-06-01",
                "content-type": "application/json",
            },
            json={
                "model": "claude-sonnet-4-20250514",
                "max_tokens": 1024,
                "messages": [{"role": "user", "content": prompt}],
            },
        )
        if response.status_code != 200:
            raise Exception(f"Anthropic API error: {response.status_code}")
        data = response.json()
        text = data["content"][0]["text"]
        return json.loads(text)


async def _call_openai(prompt: str) -> Optional[dict]:
    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.post(
            "https://api.openai.com/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {AI_API_KEY}",
                "Content-Type": "application/json",
            },
            json={
                "model": "gpt-4o",
                "messages": [
                    {
                        "role": "system",
                        "content": "You are a maintenance triage assistant. Respond only with valid JSON.",
                    },
                    {"role": "user", "content": prompt},
                ],
                "response_format": {"type": "json_object"},
                "max_tokens": 1024,
            },
        )
        if response.status_code != 200:
            raise Exception(f"OpenAI API error: {response.status_code}")
        data = response.json()
        text = data["choices"][0]["message"]["content"]
        return json.loads(text)
