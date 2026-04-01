import nodeFetch from "node-fetch";

export const httpFetch = typeof globalThis.fetch === "function" ? globalThis.fetch : nodeFetch;