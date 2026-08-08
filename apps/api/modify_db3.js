const fs = require('fs');
let content = fs.readFileSync('src/lib/db.ts', 'utf8');

// 1. Imports
content = content.replace(
  'import { drizzle as drizzleHttp } from "drizzle-orm/neon-http";',
  'import { drizzle as drizzleHttp } from "drizzle-orm/neon-http";\nimport { drizzle as drizzleNodePg } from "drizzle-orm/node-postgres";\nimport { Pool } from "pg";'
);

// 2. createPgClient
const createPgClientStr = `function createPgClient(env: Env, mode: DbMode = "write"): Client {
  return new Client({
    connectionString: getUrl(env, mode),
    connectionTimeoutMillis: 15000,
    keepAlive: false,
  });
}`;
const getPoolStr = `const connectionPools = new Map<string, Pool>();

function getPool(env: Env, mode: DbMode = "write"): Pool {
  const url = getUrl(env, mode);
  if (!connectionPools.has(url)) {
    const pool = new Pool({
      connectionString: url,
      max: Number(env.DB_POOL_MAX || 10),
      connectionTimeoutMillis: 15000,
      idleTimeoutMillis: 30000,
    });
    connectionPools.set(url, pool);
  }
  return connectionPools.get(url)!;
}

class RlsPoolWrapper {
  constructor(private pool: Pool) {}
  
  async query(...args: any[]) {
    const orgId = getOrgContext();
    if (!orgId) return (this.pool.query as any)(...args);
    
    const client = await this.pool.connect();
    try {
      await client.query(\`SELECT set_config('app.org_id', $1, false)\`, [orgId]);
      return await (client.query as any)(...args);
    } finally {
      await client.query(\`SELECT set_config('app.org_id', '', false)\`).catch(() => {});
      client.release();
    }
  }
  
  async connect() {
    const client = await this.pool.connect();
    const orgId = getOrgContext();
    if (orgId) {
      await client.query(\`SELECT set_config('app.org_id', $1, false)\`, [orgId]);
      const originalRelease = client.release.bind(client);
      client.release = (err?: any) => {
        client.query(\`SELECT set_config('app.org_id', '', false)\`).catch(() => {}).finally(() => {
          originalRelease(err);
        });
      };
    }
    return client;
  }
}`;
content = content.replace(createPgClientStr, getPoolStr);

// 3. createDb tcp replacement
const createDbTcpStr = `  if (isTcpConnection(env, _mode)) {
    const client = {
      query: async (
        queryText: string,
        queryParams: any[] = [],
        queryOpts?: Record<string, unknown>,
      ) => {
        const pgClient = createPgClient(env, _mode);
        const orgId = getOrgContext();
        try {
          await pgClient.connect();
          if (orgId) {
            await pgClient.query(\`SELECT set_config('app.org_id', $1, false)\`, [orgId]);
          }

          const result = (await pgClient.query({
            text: queryText,
            values: queryParams,
            rowMode: queryOpts?.arrayMode ? "array" : undefined,
          } as any)) as any;

          return {
            rows: result.rows,
            rowCount: result.rowCount,
            fields: result.fields,
            command: result.command,
          };
        } catch (dbErr: any) {
          const errorMsg = \`Database Error: \${dbErr.message}\${dbErr.detail ? \` (\${dbErr.detail})\` : ""}\${dbErr.constraint ? \` [constraint: \${dbErr.constraint}]\` : ""}\${dbErr.code ? \` [code: \${dbErr.code}]\` : ""}\`;
          console.error(\`[DB/PG] Query Error: \${errorMsg}\`, {
            queryText: queryText?.substring(0, 300),
            queryParams: JSON.stringify(queryParams)?.substring(0, 300),
            orgId,
            errorCode: dbErr.code,
            constraint: dbErr.constraint,
          });

          const enhancedError = new Error(errorMsg);
          (enhancedError as any).code = dbErr.code;
          (enhancedError as any).detail = dbErr.detail;
          (enhancedError as any).hint = dbErr.hint;
          (enhancedError as any).constraint = dbErr.constraint;
          (enhancedError as any).query = queryText;
          (enhancedError as any).params = queryParams;
          throw enhancedError;
        } finally {
          try {
            await pgClient.end();
          } catch {
            // Hyperdrive/pg can throw synchronously while closing an already-closed socket.
          }
        }
      },
    } as const;

    return drizzleHttp(client as any, { schema });
  }`;

const createDbTcpReplacement = `  if (isTcpConnection(env, _mode)) {
    const pool = getPool(env, _mode);
    const wrapper = new RlsPoolWrapper(pool);
    return drizzleNodePg(wrapper as any, { schema }) as any;
  }`;
content = content.replace(createDbTcpStr, createDbTcpReplacement);

// 4. withRls tcp replacement
const withRlsTcpStr = `  if (isTcpConnection(env, mode)) {
    const client = createPgClient(env, mode);
    try {
      await client.connect();
      await client.query(\`SELECT set_config('app.org_id', $1, false)\`, [organizationId]);
      return await fn(client);
    } finally {
      try {
        await client.end();
      } catch {
        // Hyperdrive/pg can throw synchronously while closing an already-closed socket.
      }
    }
  }`;

const withRlsTcpReplacement = `  if (isTcpConnection(env, mode)) {
    const pool = getPool(env, mode);
    const client = await pool.connect();
    try {
      await client.query(\`SELECT set_config('app.org_id', $1, false)\`, [organizationId]);
      return await fn(client);
    } finally {
      await client.query(\`SELECT set_config('app.org_id', '', false)\`).catch(() => {});
      client.release();
    }
  }`;
content = content.replace(withRlsTcpStr, withRlsTcpReplacement);

// 5. createPool tcp replacement
const createPoolTcpStr = `  if (isTcpConnection(env, mode)) {
    const queryProxy = async <Row extends DbRow = any>(
      textOrStrings: string | TemplateStringsArray,
      ...paramsOrValues: any[]
    ): Promise<DbQueryResult<Row>> => {
      const { text, params } = normalizeQueryArgs(textOrStrings, paramsOrValues);

      const executeQuery = async () => {
        const client = createPgClient(env, mode);
        try {
          await client.connect();
          const effectiveOrgId = getOrgContext() || orgId;
          if (effectiveOrgId) {
            await client.query(
              \`SELECT set_config('app.org_id', $1, true),
                      set_config('app.organization_id', $1, true),
                      set_config('app.current_organization_id', $1, true)\`,
              [effectiveOrgId],
            );
          }
          const res = await client.query(text, params);
          return {
            rows: res.rows as any[],
            rowCount: res.rowCount,
            fields: res.fields as any[],
            command: res.command,
          } as DbQueryResult<Row>;
        } finally {
          await client.end().catch(() => {});
        }
      };

      return await executeQuery();
    };

    const wrappedQuery = wrapQueryWithTimeout(queryProxy as any, defaultTimeout);

    return {
      query: wrappedQuery,
      transaction: async (queries: { text: string; values?: any[] }[]) => {
        const client = createPgClient(env, mode);
        try {
          await client.connect();
          await client.query("BEGIN");
          const effectiveOrgId = getOrgContext() || orgId;
          if (effectiveOrgId) {
            await client.query(\`SELECT set_config('app.org_id', $1, true)\`, [effectiveOrgId]);
          }
          const results = [];
          for (const q of queries) {
            const res = await client.query(q.text, q.values);
            results.push(res);
          }
          await client.query("COMMIT");
          return results;
        } catch (error) {
          await client.query("ROLLBACK");
          throw error;
        } finally {
          await client.end().catch(() => {});
        }
      },
      end: async () => {},
    };
  }`;

const createPoolTcpReplacement = `  if (isTcpConnection(env, mode)) {
    const pool = getPool(env, mode);
    
    const queryProxy = async <Row extends DbRow = any>(
      textOrStrings: string | TemplateStringsArray,
      ...paramsOrValues: any[]
    ): Promise<DbQueryResult<Row>> => {
      const { text, params } = normalizeQueryArgs(textOrStrings, paramsOrValues);
      const effectiveOrgId = getOrgContext() || orgId;
      
      if (!effectiveOrgId) {
        const res = await pool.query(text, params);
        return {
          rows: res.rows as any[],
          rowCount: res.rowCount,
          fields: res.fields as any[],
          command: res.command,
        } as DbQueryResult<Row>;
      }

      const client = await pool.connect();
      try {
        await client.query(
          \`SELECT set_config('app.org_id', $1, true),
                  set_config('app.organization_id', $1, true),
                  set_config('app.current_organization_id', $1, true)\`,
          [effectiveOrgId]
        );
        const res = await client.query(text, params);
        return {
          rows: res.rows as any[],
          rowCount: res.rowCount,
          fields: res.fields as any[],
          command: res.command,
        } as DbQueryResult<Row>;
      } finally {
        await client.query(
          \`SELECT set_config('app.org_id', '', false),
                  set_config('app.organization_id', '', false),
                  set_config('app.current_organization_id', '', false)\`
        ).catch(() => {});
        client.release();
      }
    };

    const wrappedQuery = wrapQueryWithTimeout(queryProxy as any, defaultTimeout);

    return {
      query: wrappedQuery,
      transaction: async (queries: { text: string; values?: any[] }[]) => {
        const client = await pool.connect();
        try {
          await client.query("BEGIN");
          const effectiveOrgId = getOrgContext() || orgId;
          if (effectiveOrgId) {
            await client.query(\`SELECT set_config('app.org_id', $1, true)\`, [effectiveOrgId]);
          }
          const results = [];
          for (const q of queries) {
            const res = await client.query(q.text, q.values);
            results.push(res);
          }
          await client.query("COMMIT");
          return results;
        } catch (error) {
          await client.query("ROLLBACK").catch(() => {});
          throw error;
        } finally {
          if (getOrgContext() || orgId) {
            await client.query(\`SELECT set_config('app.org_id', '', false)\`).catch(() => {});
          }
          client.release();
        }
      },
      end: async () => {},
    };
  }`;
content = content.replace(createPoolTcpStr, createPoolTcpReplacement);

// 6. getRawSql tcp replacement
const getRawSqlTcpStr = `  if (isTcpConnection(env, mode)) {
    const processQuery = async <Row extends DbRow = DbRow>(
      textOrStrings: string | TemplateStringsArray,
      ...paramsOrValues: any[]
    ): Promise<DbQueryResult<Row>> => {
      const { text, params } = normalizeQueryArgs(textOrStrings, paramsOrValues);

      const client = createPgClient(env, mode);
      try {
        await client.connect();
        const effectiveOrgId = getOrgContext() ?? orgId;
        if (effectiveOrgId) {
          await client.query(\`SELECT set_config('app.org_id', $1, true)\`, [effectiveOrgId]);
        }

        const res = await client.query(text, params);
        return {
          rows: res.rows as any[],
          rowCount: res.rowCount,
          fields: res.fields as any[],
          command: res.command,
        } as DbQueryResult<Row>;
      } finally {
        await client.end().catch(() => {});
      }
    };

    return processQuery as DbQuery;
  }`;

const getRawSqlTcpReplacement = `  if (isTcpConnection(env, mode)) {
    const pool = getPool(env, mode);
    const processQuery = async <Row extends DbRow = DbRow>(
      textOrStrings: string | TemplateStringsArray,
      ...paramsOrValues: any[]
    ): Promise<DbQueryResult<Row>> => {
      const { text, params } = normalizeQueryArgs(textOrStrings, paramsOrValues);
      const effectiveOrgId = getOrgContext() ?? orgId;

      if (!effectiveOrgId) {
        const res = await pool.query(text, params);
        return {
          rows: res.rows as any[],
          rowCount: res.rowCount,
          fields: res.fields as any[],
          command: res.command,
        } as DbQueryResult<Row>;
      }

      const client = await pool.connect();
      try {
        await client.query(\`SELECT set_config('app.org_id', $1, true)\`, [effectiveOrgId]);
        const res = await client.query(text, params);
        return {
          rows: res.rows as any[],
          rowCount: res.rowCount,
          fields: res.fields as any[],
          command: res.command,
        } as DbQueryResult<Row>;
      } finally {
        await client.query(\`SELECT set_config('app.org_id', '', false)\`).catch(() => {});
        client.release();
      }
    };

    return processQuery as DbQuery;
  }`;
content = content.replace(getRawSqlTcpStr, getRawSqlTcpReplacement);

fs.writeFileSync('src/lib/db.ts', content);
