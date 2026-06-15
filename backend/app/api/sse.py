"""
SSE Streaming Endpoint — /api/v1/events/stream

Authenticated users connect here to receive real-time push events.
Uses Server-Sent Events (SSE) — a simple, efficient HTTP-based push protocol.

NOTE: EventSource API doesn't support custom headers, so we accept
the JWT token as a query parameter (?token=...) in addition to the
standard Authorization header.
"""

import asyncio
import json
import logging
import jwt
from fastapi import APIRouter, Depends, Request, Query, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User
from app.utils.security import JWT_SECRET_KEY, ALGORITHM
from app.events.sse import event_bus

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/events", tags=["SSE Events"])


def _get_user_from_token(token: str, db: Session) -> User:
    """Decode JWT and return the User, or raise 401."""
    try:
        payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid token")
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

    user = db.query(User).get(int(user_id))
    if user is None:
        raise HTTPException(status_code=401, detail="User not found")
    return user


@router.get("/stream")
async def event_stream(
    request: Request,
    token: str = Query(..., description="JWT access token"),
    db: Session = Depends(get_db),
):
    """
    SSE endpoint — keeps connection open and streams events to the client.
    
    The client connects with:
        new EventSource('/api/v1/events/stream?token=<jwt>')
    
    Events are pushed whenever a notification is created for this user.
    A heartbeat ping is sent every 30s to keep the connection alive.
    """
    user = _get_user_from_token(token, db)
    user_id = user.id

    async def generate():
        queue = event_bus.subscribe(user_id)
        try:
            # Send initial connection confirmation
            welcome_data = json.dumps({"message": "SSE connected", "user_id": user_id})
            yield f"event: connected\ndata: {welcome_data}\n\n"

            while True:
                try:
                    # Wait for an event with a 30s timeout (heartbeat interval)
                    payload = await asyncio.wait_for(queue.get(), timeout=30.0)
                    yield event_bus.format_sse(payload)
                except asyncio.TimeoutError:
                    # Send heartbeat to keep connection alive
                    yield f": heartbeat\n\n"
                except asyncio.CancelledError:
                    break

                # Check if client disconnected
                if await request.is_disconnected():
                    break

        finally:
            event_bus.unsubscribe(user_id, queue)
            logger.info(f"[SSE] Stream closed for user {user_id}")

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",  # Disable nginx buffering
        },
    )
