export const apiClientConfig = {
  apiUrl: globalThis.location?.origin ?? "http://localhost:3000"
} as const;
