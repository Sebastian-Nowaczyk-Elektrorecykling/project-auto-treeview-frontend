import assert from "node:assert/strict";
import test from "node:test";
import { InvalidTree, RevisionConflict, TreeStore, validateTree } from "../src/tree-store.mjs";

const root = (value = "Root") => ({
  id: "root",
  data: { kind: "text", value },
  children: [],
});

test("replaces a valid tree and increments its revision", async () => {
  const store = new TreeStore();
  const result = await store.replace(0, root("Changed"));

  assert.equal(result.revision, 1);
  assert.equal(result.root.data.value, "Changed");
});

test("rejects a stale revision without changing the tree", async () => {
  const store = new TreeStore();
  await store.replace(0, root("First"));

  await assert.rejects(() => store.replace(0, root("Stale")), RevisionConflict);
  assert.equal(store.read().root.data.value, "First");
});

test("rejects duplicate node ids and invalid tagged values", async () => {
  const invalid = root();
  invalid.children.push({ id: "root", data: { kind: "number", value: "no" }, children: [] });
  const errors = validateTree(invalid);

  assert.ok(errors.some((error) => error.includes("duplicates")));
  assert.ok(errors.some((error) => error.includes("finite number")));
  await assert.rejects(() => new TreeStore().replace(0, invalid), InvalidTree);
});
