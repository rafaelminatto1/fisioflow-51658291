import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
class RlsPoolWrapper {
  constructor(private pool: Pool) {}
  async query(...args: any[]) { return (this.pool.query as any)(...args); }
  async connect() { 
    const client = await this.pool.connect(); 
    return client; 
  }
}
const wrapper = new RlsPoolWrapper(new Pool());
const db = drizzle(wrapper as any);
console.log(db ? "success" : "fail");
