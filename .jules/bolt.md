## 2024-08-12 - N+1 Queries in VisitorLogRepository
**Learning:** Calling `to_dict()` on a `VisitorLog` model object lazily loads the associated `Visitor` and `Flat` relationships, leading to a severe N+1 query performance bottleneck in list endpoints.
**Action:** When querying multiple `VisitorLog` models intended for `to_dict()` serialization, always apply `joinedload(VisitorLog.visitor)` and `joinedload(VisitorLog.flat)` to eager-load the relationships.
