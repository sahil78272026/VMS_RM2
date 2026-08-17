from app.database import SessionLocal
from app.services.maintenance_service import MaintenanceService
db = SessionLocal()
ms = MaintenanceService(db)
flat_status = ms.get_flat_maintenance(3381)
print(flat_status)
