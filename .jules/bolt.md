## 2024-05-24 - Avoid N+1 Query in VisitorLog Serialization
**Learning:** `VisitorLog` instances have several relationships (`visitor`, `flat`, `flat_user`, `entry_gate`, `approved_by_flat_user`) that get lazy-loaded during `to_dict()` serialization. Returning lists of logs triggers massive N+1 queries.
**Action:** Use SQLAlchemy's `joinedload` on relationships involved in model `to_dict()` methods when querying lists. `VisitorLogRepository` now provides a `_base_query()` helper to centralize these eagerly loaded relationships.
