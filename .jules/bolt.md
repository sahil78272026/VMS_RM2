## 2024-08-06 - N+1 Queries in SQLAlchemy via to_dict()
**Learning:** Using a generic `to_dict()` method on SQLAlchemy models that access relationships (like `visitor` and `flat`) can trigger N+1 queries if those relationships are not eagerly loaded. This codebase pattern frequently exposes endpoints to this bottleneck when returning collections.
**Action:** When working on generic list endpoints (like `get_all_filtered`), always ensure the query applies eager loading (`joinedload`) for all relationships accessed inside `to_dict()` to avoid excessive lazy-load queries.
