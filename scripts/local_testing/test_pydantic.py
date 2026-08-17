import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.schemas.society import BatchCreateFlatsRequest

req = BatchCreateFlatsRequest.parse_obj({
    "flat_numbers": ["1", "2", "3"]
})
print("Parsed:", req.dict())
