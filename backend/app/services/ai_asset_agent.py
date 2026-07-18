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

SYSTEM_INSTRUCTION = """You are MaintainIQ's AI asset assistant. You help the user CREATE new maintenance assets and EDIT existing ones. You must NOT answer unrelated questions, perform any other task, or chat about anything else.

The user will start either by creating a new asset or by asking to edit an existing asset (they will give you the asset code, e.g. PUMP-001, or the asset name).

=== CREATING A NEW ASSET ===
Required fields (ask one at a time, keep it short and natural):
  - asset_code: a unique code like PUMP-001. If the user has none, propose one based on the category.
  - name: what the asset is called.
  - category: e.g. Pump, Motor, HVAC, Conveyor.
  - location: where it physically is.
  - condition: must be one of "good", "fair", or "poor".
Optional fields (ask ONLY if useful):
  - last_service_date (ISO date YYYY-MM-DD)
  - next_service_date (ISO date YYYY-MM-DD)
When all required fields are known, summarize and ask the user to confirm before calling create_asset.

=== EDITING AN EXISTING ASSET ===
When the user wants to edit an asset:
  - Identify the target asset by the asset_code they provide.
  - Ask the user which fields they want to change, one at a time.
  - Only include in the edit_asset call the fields the user actually wants to change. Do NOT pass unchanged fields.
  - condition (if changed) must be one of "good", "fair", or "poor".
  - Dates must be ISO YYYY-MM-DD or empty string if being cleared.
  - When you have the changes, briefly summarize what will change and ask the user to confirm (e.g. "Update PUMP-001 to location Basement? Confirm and I'll apply it.").
  - ONLY call the edit_asset function after the user has explicitly confirmed.

General rules:
- If the user asks something off-topic, politely say you can only help with assets and steer back.
- Only call a tool after explicit confirmation. Never act before confirmation.
- Keep every reply under 3 sentences.
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
        },
        {
            "name": "edit_asset",
            "description": "Update an EXISTING maintenance asset identified by asset_code. Only include the fields the user wants to change. Only call AFTER the user has explicitly confirmed the changes.",
            "parameters": {
                "type": "object",
                "properties": {
                    "asset_code": {
                        "type": "string",
                        "description": "The unique code of the asset to edit, e.g. PUMP-001.",
                    },
                    "name": {"type": "string", "description": "New asset name (only if changing)."},
                    "category": {"type": "string", "description": "New category (only if changing)."},
                    "location": {"type": "string", "description": "New location (only if changing)."},
                    "condition": {
                        "type": "string",
                        "enum": ["good", "fair", "poor"],
                        "description": "New condition (only if changing).",
                    },
                    "status": {
                        "type": "string",
                        "description": "New status: active, inactive, under_repair, retired.",
                    },
                    "last_service_date": {
                        "type": "string",
                        "description": "ISO date YYYY-MM-DD, or empty string to clear.",
                    },
                    "next_service_date": {
                        "type": "string",
                        "description": "ISO date YYYY-MM-DD, or empty string to clear.",
                    },
                },
                "required": ["asset_code"],
            },
        },
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


def _parse_date(value):
    value = (value or "").strip()
    if not value:
        return None
    try:
        return datetime.strptime(value, "%Y-%m-%d").date()
    except Exception:
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

        payload = AssetCreate(
            asset_code=raw_code,
            name=(args.get("name") or "").strip() or "Unnamed Asset",
            category=(args.get("category") or "").strip() or "Uncategorized",
            location=(args.get("location") or "").strip() or "Unknown",
            condition=condition,
            last_service_date=_parse_date(args.get("last_service_date")),
            next_service_date=_parse_date(args.get("next_service_date")),
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


def _execute_edit_asset(args: dict, user: dict) -> dict:
    db = SessionLocal()
    try:
        raw_code = (args.get("asset_code") or "").strip()
        asset = db.query(Asset).filter(Asset.asset_code == raw_code).first()
        if not asset:
            return {
                "success": False,
                "error": f"No asset found with code '{raw_code}'. Ask the user to check the code.",
            }

        allowed = {
            "name", "category", "location", "condition", "status",
            "last_service_date", "next_service_date",
        }
        changes: dict = {}
        for key in allowed:
            if key in args and args[key] is not None:
                value = args[key]
                if key == "condition":
                    value = (value or "good").lower()
                    if value not in ("good", "fair", "poor"):
                        value = "good"
                if key in ("last_service_date", "next_service_date"):
                    value = _parse_date(value)
                changes[key] = value

        if not changes:
            return {"success": False, "error": "No fields were provided to change."}

        description = "; ".join(
            f"{k} -> {changes[k] if changes[k] is not None else 'cleared'}" for k in changes
        )
        for k, v in changes.items():
            setattr(asset, k, v)
        db.add(
            AssetHistory(
                asset_id=asset.id,
                issue_id=None,
                actor_id=user.get("user_id"),
                actor_role=user.get("role"),
                action="asset_updated",
                description=f"Asset '{asset.name}' updated via AI assistant: {description}",
            )
        )
        db.commit()
        db.refresh(asset)
        return {
            "success": True,
            "asset": AssetResponse.model_validate(asset).model_dump(mode="json"),
            "changes": description,
        }
    except Exception as e:
        db.rollback()
        return {"success": False, "error": f"Could not update asset: {e}"}
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
        if function_call and function_call.name == "edit_asset":
            result = _execute_edit_asset(dict(function_call.args or {}), user)
            fr_struct = Struct()
            fr_struct.update(result)
            fr_part = protos.Part(
                function_response=protos.FunctionResponse(
                    name="edit_asset", response=fr_struct
                )
            )
            follow_up = chat.send_message(fr_part)
            reply = _get_text(follow_up)
            asset = result.get("asset") if result.get("success") else None
            return {
                "reply": reply or "Asset updated.",
                "asset": asset,
                "updated": result.get("changes") if result.get("success") else None,
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
