## 2025-03-05 - Mitigated N+1 Queries on `to_dict()` Serialization
**Learning:** The backend SQLAlchemy models frequently trigger N+1 queries during the execution of `.to_dict()` methods because they lazily load relationships required for serialization. Simply querying all models results in large cascading query counts.
**Action:** When working on backend models and repositories, always ensure a custom `_base_query` method applies `.options(joinedload(...))` on critical relationships needed by the model's `to_dict()` logic to prevent N+1 performance bottlenecks.
