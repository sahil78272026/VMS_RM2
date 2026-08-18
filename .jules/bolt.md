## 2024-08-18 - Eager Loading to Prevent N+1 Queries on Serialization
**Learning:** The backend SQLAlchemy models (`VisitorLog` specifically) have a recurring architectural pattern where `to_dict()` serialization triggers N+1 query performance bottlenecks on lazy-loaded relationships.
**Action:** Applied `joinedload` eager loading in repository queries (e.g., `VisitorLogRepository._base_query`) to pre-fetch relationships that are accessed during the `to_dict()` serialization. This prevents multiple database calls for each log item when formatting lists.
