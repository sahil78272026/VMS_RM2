## 2024-05-18 - Form Accessibility Foundations
**Learning:** Native form elements without explicit `<label htmlFor="id">` missing out on large clickable area and screen reader context, particularly in complex functional apps like RM2 visitor logs.
**Action:** Always map the `<label>` to `id` explicitly for standard inputs (`<input>`, `<select>`), and use `role="group"` with `aria-labelledby` for custom groups of options like custom buttons serving as radio choices.
