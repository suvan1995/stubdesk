-- Bring any existing 2026 tax_constants row in line with CRA T4127, effective Jan 1, 2026.
update public.tax_constants
set
  on_surtax1_threshold = 5818,
  on_surtax2_threshold = 7446,
  ab_brackets = '[
    {"min":0,"max":61200,"rate":0.08},
    {"min":61200,"max":154259,"rate":0.10},
    {"min":154259,"max":185111,"rate":0.12},
    {"min":185111,"max":246813,"rate":0.13},
    {"min":246813,"max":370220,"rate":0.14},
    {"min":370220,"max":null,"rate":0.15}
  ]'::jsonb,
  bc_basic_personal = 13216,
  bc_credit_rate = 0.0506,
  bc_brackets = '[
    {"min":0,"max":50363,"rate":0.0506},
    {"min":50363,"max":100728,"rate":0.0770},
    {"min":100728,"max":115648,"rate":0.1050},
    {"min":115648,"max":140430,"rate":0.1229},
    {"min":140430,"max":190405,"rate":0.1470},
    {"min":190405,"max":265545,"rate":0.1680},
    {"min":265545,"max":null,"rate":0.2050}
  ]'::jsonb,
  updated_at = now()
where tax_year = 2026;
