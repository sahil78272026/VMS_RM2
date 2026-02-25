from app.models.models import Resident, Visit


class ResidentRepository:
    def get_primary_by_flat(self, flat_id):
        return Resident.query.filter_by(flat_id=flat_id).first()
    
    def get_resident(self, resident_id):
        resident = Resident.query.get(resident_id)
        return resident

    def get_visits(self, flat_id):
        visits = Visit.query.filter_by(flat_id=flat_id, status="PENDING").all()
        return visits