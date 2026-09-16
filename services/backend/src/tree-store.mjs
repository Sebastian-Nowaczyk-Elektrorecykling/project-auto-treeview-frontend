import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

export const LIMITS = Object.freeze({
  maxChildren: 100,
  maxDepth: 32,
  maxNodes: 5_000,
  maxTextLength: 10_000,
});

const NODE_ID = /^[A-Za-z0-9_-]{1,64}$/;

export const initialSnapshot = () => ({
  revision: 0,
  root: {
    id: "root",
    data: { kind: "text", value: "Root" },
    children: [],
  },
});

const clone = (value) => structuredClone(value);

export function validateTree(root) {
  const errors = [];
  const ids = new Set();
  let nodeCount = 0;

  const visit = (node, path, depth) => {
    nodeCount += 1;
    if (nodeCount > LIMITS.maxNodes) {
      errors.push(`tree exceeds ${LIMITS.maxNodes} nodes`);
      return;
    }
    if (depth > LIMITS.maxDepth) {
      errors.push(`${path} exceeds maximum depth ${LIMITS.maxDepth}`);
      return;
    }
    if (!node || typeof node !== "object" || Array.isArray(node)) {
      errors.push(`${path} must be an object`);
      return;
    }
    const keys = Object.keys(node).sort();
    if (keys.join(",") !== "children,data,id") {
      errors.push(`${path} must contain only id, data, and children`);
    }
    if (typeof node.id !== "string" || !NODE_ID.test(node.id)) {
      errors.push(`${path}.id is invalid`);
    } else if (ids.has(node.id)) {
      errors.push(`${path}.id duplicates ${node.id}`);
    } else {
      ids.add(node.id);
    }

    validateDatum(node.data, `${path}.data`, errors);

    if (!Array.isArray(node.children)) {
      errors.push(`${path}.children must be an array`);
      return;
    }
    if (node.children.length > LIMITS.maxChildren) {
      errors.push(`${path}.children exceeds ${LIMITS.maxChildren} items`);
      return;
    }
    node.children.forEach((child, index) => visit(child, `${path}.children[${index}]`, depth + 1));
  };

  visit(root, "root", 1);
  return errors;
}

function validateDatum(data, path, errors) {
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    errors.push(`${path} must be an object`);
    return;
  }
  if (Object.keys(data).sort().join(",") !== "kind,value") {
    errors.push(`${path} must contain only kind and value`);
  }
  if (data.kind === "text") {
    if (typeof data.value !== "string" || data.value.length > LIMITS.maxTextLength) {
      errors.push(`${path}.value must be text no longer than ${LIMITS.maxTextLength} characters`);
    }
  } else if (data.kind === "number") {
    if (typeof data.value !== "number" || !Number.isFinite(data.value)) {
      errors.push(`${path}.value must be a finite number`);
    }
  } else if (data.kind === "boolean") {
    if (typeof data.value !== "boolean") {
      errors.push(`${path}.value must be boolean`);
    }
  } else {
    errors.push(`${path}.kind must be text, number, or boolean`);
  }
}

export class RevisionConflict extends Error {
  constructor(currentRevision) {
    super(`Expected revision does not match current revision ${currentRevision}`);
    this.currentRevision = currentRevision;
  }
}

export class InvalidTree extends Error {
  constructor(errors) {
    super(errors.join("; "));
    this.errors = errors;
  }
}

export class TreeStore {
  #filePath;
  #snapshot = initialSnapshot();
  #writeQueue = Promise.resolve();

  constructor(filePath = null) {
    this.#filePath = filePath;
  }

  async load() {
    if (!this.#filePath) return this.read();
    try {
      const stored = JSON.parse(await readFile(this.#filePath, "utf8"));
      const errors = validateTree(stored.root);
      if (!Number.isInteger(stored.revision) || stored.revision < 0 || errors.length) {
        throw new Error(`Stored tree is invalid: ${errors.join("; ")}`);
      }
      this.#snapshot = clone(stored);
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
    return this.read();
  }

  read() {
    return clone(this.#snapshot);
  }

  replace(expectedRevision, root) {
    const operation = this.#writeQueue.then(async () => {
      if (!Number.isInteger(expectedRevision) || expectedRevision < 0) {
        throw new InvalidTree(["expectedRevision must be a non-negative integer"]);
      }
      if (expectedRevision !== this.#snapshot.revision) {
        throw new RevisionConflict(this.#snapshot.revision);
      }
      const errors = validateTree(root);
      if (errors.length) throw new InvalidTree(errors);

      const next = { revision: this.#snapshot.revision + 1, root: clone(root) };
      if (this.#filePath) await persistAtomically(this.#filePath, next);
      this.#snapshot = next;
      return this.read();
    });
    this.#writeQueue = operation.catch(() => {});
    return operation;
  }
}

async function persistAtomically(filePath, snapshot) {
  await mkdir(dirname(filePath), { recursive: true });
  const temporaryPath = `${filePath}.${process.pid}.tmp`;
  await writeFile(temporaryPath, `${JSON.stringify(snapshot, null, 2)}\n`, "utf8");
  await rename(temporaryPath, filePath);
}
