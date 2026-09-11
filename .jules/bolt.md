## 2024-05-30 - Fix N+1 query in VisitorLog to_dict (Refined)
**Learning:** Hardcoding `joinedload` onto all repository queries can introduce severe over-fetching and memory overhead for background jobs.
**Action:** Use an optional `load_relations` flag on repository methods so eager loading is only applied when the API controller or service layer specifically requires it for serialization.
