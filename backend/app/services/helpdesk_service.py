from sqlalchemy.orm import Session
from sqlalchemy import desc
from typing import List
from app.models import HelpdeskTicket, User, SocietyAdmin
from app.utils.exceptions import NotFoundError, ForbiddenError, ValidationError

class HelpdeskService:
    def __init__(self, db: Session):
        self.db = db

    def create(self, user_id: int, society_id: int, data: dict) -> HelpdeskTicket:
        if not data.get("title") or not data.get("description"):
            raise ValidationError("Title and description are required")

        ticket = HelpdeskTicket(
            society_id=society_id,
            created_by=user_id,
            title=data["title"],
            description=data["description"],
            category=data.get("category", "other"),
            priority=data.get("priority", "medium"),
            status="open"
        )
        self.db.add(ticket)
        self.db.commit()
        self.db.refresh(ticket)
        return ticket

    def get_by_user(self, user_id: int, page: int = 1, per_page: int = 20) -> dict:
        q = self.db.query(HelpdeskTicket).filter_by(created_by=user_id).order_by(desc(HelpdeskTicket.created_at))
        total = q.count()
        items = q.offset((page - 1) * per_page).limit(per_page).all()
        return {
            "items": items,
            "meta": {
                "total": total,
                "page": page,
                "per_page": per_page,
                "pages": (total + per_page - 1) // per_page
            }
        }

    def get_by_society(self, society_id: int, status: str = None, page: int = 1, per_page: int = 20) -> dict:
        q = self.db.query(HelpdeskTicket).filter_by(society_id=society_id)
        if status:
            q = q.filter_by(status=status)
        
        q = q.order_by(desc(HelpdeskTicket.created_at))
        total = q.count()
        items = q.offset((page - 1) * per_page).limit(per_page).all()
        
        return {
            "items": items,
            "meta": {
                "total": total,
                "page": page,
                "per_page": per_page,
                "pages": (total + per_page - 1) // per_page
            }
        }

    def update(self, user: User, ticket_id: int, data: dict) -> HelpdeskTicket:
        ticket = self.db.query(HelpdeskTicket).filter_by(id=ticket_id).first()
        if not ticket:
            raise NotFoundError("Helpdesk Ticket")

        # Permissions: Creator can update if open, Admins can update anytime
        is_admin = user.is_super_admin or self.db.query(SocietyAdmin).filter_by(user_id=user.id, society_id=ticket.society_id).first() is not None
        
        if ticket.created_by != user.id and not is_admin:
            raise ForbiddenError("Not authorized to update this ticket")

        if data.get("status") and is_admin:
            ticket.status = data["status"]
            
        if data.get("comments") and is_admin:
            import json
            from datetime import datetime
            try:
                existing_comments = json.loads(ticket.comments) if ticket.comments else []
                if not isinstance(existing_comments, list):
                    existing_comments = [{"timestamp": ticket.created_at.isoformat(), "text": ticket.comments, "author": "admin"}] if ticket.comments else []
            except Exception:
                existing_comments = [{"timestamp": ticket.created_at.isoformat(), "text": ticket.comments, "author": "admin"}] if ticket.comments else []
            
            existing_comments.append({
                "timestamp": datetime.utcnow().isoformat(),
                "text": data["comments"],
                "author": user.name
            })
            ticket.comments = json.dumps(existing_comments)

        if data.get("priority") and is_admin:
            ticket.priority = data["priority"]

        if not is_admin and ticket.status != "open":
            raise ForbiddenError("Cannot edit a ticket that is already being processed")

        # Creator can only update title and description if it's open
        if data.get("title") and ticket.created_by == user.id:
            ticket.title = data["title"]
        if data.get("description") and ticket.created_by == user.id:
            ticket.description = data["description"]

        self.db.commit()
        self.db.refresh(ticket)
        return ticket
