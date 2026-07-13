from typing import Optional
from fastapi import Request, HTTPException
from jose import jwt, JWTError
import httpx


CLERK_JWKS_CACHE = None


def get_clerk_jwks():
    global CLERK_JWKS_CACHE
    if CLERK_JWKS_CACHE is not None:
        return CLERK_JWKS_CACHE
    import os
    issuer = os.getenv("CLERK_ISSUER", "")
    jwks_url = os.getenv("CLERK_JWKS_URL", "")
    if not issuer and not jwks_url:
        CLERK_JWKS_CACHE = {"keys": []}
        return CLERK_JWKS_CACHE
    if not issuer and jwks_url:
        try:
            resp = httpx.get(jwks_url, timeout=10)
            CLERK_JWKS_CACHE = resp.json()
        except Exception:
            CLERK_JWKS_CACHE = {"keys": []}
        return CLERK_JWKS_CACHE
    jwks_url = f"{issuer}/.well-known/jwks.json"
    try:
        resp = httpx.get(jwks_url, timeout=10)
        CLERK_JWKS_CACHE = resp.json()
    except Exception:
        CLERK_JWKS_CACHE = {"keys": []}
    return CLERK_JWKS_CACHE


def decode_token(token: str) -> dict:
    jwks = get_clerk_jwks()
    try:
        unverified_header = jwt.get_unverified_header(token)
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token header")

    kid = unverified_header.get("kid")
    key = None
    for k in jwks.get("keys", []):
        if k.get("kid") == kid:
            key = k
            break
    if key is None:
        raise HTTPException(status_code=401, detail="Unknown signing key")

    import os
    issuer = os.getenv("CLERK_ISSUER", "")
    try:
        payload = jwt.decode(
            token,
            key,
            algorithms=["RS256"],
            issuer=issuer if issuer else None,
            options={"verify_aud": False},
        )
        return payload
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")


def extract_user_from_request(request: Request) -> Optional[dict]:
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        return None
    token = auth_header.split(" ", 1)[1]
    try:
        payload = decode_token(token)
        user_id = payload.get("sub", "")
        public_metadata = payload.get("public_metadata", {})
        role = public_metadata.get("role", "admin")
        return {"user_id": user_id, "role": role}
    except Exception:
        return None


def require_auth(request: Request) -> dict:
    user = extract_user_from_request(request)
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")
    return user


def require_admin(request: Request) -> dict:
    user = require_auth(request)
    if user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return user


def require_technician_or_admin(request: Request) -> dict:
    user = require_auth(request)
    if user["role"] not in ("admin", "technician"):
        raise HTTPException(status_code=403, detail="Technician or admin access required")
    return user
