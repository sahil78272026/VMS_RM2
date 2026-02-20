from app.models import Visit, Visitor
from app.extensions import db


class VisitRepository:
    def create(self, visitor:Visitor, flat_id, purpose):
        visit = Visit(visitor=visitor, flat_id=flat_id, purpose=purpose, status='PENDING')
        db.session.add(visit)
        return visit