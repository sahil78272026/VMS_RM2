## 2024-08-11 - Fixed N+1 Query in VisitorLog Serialization
**Learning:** The `to_dict()` serialization methods on SQLAlchemy models in this codebase often access nested lazy-loaded relationships (e.g., `self.visitor.to_dict()`, `self.flat.to_dict()`), causing severe N+1 query bottlenecks during iteration on lists (like paginated admin views).
**Action:** Always identify and apply eager loading using `joinedload` (e.g., `.options(joinedload(...))`) in the corresponding repository query when list endpoints retrieve data that triggers these nested `to_dict()` serializations.
