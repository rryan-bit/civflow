import { describe, it, expect } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { getComplianceAlerts } from "./compliance";
import { toDateInput, addDays } from "./dates";

// A minimal stand-in for the Supabase query builder: every chain method
// (select/eq/in/is/not/gt/order) just returns itself, and the chain is
// "thenable" so `await supabase.from(...).select(...).eq(...)` resolves the
// way the real client does. `.single()` resolves separately since it
// returns a differently-shaped result. Each table can only be queried once
// per test with this shape, which matches how compliance.ts actually calls
// each table exactly once.
function makeMockSupabase(tables: Record<string, { list?: { data: unknown; error: null }; single?: { data: unknown; error: null } }>) {
  return {
    from(table: string) {
      const entry = tables[table] ?? {};
      const chain: {
        select: () => typeof chain;
        eq: () => typeof chain;
        in: () => typeof chain;
        is: () => typeof chain;
        not: () => typeof chain;
        gt: () => typeof chain;
        order: () => typeof chain;
        single: () => Promise<{ data: unknown; error: null }>;
        then: (resolve: (v: { data: unknown; error: null }) => unknown, reject?: (e: unknown) => unknown) => Promise<unknown>;
      } = {
        select: () => chain,
        eq: () => chain,
        in: () => chain,
        is: () => chain,
        not: () => chain,
        gt: () => chain,
        order: () => chain,
        single: () => Promise.resolve(entry.single ?? { data: null, error: null }),
        then: (resolve, reject) => Promise.resolve(entry.list ?? { data: [], error: null }).then(resolve, reject),
      };
      return chain;
    },
  } as unknown as SupabaseClient<Database>;
}

const EMPTY_TABLES = {
  companies: { single: { data: null, error: null } },
  projects: { list: { data: [], error: null } },
  directions_to_rectify: { list: { data: [], error: null } },
  payment_claims: { list: { data: [], error: null } },
  variations: { list: { data: [], error: null } },
  subcontractors: { list: { data: [], error: null } },
};

describe("getComplianceAlerts", () => {
  it("returns no alerts when there's no company", async () => {
    const alerts = await getComplianceAlerts(makeMockSupabase(EMPTY_TABLES), null);
    expect(alerts).toEqual([]);
  });

  it("returns no alerts for a clean company with no active projects", async () => {
    const supabase = makeMockSupabase(EMPTY_TABLES);
    const alerts = await getComplianceAlerts(supabase, "company-1");
    expect(alerts).toEqual([]);
  });

  it("flags a QBCC licence expiring within 60 days as amber", async () => {
    const supabase = makeMockSupabase({
      ...EMPTY_TABLES,
      companies: { single: { data: { qbcc_licence_expiry: addDays(30), mfr_category: null, mfr_report_due_date: null }, error: null } },
    });
    const alerts = await getComplianceAlerts(supabase, "company-1");
    expect(alerts).toHaveLength(1);
    expect(alerts[0].severity).toBe("amber");
    expect(alerts[0].message).toMatch(/licence expires in/);
  });

  it("flags an expired QBCC licence as red", async () => {
    const supabase = makeMockSupabase({
      ...EMPTY_TABLES,
      companies: { single: { data: { qbcc_licence_expiry: addDays(-10), mfr_category: null, mfr_report_due_date: null }, error: null } },
    });
    const alerts = await getComplianceAlerts(supabase, "company-1");
    expect(alerts).toHaveLength(1);
    expect(alerts[0].severity).toBe("red");
    expect(alerts[0].message).toMatch(/expired 10d ago/);
  });

  it("flags a domestic building contract deposit cap breach and links to the financials page", async () => {
    const supabase = makeMockSupabase({
      ...EMPTY_TABLES,
      projects: {
        list: {
          data: [
            {
              id: "proj-1",
              name: "Smith Residence",
              status: "active",
              contract_value: 100000,
              deposit_amount: 10000,
              home_warranty_premium_paid: true,
            },
          ],
          error: null,
        },
      },
    });
    const alerts = await getComplianceAlerts(supabase, "company-1");
    expect(alerts).toHaveLength(1);
    expect(alerts[0].severity).toBe("red");
    expect(alerts[0].message).toContain("Smith Residence");
    expect(alerts[0].message).toContain("10.0%");
    expect(alerts[0].message).toContain("5%");
    expect(alerts[0].href).toBe("/projects/proj-1/financials");
  });

  it("does not flag a deposit at or under the 5% cap on a $20,000+ contract", async () => {
    const supabase = makeMockSupabase({
      ...EMPTY_TABLES,
      projects: {
        list: {
          data: [
            {
              id: "proj-1",
              name: "Smith Residence",
              status: "active",
              contract_value: 100000,
              deposit_amount: 5000,
              home_warranty_premium_paid: true,
            },
          ],
          error: null,
        },
      },
    });
    const alerts = await getComplianceAlerts(supabase, "company-1");
    expect(alerts).toEqual([]);
  });

  it("flags a deposit over the 10% Level 1 cap on a contract between $3,301 and $19,999", async () => {
    const supabase = makeMockSupabase({
      ...EMPTY_TABLES,
      projects: {
        list: {
          data: [
            {
              id: "proj-1",
              name: "Small Reno",
              status: "active",
              contract_value: 15000,
              deposit_amount: 5000,
              home_warranty_premium_paid: true,
            },
          ],
          error: null,
        },
      },
    });
    const alerts = await getComplianceAlerts(supabase, "company-1");
    expect(alerts).toHaveLength(1);
    expect(alerts[0].severity).toBe("red");
    expect(alerts[0].message).toContain("Small Reno");
    expect(alerts[0].message).toContain("10%");
  });

  it("flags a project over $3,300 with Home Warranty Insurance not yet marked paid", async () => {
    const supabase = makeMockSupabase({
      ...EMPTY_TABLES,
      projects: {
        list: {
          data: [
            {
              id: "proj-1",
              name: "New Build",
              status: "active",
              contract_value: 400000,
              deposit_amount: 20000,
              home_warranty_premium_paid: false,
            },
          ],
          error: null,
        },
      },
    });
    const alerts = await getComplianceAlerts(supabase, "company-1");
    expect(alerts).toHaveLength(1);
    expect(alerts[0].severity).toBe("amber");
    expect(alerts[0].message).toContain("Home Warranty Insurance premium");
  });

  it("does not flag Home Warranty Insurance once it's marked paid", async () => {
    const supabase = makeMockSupabase({
      ...EMPTY_TABLES,
      projects: {
        list: {
          data: [
            {
              id: "proj-1",
              name: "New Build",
              status: "active",
              contract_value: 400000,
              deposit_amount: 20000,
              home_warranty_premium_paid: true,
            },
          ],
          error: null,
        },
      },
    });
    const alerts = await getComplianceAlerts(supabase, "company-1");
    expect(alerts).toEqual([]);
  });

  it("flags an overdue Direction to Rectify as red, referencing the right project", async () => {
    const supabase = makeMockSupabase({
      ...EMPTY_TABLES,
      projects: { list: { data: [{ id: "proj-1", name: "Jones Extension", status: "active", contract_value: null, deposit_amount: null }], error: null } },
      directions_to_rectify: {
        list: { data: [{ id: "dtr-1", project_id: "proj-1", description: "Fix waterproofing", due_date: addDays(-5), status: "overdue" }], error: null },
      },
    });
    const alerts = await getComplianceAlerts(supabase, "company-1");
    expect(alerts).toHaveLength(1);
    expect(alerts[0].severity).toBe("red");
    expect(alerts[0].message).toContain("Jones Extension");
    expect(alerts[0].message).toContain("overdue by 5d");
    expect(alerts[0].href).toBe("/projects/proj-1/directions-to-rectify/dtr-1");
  });

  it("flags a payment claim missing its BIF Act supporting statement", async () => {
    const supabase = makeMockSupabase({
      ...EMPTY_TABLES,
      projects: { list: { data: [{ id: "proj-1", name: "Lee Build", status: "active", contract_value: null, deposit_amount: null }], error: null } },
      payment_claims: {
        list: {
          data: [{ id: "pc-1", project_id: "proj-1", claim_number: "PC-4", amount_claimed: 45000, status: "submitted", supporting_statement_provided: false }],
          error: null,
        },
      },
    });
    const alerts = await getComplianceAlerts(supabase, "company-1");
    expect(alerts).toHaveLength(1);
    expect(alerts[0].severity).toBe("amber");
    expect(alerts[0].message).toContain("Lee Build");
    expect(alerts[0].message).toContain("$45,000");
  });

  it("flags a payment claim past its due date as red, suggesting adjudication", async () => {
    const supabase = makeMockSupabase({
      ...EMPTY_TABLES,
      projects: { list: { data: [{ id: "proj-1", name: "Lee Build", status: "active", contract_value: null, deposit_amount: null }], error: null } },
      payment_claims: {
        list: {
          data: [
            {
              id: "pc-1",
              project_id: "proj-1",
              claim_number: "PC-4",
              amount_claimed: 45000,
              status: "submitted",
              supporting_statement_provided: true,
              due_date: addDays(-2),
            },
          ],
          error: null,
        },
      },
    });
    const alerts = await getComplianceAlerts(supabase, "company-1");
    expect(alerts).toHaveLength(1);
    expect(alerts[0].severity).toBe("red");
    expect(alerts[0].message).toContain("2d overdue");
    expect(alerts[0].message).toMatch(/adjudication/);
  });

  it("flags a payment claim due within 3 days as amber", async () => {
    const supabase = makeMockSupabase({
      ...EMPTY_TABLES,
      projects: { list: { data: [{ id: "proj-1", name: "Lee Build", status: "active", contract_value: null, deposit_amount: null }], error: null } },
      payment_claims: {
        list: {
          data: [
            {
              id: "pc-1",
              project_id: "proj-1",
              claim_number: "PC-4",
              amount_claimed: 45000,
              status: "schedule_received",
              supporting_statement_provided: true,
              due_date: addDays(2),
            },
          ],
          error: null,
        },
      },
    });
    const alerts = await getComplianceAlerts(supabase, "company-1");
    expect(alerts).toHaveLength(1);
    expect(alerts[0].severity).toBe("amber");
    expect(alerts[0].message).toContain("due in 2d");
  });

  it("flags a variation where work has started with no client sign-off as the highest-severity alert", async () => {
    const supabase = makeMockSupabase({
      ...EMPTY_TABLES,
      projects: { list: { data: [{ id: "proj-1", name: "Patel Reno", status: "active", contract_value: null, deposit_amount: null }], error: null } },
      variations: {
        list: {
          data: [{ id: "var-1", project_id: "proj-1", title: "Extra retaining wall", cost_impact: 8500, client_name: "Mrs Patel" }],
          error: null,
        },
      },
    });
    const alerts = await getComplianceAlerts(supabase, "company-1");
    expect(alerts).toHaveLength(1);
    expect(alerts[0].severity).toBe("red");
    expect(alerts[0].message).toContain("Extra retaining wall");
    expect(alerts[0].message).toContain("$8,500");
    expect(alerts[0].message).toMatch(/no client sign-off recorded/);
    expect(alerts[0].href).toBe("/projects/proj-1/variations/var-1");
  });

  it("flags unreleased subcontractor retention more than 90 days after completion", async () => {
    const supabase = makeMockSupabase({
      ...EMPTY_TABLES,
      projects: { list: { data: [{ id: "proj-1", name: "Nguyen Build", status: "active", contract_value: null, deposit_amount: null }], error: null } },
      subcontractors: {
        list: {
          data: [
            {
              id: "sub-1",
              project_id: "proj-1",
              company_name: "ABC Plumbing",
              completion_date: addDays(-120),
              retention_percentage: 5,
              retention_released_date: null,
              contract_value: 40000,
            },
          ],
          error: null,
        },
      },
    });
    const alerts = await getComplianceAlerts(supabase, "company-1");
    expect(alerts).toHaveLength(1);
    expect(alerts[0].severity).toBe("amber");
    expect(alerts[0].message).toContain("ABC Plumbing");
    expect(alerts[0].message).toContain("120d since completion");
  });

  it("does not flag subcontractor retention within the first 90 days after completion", async () => {
    const supabase = makeMockSupabase({
      ...EMPTY_TABLES,
      projects: { list: { data: [{ id: "proj-1", name: "Nguyen Build", status: "active", contract_value: null, deposit_amount: null }], error: null } },
      subcontractors: {
        list: {
          data: [
            {
              id: "sub-1",
              project_id: "proj-1",
              company_name: "ABC Plumbing",
              completion_date: addDays(-30),
              retention_percentage: 5,
              retention_released_date: null,
              contract_value: 40000,
            },
          ],
          error: null,
        },
      },
    });
    const alerts = await getComplianceAlerts(supabase, "company-1");
    expect(alerts).toEqual([]);
  });

  it("returns multiple alerts across categories together, all correctly attributed", async () => {
    const supabase = makeMockSupabase({
      companies: { single: { data: { qbcc_licence_expiry: addDays(-1), mfr_category: null, mfr_report_due_date: null }, error: null } },
      projects: {
        list: {
          data: [
            {
              id: "proj-1",
              name: "Multi Alert Job",
              status: "active",
              contract_value: 100000,
              deposit_amount: 10000,
              home_warranty_premium_paid: true,
            },
          ],
          error: null,
        },
      },
      directions_to_rectify: { list: { data: [], error: null } },
      payment_claims: { list: { data: [], error: null } },
      variations: { list: { data: [], error: null } },
      subcontractors: { list: { data: [], error: null } },
    });
    const alerts = await getComplianceAlerts(supabase, "company-1");
    // One for the expired licence (company-level) + one for the deposit cap breach (project-level).
    expect(alerts).toHaveLength(2);
    expect(alerts.some((a) => a.message.includes("licence expired"))).toBe(true);
    expect(alerts.some((a) => a.message.includes("Multi Alert Job"))).toBe(true);
  });
});

// Sanity check that toDateInput/addDays are wired the way this test file
// assumes (used above to build relative due dates for the mocked rows).
describe("test setup sanity", () => {
  it("addDays(0) equals today's date string", () => {
    expect(addDays(0)).toBe(toDateInput(new Date()));
  });
});
