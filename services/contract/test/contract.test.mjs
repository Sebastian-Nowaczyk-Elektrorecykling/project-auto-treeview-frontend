import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const readJson = async (path) => JSON.parse(await readFile(path, "utf8"));

test("contract exposes the tree operations and recursive node schema", async () => {
  const spec = await readJson(new URL("../openapi.json", import.meta.url));

  assert.equal(spec.openapi, "3.1.0");
  assert.equal(spec.info.version, "0.1.0");
  assert.ok(spec.paths["/tree"].get);
  assert.ok(spec.paths["/tree"].put);
  assert.equal(
    spec.components.schemas.TreeNode.properties.children.items.$ref,
    "#/components/schemas/TreeNode"
  );
  assert.equal(spec.components.schemas.Datum.oneOf.length, 3);
});

test("example uses all datum variants and unique node ids", async () => {
  const snapshot = await readJson(new URL("../examples/tree.json", import.meta.url));
  const nodes = [snapshot.root, ...snapshot.root.children];

  assert.deepEqual(nodes.map((node) => node.data.kind), ["text", "number", "boolean"]);
  assert.equal(new Set(nodes.map((node) => node.id)).size, nodes.length);
  assert.ok(Number.isInteger(snapshot.revision));
});
