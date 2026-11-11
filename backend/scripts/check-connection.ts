import { connectDb, disconnectDb } from '../src/config/db';

connectDb()
  .then(() => { console.log('OK: connected to a replica set; transactions are available.'); return disconnectDb(); })
  .catch((e) => { console.error('FAILED:', e.message); process.exit(1); });
