import PgBoss from 'pg-boss';

let boss: PgBoss | undefined;

export function getBoss(): PgBoss {
  if (!boss) {
    const connectionString = process.env.DIRECT_URL;
    if (!connectionString) {
      throw new Error(
        'DIRECT_URL is required to start pg-boss — it needs a direct, session-mode connection; pgbouncer transaction mode breaks the LISTEN/NOTIFY it relies on',
      );
    }
    boss = new PgBoss({ connectionString });
    boss.on('error', (error) => {
      console.error('[pg-boss]', error);
    });
  }
  return boss;
}
