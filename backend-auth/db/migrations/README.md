Migration order:

1. `V001__baseline_schema.sql`
2. `V002__production_hardening.sql`

Notes:

- The application no longer performs schema mutations at runtime.
- Hibernate is configured with `hbm2ddl.auto=validate`, so these migrations must be applied before startup.
- Both SQL files are idempotent and safe to re-run on MySQL 8.x.
- Rollback guidance is embedded at the top of each migration file because several steps are destructive if reversed blindly.
