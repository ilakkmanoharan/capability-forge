export type Owner = "automation" | "paused" | "human" | "completed" | "failed";
// Ownership primitive only. The browser executor must also drain in-flight work.
export class SessionControl {
  #owner: Owner = "automation";
  #epoch = 0;
  get owner(): Owner { return this.#owner; }
  get token(): number { return this.#epoch; }
  assertAutomation(token: number): void {
    if (this.#owner !== "automation" || token !== this.#epoch)
      throw new Error("stale_or_unowned_action");
  }
  pause(): void { this.#move("automation", "paused"); }
  claimHuman(): void { this.#move("paused", "human"); }
  releaseHuman(): void { this.#move("human", "paused"); }
  // Caller verifies a resume checkpoint before this transition.
  resume(): void { this.#move("paused", "automation"); }
  complete(): void { this.#move("automation", "completed"); }
  fail(): void { if(this.#owner === "completed" || this.#owner === "failed") throw new Error("invalid_control_transition"); this.#owner="failed"; this.#epoch+=1; }
  #move(expected: Owner, next: Owner): void {
    if (this.#owner !== expected) throw new Error("invalid_control_transition");
    this.#owner = next;
    this.#epoch += 1;
  }
}
