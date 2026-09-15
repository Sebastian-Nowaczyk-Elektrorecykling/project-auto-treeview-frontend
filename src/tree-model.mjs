const defaults = Object.freeze({ text: "", number: 0, boolean: false });

export function createNode(kind = "text", id = globalThis.crypto.randomUUID()) {
  if (!(kind in defaults)) throw new TypeError(`Unsupported datum kind: ${kind}`);
  return { id, data: { kind, value: defaults[kind] }, children: [] };
}

export function updateNode(root, id, update) {
  if (root.id === id) return update(structuredClone(root));
  let changed = false;
  const children = root.children.map((child) => {
    const next = updateNode(child, id, update);
    if (next !== child) changed = true;
    return next;
  });
  return changed ? { ...root, children } : root;
}

export function addChild(root, parentId, child) {
  return updateNode(root, parentId, (parent) => ({
    ...parent,
    children: [...parent.children, structuredClone(child)],
  }));
}

export function removeNode(root, id) {
  if (root.id === id) throw new Error("The root node cannot be removed");
  const children = root.children
    .filter((child) => child.id !== id)
    .map((child) => removeNode(child, id));
  if (children.length === root.children.length && children.every((child, index) => child === root.children[index])) {
    return root;
  }
  return { ...root, children };
}

export function changeKind(root, id, kind) {
  if (!(kind in defaults)) throw new TypeError(`Unsupported datum kind: ${kind}`);
  return updateNode(root, id, (node) => ({ ...node, data: { kind, value: defaults[kind] } }));
}

export function changeValue(root, id, value) {
  return updateNode(root, id, (node) => ({ ...node, data: { ...node.data, value } }));
}

export function countNodes(root) {
  return 1 + root.children.reduce((sum, child) => sum + countNodes(child), 0);
}
