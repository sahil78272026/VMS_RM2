class VisitResponseDTO:
    @staticmethod
    def from_model(v):
        return {"id":v.id,
        "flat":v.flat.number,
        "purpose":v.purpose,
        "in_time":v.in_time.isoformat(),
        "out_time":v.out_time.isoformat() if v.out_time else None }