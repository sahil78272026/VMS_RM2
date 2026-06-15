from sqlalchemy.orm import Session
import math

class BaseRepository:
    """Generic repository with CRUD for any SQLAlchemy model."""

    def __init__(self, model, db: Session):
        self.model = model
        self.db = db

    def get_by_id(self, id: int):
        return self.db.query(self.model).get(id)

    def get_all(self):
        return self.db.query(self.model).all()

    def paginate(self, page: int = 1, per_page: int = 20, query=None):
        q = query if query is not None else self.db.query(self.model)
        total = q.count()
        pages = math.ceil(total / per_page)
        items = q.offset((page - 1) * per_page).limit(per_page).all()
        return {
            "items": items,
            "meta": {
                "page":     page,
                "per_page": per_page,
                "total":    total,
                "pages":    pages,
            }
        }

    def save(self, instance):
        self.db.add(instance)
        self.db.commit()
        self.db.refresh(instance)
        return instance

    def delete(self, instance):
        self.db.delete(instance)
        self.db.commit()

    def bulk_save(self, instances: list):
        self.db.add_all(instances)
        self.db.commit()

    def rollback(self):
        self.db.rollback()
