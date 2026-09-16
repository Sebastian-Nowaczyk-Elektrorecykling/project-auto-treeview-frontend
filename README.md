# Treeview frontend

A build-free tree editor made with browser-native Web Components. Each node
contains one text, number, or boolean value and may contain child nodes.

## Run the complete application

Clone this repository and run:

```sh
docker compose up --build
```

Open `http://localhost:4173`. The API is available at
`http://localhost:8787`, and tree data is retained in the `tree-data` volume.
The contract tests must pass before the backend starts; the frontend waits for
the backend health check. Stop the application with `docker compose down`, or
also remove saved tree data with `docker compose down --volumes`.

The complete contract and backend source is kept under `services/`, so no other
repository checkout is required.

## Run only the frontend

```sh
npm run serve
```

The default API is `http://localhost:8787`; change the `tree-api` meta tag in
`index.html` for another deployment. Set `HOST` or `PORT` to change the static
server bind address. Run model tests with `npm test`.
