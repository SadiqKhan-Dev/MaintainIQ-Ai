import asyncio
from fastapi import APIRouter, WebSocket, WebSocketDisconnect

router = APIRouter(tags=["realtime"])

_connections: set[WebSocket] = set()
_lock = asyncio.Lock()


async def broadcast(event: dict) -> None:
    async with _lock:
        dead = []
        for ws in _connections:
            try:
                await ws.send_json(event)
            except Exception:
                dead.append(ws)
        for ws in dead:
            _connections.discard(ws)


@router.websocket("/ws")
async def ws_endpoint(websocket: WebSocket):
    await websocket.accept()
    async with _lock:
        _connections.add(websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        pass
    finally:
        async with _lock:
            _connections.discard(websocket)
