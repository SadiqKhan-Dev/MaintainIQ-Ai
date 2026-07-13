import os
import random
import string
from datetime import datetime
from typing import Optional

import google.generativeai as genai
from google.generativeai import protos
from google.protobuf.struct_pb2 import Struct
from sqlalchemy.exc import IntegrityError

from app.config import GEMINI_API_KEY, GEMINI_MODEL
from app.database import SessionLocal
from app.models.asset import Asset
from app.models.asset_history import AssetHistory
from app.schemas.asset import AssetCreate, AssetResponse

_configured = False
_sessions: dict[str, object] = {}

SYSTEM_INSTRUCTION = """You are MaintainIQ's AI asset-creation assistant. Your ONLY purpose is to help the user register a new maintenance asset. You must NOT answer unrelated questions, perform any other task, or chat about anything else.

Strict rules:
- Ask ONLY questions needed to collect asset details. Do not ask anything beyond the fields below.
- Required fields (ask one at a time, keep it short and natural):
  - asset_code: a unique code like PUMP-001. If the user has none, propose one based on the category.
  - name: what the asset is called.
  - category: e.g. Pump, Motor, HVAC, Conveyor.
  - location: where it physically is.
  - condition: must be one of "good", "fair", or "poor".
- Optional fields (ask ONLY if the user has not already provided them and it is clearly useful):
  - last_service_date (ISO date YYYY-MM-DD)
  - next_service_date (ISO date YYYY-MM-DD)
- If the user asks something off-topic, politely say you can only help register assets and steer back to collecting asset details.
- Once ALL required fields are known, briefly summarize them and ask the user to confirm (e.g. "Shall I create this asset?").
- ONLY call the create_asset function after the user has explicitly confirmed (yes / confirm / create it).
- Never create an asset before confirmation. Keep every reply under 3 sentences.
"""

CREATE_ASSET_TOOL = {
    "function_declarations": [
        {
            "name": "create_asset",
            "description": "Save a new maintenance asset to the database. Only call this AFTER all required details are collected AND the user has explicitly confirmed.",
            "parameters": {
                "type": "object",
                "properties": {
                    "asset_code": {
                        "type": "string",
                        "description": "Unique asset code, e.g. PUMP-001. Propose one if not provided.",
                    },
                    "name": {"type": "string", "description": "Asset name."},
                    "category": {"type": "string", "description": "Asset category."},
                    "location": {"type": "string", "description": "Physical location."},
                    "condition": {
                        "type": "string",
                        "enum": ["good", "fair", "poor"],
                    },
                    "last_service_date": {
                        "type": "string",
                        "description": "ISO date YYYY-MM-DD, or empty string if unknown.",
                    },
                    "next_service_date": {
                        "type": "string",
                        "description": "ISO date YYYY-MM-DD, or empty string if unknown.",
                    },
                },
                "required": ["asset_code", "name", "category", "location", "condition"],
            },
        }
    ]
}


def _ensure_configured():
    global _configured
    if not _configured and GEMINI_API_KEY:
        genai.configure(api_key=GEMINI_API_KEY)
        _configured = True


def _build_model():
    return genai.GenerativeModel(
        model_name=GEMINI_MODEL,
        system_instruction=SYSTEM_INSTRUCTION,
        tools=CREATE_ASSET_TOOL,
    )


def _get_text(response) -> str:
    try:
        return "".join(
            p.text for p in response.candidates[0].content.parts if getattr(p, "text", "")
        )
    except Exception:
        return ""


def _get_function_call(response):
    try:
        for part in response.candidates[0].content.parts:
            if getattr(part, "function_call", None):
                return part.function_call
    except Exception:
        return None
    return None


def _execute_create_asset(args: dict, user: dict) -> dict:
    db = SessionLocal()
    try:
        raw_code = (args.get("asset_code") or "").strip()
        if not raw_code:
            category = (args.get("category") or "AST").upper()[:3]
            raw_code = f"{category}-{''.join(random.choices(string.digits, k=4))}"
        condition = (args.get("condition") or "good").lower()
        if condition not in ("good", "fair", "poor"):
            condition = "good"

        def parse_date(value):
            value = (value or "").strip()
            if not value:
                return None
            try:
                return datetime.strptime(value, "%Y-%m-%d").date()
            except Exception:
                return None

        payload = AssetCreate(
            asset_code=raw_code,
            name=(args.get("name") or "").strip() or "Unnamed Asset",
            category=(args.get("category") or "").strip() or "Uncategorized",
            location=(args.get("location") or "").strip() or "Unknown",
            condition=condition,
            last_service_date=parse_date(args.get("last_service_date")),
            next_service_date=parse_date(args.get("next_service_date")),
        )
        existing = db.query(Asset).filter(Asset.asset_code == payload.asset_code).first()
        if existing:
            return {
                "success": False,
                "error": f"Asset code '{payload.asset_code}' already exists. Ask the user for a different code.",
            }
        asset = Asset(**payload.model_dump())
        db.add(asset)
        db.flush()
        db.add(
            AssetHistory(
                asset_id=asset.id,
                issue_id=None,
                actor_id=user.get("user_id"),
                actor_role=user.get("role"),
                action="asset_created",
                description=f"Asset '{asset.name}' created via AI assistant with code {asset.asset_code}",
            )
        )
        db.commit()
        db.refresh(asset)
        return {"success": True, "asset": AssetResponse.model_validate(asset).model_dump(mode="json")}
    except IntegrityError as e:
        db.rollback()
        return {"success": False, "error": f"Could not save asset (duplicate or invalid data): {e}"}
    except Exception as e:
        db.rollback()
        return {"success": False, "error": f"Could not save asset: {e}"}
    finally:
        db.close()


def run_asset_assistant(
    session_id: Optional[str],
    message: str,
    user: dict,
) -> dict:
    if not GEMINI_API_KEY:
        return {
            "reply": "AI assistant is not configured. Add GEMINI_API_KEY to the backend .env to enable it.",
            "asset": None,
            "done": False,
            "session_id": session_id,
        }

    _ensure_configured()

    if not session_id or session_id not in _sessions:
        session_id = session_id or os.urandom(8).hex()
        _sessions[session_id] = _build_model().start_chat(history=[])
    chat = _sessions[session_id]

    try:
        response = chat.send_message(message)
        function_call = _get_function_call(response)
        if function_call and function_call.name == "create_asset":
            result = _execute_create_asset(dict(function_call.args or {}), user)
            fr_struct = Struct()
            fr_struct.update(result)
            fr_part = protos.Part(
                function_response=protos.FunctionResponse(
                    name="create_asset", response=fr_struct
                )
            )
            follow_up = chat.send_message(fr_part)
            reply = _get_text(follow_up)
            asset = result.get("asset") if result.get("success") else None
            return {
                "reply": reply or "Asset created.",
                "asset": asset,
                "done": result.get("success", False),
                "session_id": session_id,
            }
        return {
            "reply": _get_text(response),
            "asset": None,
            "done": False,
            "session_id": session_id,
        }
    except Exception as e:
        return {
            "reply": f"Sorry, I hit an error talking to the AI service: {e}",
            "asset": None,
            "done": False,
            "session_id": session_id,
        }
