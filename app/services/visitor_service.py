from app.extensions import  db


class VisitorService:
    def __init__(self, visitor_repo, flat_repo, visit_repo, resident_repo, notification_service):
        self.visitor_repo = visitor_repo
        self.flat_repo = flat_repo
        self.visit_repo = visit_repo
        self.resident_repo = resident_repo
        self.notification_service = notification_service

    def create_entry(self, dto):
        visitor = self.visitor_repo.get_by_mobile(dto.mobile)
        if not visitor:
            visitor = self.visitor_repo.create(dto.name, dto.mobile, dto.company)
        self.visitor_repo.update(visitor, dto.name, dto.company)
        flat = self.flat_repo.get_by_number(dto.flat_id)
        visit = self.visit_repo.create(visitor, flat.id, dto.purpose)
        db.session.commit()
        resident = self.resident_repo.get_primary_by_flat(flat.id)
        if resident:
            self.notification_service.notify_resident(resident.id)
        return visit
