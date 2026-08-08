## 2024-08-08 - Serialization N+1 Queries
**Learning:** The backend's `to_dict()` serialization triggers N+1 query bottlenecks on relationships mapped in SQLAlchemy models (e.g., `VisitorLog` serializing `visitor` and `flat`).
**Action:** Use `joinedload` on `db.query()` in the repositories for related models that are explicitly required by `to_dict()` to eagerly load relationships and avoid N+1 queries.
