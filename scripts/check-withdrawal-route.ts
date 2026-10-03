// Run with: npx tsx --conditions=react-server scripts/check-withdrawal-route.ts
import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { POST } from "../app/api/account/withdraw/route";

const owner = "11111111-1111-4111-8111-111111111111";
const token = "test-signed-in-token";
const request = (body: unknown, headers: Record<string, string> = { Authorization: `Bearer ${token}` }) =>
  new NextRequest("https://community.example/api/account/withdraw", {
    method: "POST", headers: { "Content-Type": "application/json", ...headers }, body: JSON.stringify(body),
  });
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { "Content-Type": "application/json" },
});

async function main() {
  const originalFetch = globalThis.fetch;
  const originalError = console.error;
  const originalEnv = { ...process.env };
  const logs: unknown[][] = [];
  console.error = (...args) => { logs.push(args); };
  try {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://supabase.example";
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "sb_publishable_test";
    delete process.env.SUPABASE_SECRET_KEY;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    let calls: string[] = [];
    let failure = "";
    let avatarRemoved = false;
    let imagesRemoved = false;
    let expectedMode = "preserve";
    globalThis.fetch = async (input, init) => {
      const url = String(input);
      calls.push(url);
      assert.equal(new Headers(init?.headers).get("apikey"), process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);
      assert.equal(new Headers(init?.headers).get("authorization"), `Bearer ${token}`);
      if (url.endsWith("/auth/v1/user")) {
        assert.equal(new Headers(init?.headers).get("authorization"), `Bearer ${token}`);
        if (failure === "auth") return json({ message: "Invalid session" }, 401);
        return json({ id: owner, aud: "authenticated", role: "authenticated", email: "fixture@example.invalid" });
      }
      if (url.includes("/storage/v1/object/list/")) {
        if (failure === "list") return json({ message: "Storage unavailable", statusCode: "503" }, 503);
        const options = JSON.parse(String(init?.body));
        if (url.endsWith("/avatars")) {
          assert.equal(options.search, `${owner}-`);
          return json(avatarRemoved ? [] : [
            { id: "owned-avatar", name: `${owner}-avatar.webp` },
            { id: "other-avatar", name: "other-member-avatar.webp" },
          ]);
        }
        assert.equal(options.prefix, owner);
        return json(imagesRemoved ? [] : [{ id: "owned-image", name: "image.webp" }]);
      }
      if (url.includes("/storage/v1/object/") && init?.method === "DELETE") {
        if (failure === "remove") return json({ message: "Storage deletion failed", statusCode: "403" }, 403);
        const paths = JSON.parse(String(init.body)).prefixes;
        if (url.endsWith("/avatars")) {
          assert.deepEqual(paths, [`${owner}-avatar.webp`]);
          avatarRemoved = true;
        } else {
          assert.deepEqual(paths, [`${owner}/image.webp`]);
          imagesRemoved = true;
        }
        return json(failure === "partial" ? [] : paths.map((name: string) => ({ name })));
      }
      if (url.endsWith("/rest/v1/rpc/withdraw_member")) {
        assert.deepEqual(JSON.parse(String(init?.body)), { p_mode: expectedMode });
        if (failure === "rpc") return json({ code: "23503", message: "Foreign key violation", details: "private row details" }, 400);
        return new Response(null, { status: 204 });
      }
      throw new Error(`Unexpected fetch: ${url}`);
    };

    for (const mode of ["preserve", "remove"]) {
      expectedMode = mode;
      calls = [];
      avatarRemoved = imagesRemoved = false;
      const response = await POST(request({ mode, confirmation: "Germanhanguk" }));
      assert.equal(response.status, 200, JSON.stringify(logs));
      assert.deepEqual(await response.json(), { ok: true });
      assert.equal(response.headers.get("cache-control"), "no-store");
      assert.equal(imagesRemoved, mode === "remove");
      assert.equal(avatarRemoved, true);
    }

    calls = [];
    for (const body of [
      { mode: "remove", confirmation: "Germanhanguk", userId: "someone-else" },
      { mode: "preserve", confirmation: "GermanHanguk" },
    ]) assert.equal((await POST(request(body))).status, 400);
    assert.equal((await POST(request({ mode: "remove", confirmation: "Germanhanguk" }, {}))).status, 401);
    assert.equal((await POST(request({ mode: "remove", confirmation: "Germanhanguk" }, { Authorization: `Bearer ${token}`, Origin: "https://attacker.example" }))).status, 403);
    assert.equal(calls.length, 0);

    expectedMode = "preserve";
    for (const [scenario, stage] of [["list", "storage-list"], ["remove", "storage-remove"], ["partial", "storage-remove"], ["rpc", "database-withdrawal"]]) {
      failure = scenario;
      calls = [];
      avatarRemoved = false;
      const response = await POST(request({ mode: "preserve", confirmation: "Germanhanguk" }));
      assert.equal(response.status, 500);
      const payload = JSON.stringify(await response.json());
      assert.ok(!payload.includes("Foreign key") && !payload.includes("private row") && !payload.includes(token));
      const diagnostic = logs.at(-1)?.[1] as { stage: string; code?: string };
      assert.equal(diagnostic.stage, stage);
      if (scenario === "rpc") assert.equal(diagnostic.code, "23503");
      else assert.ok(!calls.some((url) => url.includes("/rpc/")));
    }
    failure = "auth";
    calls = [];
    assert.equal((await POST(request({ mode: "preserve", confirmation: "Germanhanguk" }))).status, 401);
    assert.equal(calls.length, 1);

    // Only the public key and signed-in JWT are required for self-only cleanup.
    failure = "";
    avatarRemoved = false;
    assert.equal((await POST(request({ mode: "preserve", confirmation: "Germanhanguk" }))).status, 200);
    delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    assert.equal((await POST(request({ mode: "preserve", confirmation: "Germanhanguk" }))).status, 500);
    assert.equal((logs.at(-1)?.[1] as { stage: string }).stage, "configuration");
    assert.ok(!JSON.stringify(logs).includes(token));
    assert.ok(!JSON.stringify(logs).includes("private row details"));
    console.log("Withdrawal route: both modes, self-only JWT, failure stages and safe responses passed.");
  } finally {
    globalThis.fetch = originalFetch;
    console.error = originalError;
    process.env = originalEnv;
  }
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
