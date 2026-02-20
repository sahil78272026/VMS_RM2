from app.models import Visitor
from app.extensions import db
from datetime import datetime

class VisitorRepository:

    def get_by_mobile(self, mobile):
        return Visitor.query.filter_by(mobile=mobile).first()

    def create(self, name, mobile, company):
        visitor = Visitor(name=name, mobile=mobile, company=company)
        db.session.add(visitor)
        return visitor
    
    def update(self, visitor: Visitor, name, company):
        visitor.name = name
        visitor.company= company
        visitor.last_visited = datetime.utcnow()
        return visitor
    