import index from "./index.html";

const backendUrl = process.env.PROXUS_API_URL ?? "http://localhost:3000";
const port = Number(process.env.PORT ?? "5173");

Bun.serve({
  port,
  routes: {
    "/": index,
    "/api/*": async (request) => {
      const url = new URL(request.url);
      const target = new URL(`${url.pathname}${url.search}`, backendUrl);
      return fetch(target, request);
    }
  },
  development: {
    hmr: true,
    console: true
  }
});

console.log(`Web app listening on http://localhost:${port}`);
console.log(`Proxying /api requests to ${backendUrl}`);
