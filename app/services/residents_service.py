class ResidentService:
    def __init__(self, resident_repo, ):
        self.resident_repo=resident_repo

    def get_pending_visitors(self, resident_id):
        resident = self.resident_repo.get_resident(resident_id)
        visits = self.resident_repo.get_visits(resident.flat_id)
        return visits
