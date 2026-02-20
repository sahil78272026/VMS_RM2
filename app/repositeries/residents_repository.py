from app.models import Resident

class ResidentRepository:
    def get_primary_by_flat(self, flat_id):
        return Resident.query.filter_by(flat_id=flat_id).first()
    