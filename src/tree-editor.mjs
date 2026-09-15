import { addChild, changeKind, changeValue, countNodes, createNode, removeNode } from "./tree-model.mjs";

const apiUrl = document.querySelector('meta[name="tree-api"]')?.content.replace(/\/$/, "") ?? "";

class TreeEditor extends HTMLElement {
  #snapshot = null;
  #dirty = false;
  #message = "Loading tree";
  #messageKind = "neutral";

  connectedCallback() {
    this.load();
  }

  async load() {
    this.#setMessage("Loading tree", "neutral");
    try {
      const response = await fetch(`${apiUrl}/tree`);
      if (!response.ok) throw new Error(`API returned ${response.status}`);
      this.#snapshot = await response.json();
      this.#dirty = false;
      this.#setMessage("Up to date", "success");
    } catch (error) {
      this.#snapshot = null;
      this.#setMessage(`Could not load: ${error.message}`, "error");
    }
    this.render();
  }

  async save() {
    if (!this.#snapshot || !this.#dirty) return;
    this.#setMessage("Saving", "neutral");
    try {
      const response = await fetch(`${apiUrl}/tree`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          expectedRevision: this.#snapshot.revision,
          root: this.#snapshot.root,
        }),
      });
      const body = await response.json();
      if (response.status === 409) {
        this.#setMessage("Newer changes exist. Reload before saving.", "error");
        this.render();
        return;
      }
      if (!response.ok) throw new Error(body.message ?? `API returned ${response.status}`);
      this.#snapshot = body;
      this.#dirty = false;
      this.#setMessage("Saved", "success");
    } catch (error) {
      this.#setMessage(`Could not save: ${error.message}`, "error");
    }
    this.render();
  }

  #setMessage(message, kind) {
    this.#message = message;
    this.#messageKind = kind;
    const status = this.querySelector("[data-status]");
    if (status) {
      status.textContent = message;
      status.dataset.kind = kind;
    }
  }

  #change(mutator, shouldRender = true) {
    this.#snapshot.root = mutator(this.#snapshot.root);
    this.#dirty = true;
    this.#setMessage("Unsaved changes", "warning");
    if (shouldRender) this.render();
  }

  render() {
    this.replaceChildren();
    const toolbar = document.createElement("section");
    toolbar.className = "toolbar";

    const summary = document.createElement("div");
    summary.className = "summary";
    const heading = document.createElement("h1");
    heading.textContent = "Data tree";
    const meta = document.createElement("p");
    meta.textContent = this.#snapshot
      ? `${countNodes(this.#snapshot.root)} nodes / revision ${this.#snapshot.revision}`
      : "No snapshot loaded";
    summary.append(heading, meta);

    const actions = document.createElement("div");
    actions.className = "toolbar-actions";
    const status = document.createElement("span");
    status.className = "status";
    status.dataset.status = "";
    status.dataset.kind = this.#messageKind;
    status.setAttribute("role", "status");
    status.textContent = this.#message;
    const reload = this.#button("Reload", () => this.load(), "secondary");
    const save = this.#button("Save tree", () => this.save(), "primary");
    save.disabled = !this.#dirty;
    actions.append(status, reload, save);
    toolbar.append(summary, actions);
    this.append(toolbar);

    if (!this.#snapshot) {
      const empty = document.createElement("p");
      empty.className = "empty-state";
      empty.textContent = "Start the Treeview API, then reload this page.";
      this.append(empty);
      return;
    }

    const tree = document.createElement("ol");
    tree.className = "tree tree-root";
    tree.setAttribute("aria-label", "Editable data tree");
    tree.append(this.#renderNode(this.#snapshot.root, true));
    this.append(tree);
  }

  #renderNode(node, isRoot) {
    const item = document.createElement("li");
    const row = document.createElement("div");
    row.className = "node-row";

    const id = document.createElement("code");
    id.className = "node-id";
    id.textContent = node.id;

    const kind = document.createElement("select");
    kind.className = "kind-select";
    kind.setAttribute("aria-label", `Type for ${node.id}`);
    for (const value of ["text", "number", "boolean"]) {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = value;
      option.selected = value === node.data.kind;
      kind.append(option);
    }
    kind.addEventListener("change", () => this.#change((root) => changeKind(root, node.id, kind.value)));

    const value = this.#valueControl(node);
    const add = this.#iconButton("+", `Add child to ${node.id}`, () => {
      this.#change((root) => addChild(root, node.id, createNode("text")));
    });
    row.append(id, kind, value, add);

    if (!isRoot) {
      row.append(this.#iconButton("x", `Delete ${node.id} and its children`, () => {
        this.#change((root) => removeNode(root, node.id));
      }, "danger"));
    }
    item.append(row);

    if (node.children.length) {
      const children = document.createElement("ol");
      children.className = "tree";
      for (const child of node.children) children.append(this.#renderNode(child, false));
      item.append(children);
    }
    return item;
  }

  #valueControl(node) {
    if (node.data.kind === "boolean") {
      const label = document.createElement("label");
      label.className = "boolean-control";
      const input = document.createElement("input");
      input.type = "checkbox";
      input.checked = node.data.value;
      input.addEventListener("change", () => this.#change((root) => changeValue(root, node.id, input.checked), false));
      label.append(input, document.createTextNode(input.checked ? "true" : "false"));
      input.addEventListener("change", () => {
        label.lastChild.textContent = input.checked ? "true" : "false";
      });
      return label;
    }

    const input = document.createElement("input");
    input.className = "value-input";
    input.type = node.data.kind === "number" ? "number" : "text";
    input.value = node.data.value;
    input.setAttribute("aria-label", `Value for ${node.id}`);
    input.addEventListener("input", () => {
      const value = node.data.kind === "number" ? input.valueAsNumber : input.value;
      if (node.data.kind === "number" && !Number.isFinite(value)) return;
      this.#change((root) => changeValue(root, node.id, value), false);
    });
    return input;
  }

  #button(label, action, variant) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `button ${variant}`;
    button.textContent = label;
    button.addEventListener("click", action);
    return button;
  }

  #iconButton(label, title, action, variant = "secondary") {
    const button = this.#button(label, action, `icon-button ${variant}`);
    button.title = title;
    button.setAttribute("aria-label", title);
    return button;
  }
}

customElements.define("tree-editor", TreeEditor);
