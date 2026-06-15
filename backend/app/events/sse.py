"""
SSE Event Bus — in-memory pub/sub for real-time notifications.

Each authenticated user gets their own asyncio.Queue.
When a notification is created, the event is pushed to the
target user's queue. The SSE endpoint streams from it.
"""

import asyncio
import json
import logging
from datetime import datetime
from typing import Dict, Optional

logger = logging.getLogger(__name__)


class EventBus:
    """
    Singleton in-memory event bus.
    Thread-safe via asyncio — one queue per connected user.
    """

    def __init__(self):
        self._subscribers: Dict[int, list[asyncio.Queue]] = {}

    def subscribe(self, user_id: int) -> asyncio.Queue:
        """Register a new SSE connection for a user. Returns a queue to read from."""
        queue: asyncio.Queue = asyncio.Queue()
        if user_id not in self._subscribers:
            self._subscribers[user_id] = []
        self._subscribers[user_id].append(queue)
        logger.info(f"[SSE] User {user_id} connected (total connections: {len(self._subscribers[user_id])})")
        return queue

    def unsubscribe(self, user_id: int, queue: asyncio.Queue):
        """Remove a queue when the SSE connection drops."""
        if user_id in self._subscribers:
            try:
                self._subscribers[user_id].remove(queue)
            except ValueError:
                pass
            if not self._subscribers[user_id]:
                del self._subscribers[user_id]
        logger.info(f"[SSE] User {user_id} disconnected")

    async def publish(self, user_id: int, event_type: str, data: dict):
        """
        Push an event to all active connections for a given user.
        Non-blocking — if a queue is full, the event is dropped for that connection.
        """
        if user_id not in self._subscribers:
            return  # No active connections for this user

        payload = {
            "event": event_type,
            "data": data,
            "timestamp": datetime.utcnow().isoformat(),
        }

        dead_queues = []
        for queue in self._subscribers[user_id]:
            try:
                queue.put_nowait(payload)
            except asyncio.QueueFull:
                dead_queues.append(queue)
                logger.warning(f"[SSE] Queue full for user {user_id}, dropping event")

        # Clean up any dead queues
        for q in dead_queues:
            self.unsubscribe(user_id, q)

        logger.info(f"[SSE] Published '{event_type}' to user {user_id} ({len(self._subscribers.get(user_id, []))} connections)")

    async def publish_to_many(self, user_ids: list[int], event_type: str, data: dict):
        """Broadcast an event to multiple users."""
        for uid in user_ids:
            await self.publish(uid, event_type, data)

    def format_sse(self, payload: dict) -> str:
        """Format a payload as an SSE message string."""
        event_type = payload.get("event", "message")
        data_str = json.dumps(payload.get("data", {}))
        return f"event: {event_type}\ndata: {data_str}\n\n"


# ── Global singleton ──────────────────────────────────────────────────────
event_bus = EventBus()
