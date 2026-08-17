## 2026-08-07 - N+1 Queries in VisitorLog Serialization
**Learning:** The backend SQLAlchemy models have a recurring architectural pattern where `to_dict()` serialization triggers N+1 query performance bottlenecks on lazy-loaded relationships like `visitor` and `flat` in `VisitorLog`.
**Action:** Always verify if `to_dict()` is serializing relationships, and mitigate by applying `joinedload` eager loading in repository queries returning lists.
