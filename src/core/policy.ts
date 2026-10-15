import type { ActionType } from "./contracts.ts";
export type Policy = { origins: string[]; routes: RegExp[]; actions: ActionType[] };
export function enforcePolicy(policy: Policy, action: {
  url: string; type: ActionType; risk: "reversible" | "irreversible";
}): void {
  let url: URL;
  try { url = new URL(action.url); } catch { throw new Error("invalid_url"); }
  if (url.username || url.password) throw new Error("credential_url_blocked");
  if (!policy.origins.includes(url.origin)) throw new Error("origin_blocked");
  // Clone matchers so repeated execution and caller state cannot affect policy.
  if (!policy.routes.some(rule => new RegExp(rule.source, rule.flags).test(url.pathname)))
    throw new Error("route_blocked");
  if (!policy.actions.includes(action.type)) throw new Error("action_blocked");
  if (action.risk !== "reversible" && action.risk !== "irreversible")
    throw new Error("invalid_risk");
  if (action.risk === "irreversible") throw new Error("irreversible_action_blocked");
}
