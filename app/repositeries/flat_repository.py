from app.models.models import Flat

class FlatRepository:
    def get_by_number(self, number):
        return Flat.query.filter_by(number=number).first()
    
    