import assert from "node:assert/strict";
import test from "node:test";
import { addChild, changeKind, changeValue, countNodes, createNode, removeNode } from "../src/tree-model.mjs";

const root = () => createNode("text", "root");

test("adds typed children without mutating the source tree", () => {
  const original = root();
  const next = addChild(original, "root", createNode("number", "temperature"));

  assert.equal(original.children.length, 0);
  assert.equal(next.children[0].data.kind, "number");
  assert.equal(countNodes(next), 2);
});

test("changes kind and value in a nested node", () => {
  const tree = addChild(root(), "root", createNode("text", "enabled"));
  const typed = changeKind(tree, "enabled", "boolean");
  const changed = changeValue(typed, "enabled", true);

  assert.deepEqual(changed.children[0].data, { kind: "boolean", value: true });
  assert.deepEqual(tree.children[0].data, { kind: "text", value: "" });
});

test("removes a subtree and protects the root", () => {
  const branch = addChild(createNode("text", "branch"), "branch", createNode("text", "leaf"));
  const tree = addChild(root(), "root", branch);

  assert.equal(countNodes(removeNode(tree, "branch")), 1);
  assert.throws(() => removeNode(tree, "root"), /cannot be removed/);
});
