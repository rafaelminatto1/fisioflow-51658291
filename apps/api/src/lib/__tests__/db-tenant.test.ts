import { describe, it, expect, vi, beforeEach } from "vitest";
import { createDbForOrg, createPoolForOrg, runWithOrg, getOrgContext, createDb } from "../db";
import * as serverless from "@neondatabase/serverless";

vi.mock("@neondatabase/serverless", () => ({
    neon: vi.fn(),
}));

describe("Database Multi-tenant Audit (RLS & organizationId)", () => {
    let transactionMock: ReturnType<typeof vi.fn>;
    let queryMock: ReturnType<typeof vi.fn>;
    let neonInstanceMock: any;

    beforeEach(() => {
        vi.clearAllMocks();

        transactionMock = vi.fn().mockResolvedValue([null, { mockResult: true }]);
        queryMock = vi.fn().mockResolvedValue({ mockQueryResult: true });

        // Simulate the tagged template literal neon() call
        neonInstanceMock = vi.fn((strings, ...values) => {
            return { strings, values };
        }) as any;
        
        neonInstanceMock.transaction = transactionMock;
        neonInstanceMock.query = queryMock;
        
        // Mock neon factory to return our mock instance
        (serverless.neon as any).mockReturnValue(neonInstanceMock);
    });

    it("should set app.org_id via Neon RLS config when calling createDbForOrg", async () => {
        const env = { NEON_URL: "postgres://mock" } as any;
        const db = createDbForOrg(env, "org-123");

        // The inner sql object wrapped by wrapSqlWithRls is passed to drizzleHttp.
        // We will simulate a call that drizzle would make:
        // Drizzle uses the tagged template literal on the neon instance.
        const wrappedSql = (db as any).session.client;
        
        // Trigger a fake query to see what happens
        await wrappedSql`SELECT * FROM users`;

        expect(transactionMock).toHaveBeenCalled();
        const transactionCalls = transactionMock.mock.calls[0][0];
        
        // transactionCalls is an array of tagged template results.
        // The first one should be the set_config call.
        const setConfigCall = transactionCalls[0];
        expect(setConfigCall.strings[0]).toContain("SELECT set_config('app.org_id'");
        expect(setConfigCall.values[0]).toBe("org-123");
    });

    it("should set app.org_id correctly when using createPoolForOrg", async () => {
        const env = { NEON_URL: "postgres://mock" } as any;
        const pool = createPoolForOrg(env, "org-456");
        
        // Execute a direct query using the pool wrapper
        await pool.query("SELECT * FROM patients WHERE id = $1", ["pat-123"]);
        
        expect(transactionMock).toHaveBeenCalled();
        const transactionCalls = transactionMock.mock.calls[0][0];
        
        const setConfigCall = transactionCalls[0];
        expect(setConfigCall.strings[0]).toContain("SELECT set_config('app.org_id'");
        expect(setConfigCall.values[0]).toBe("org-456");
        
        const actualQueryCall = transactionCalls[1];
        expect(await actualQueryCall).toEqual({ mockQueryResult: true }); // neon.query() mock return
    });

    it("should isolate organizationId in runWithOrg context properly", async () => {
        const env = { NEON_URL: "postgres://mock" } as any;

        await runWithOrg("org-async-789", async () => {
            expect(getOrgContext()).toBe("org-async-789");
            
            const db = createDb(env);
            const wrappedSql = (db as any).session.client;
            await wrappedSql`SELECT * FROM appointments`;

            expect(transactionMock).toHaveBeenCalled();
            const transactionCalls = transactionMock.mock.calls[0][0];
            
            const setConfigCall = transactionCalls[0];
            expect(setConfigCall.strings[0]).toContain("SELECT set_config('app.org_id'");
            expect(setConfigCall.values[0]).toBe("org-async-789");
        });
    });

    it("createDb should not inject set_config if no org context is provided", async () => {
        const env = { NEON_URL: "postgres://mock" } as any;
        expect(getOrgContext()).toBeUndefined();
        
        const db = createDb(env);
        const sqlClient = (db as any).session.client;
        
        // When there is no context, it returns the raw neon instance without wrapSqlWithRls.
        await sqlClient`SELECT * FROM users`;
        
        // Since it's the raw instance, transactionMock should NOT have been called.
        expect(transactionMock).not.toHaveBeenCalled();
        expect(neonInstanceMock).toHaveBeenCalled(); // The tagged template literal on raw neon instance
    });
});
