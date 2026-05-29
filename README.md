# CBI Lead Dashboard

Live dashboard for the Turkish citizenship-by-investment ($400k) property top-up hunt.
Reads/writes a Supabase table (`cbi_listings`); edit lead status inline (auto-saves).

- Shop band: ₺6.3–7.8M (buffer over a ~$140k appraisal target)
- KEEP = kat mülkiyeti + iskan · DROP = kat irtifakı / no iskan
- Filters: price, net m², district, rooms, verdict, status, free text

Static site (HTML/CSS/JS + Supabase REST). The anon key is public by design (RLS-gated).
