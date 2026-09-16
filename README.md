# Treeview frontend

A build-free tree editor made with browser-native Web Components. Each node
contains one text, number, or boolean value and may contain child nodes.

## Run

Start `project-auto-treeview-backend`, then run:

```sh
npm run serve
```

Open `http://localhost:4173`. The default API is `http://localhost:8787`; change
the `tree-api` meta tag in `index.html` for another deployment. Set `HOST` or
`PORT` to change the static server bind address.

Run model tests with `npm test`. The included `Dockerfile` runs the static
server as a non-root user. The complete frontend/backend setup is defined by
`compose.yaml` in `project-auto-treeview-contract`.

This frontend implements version `0.1.0` of `project-auto-treeview-contract`.
Merge the contract PR, then backend, then this frontend.
