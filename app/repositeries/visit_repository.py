from app.models.models import Visit, Visitor
from app.extensions import db


class VisitRepository:
    def create(self, visitor:Visitor, flat_id, purpose):
        visit = Visit(visitor=visitor, flat_id=flat_id, purpose=purpose, status='PENDING')
        db.session.add(visit)
        return visit
    
    def get_by_visitors(self, visitor_id):
        return (Visit.query.filter_by(visitor_id=visitor_id).order_by(Visit.in_time.desc()).all())