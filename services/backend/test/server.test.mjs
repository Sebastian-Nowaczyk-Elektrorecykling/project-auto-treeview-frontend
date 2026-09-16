import assert from "node:assert/strict";
import test from "node:test";
import { createTreeServer } from "../src/server.mjs";
import { TreeStore } from "../src/tree-store.mjs";

const withServer = async (callback) => {
  const server = createTreeServer(new TreeStore());
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  try {
    const { port } = server.address();
    await callback(`http://127.0.0.1:${port}`);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
};

test("serves and updates a snapshot over HTTP", async () => {
  await withServer(async (baseUrl) => {
    const current = await (await fetch(`${baseUrl}/tree`)).json();
    current.root.children.push({
      id: "enabled",
      data: { kind: "boolean", value: true },
      children: [],
    });

    const response = await fetch(`${baseUrl}/tree`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ expectedRevision: current.revision, root: current.root }),
    });
    const updated = await response.json();

    assert.equal(response.status, 200);
    assert.equal(updated.revision, 1);
    assert.equal(updated.root.children[0].data.kind, "boolean");
  });
});

test("returns a contract-shaped conflict", async () => {
  await withServer(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/tree`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        expectedRevision: 9,
        root: { id: "root", data: { kind: "text", value: "Root" }, children: [] },
      }),
    });
    const error = await response.json();

    assert.equal(response.status, 409);
    assert.equal(error.code, "revision_conflict");
    assert.equal(error.currentRevision, 0);
  });
});
