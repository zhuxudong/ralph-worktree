export class CircuitBreaker {
  private noProgressCount = 0;
  private lastError = "";
  private sameErrorCount = 0;
  private state: "closed" | "open" = "closed";

  record(r: { hasChanges: boolean; error?: string }) {
    this.noProgressCount = r.hasChanges ? 0 : this.noProgressCount + 1;

    if (r.error && r.error === this.lastError) {
      this.sameErrorCount++;
    } else {
      this.lastError = r.error ?? "";
      this.sameErrorCount = r.error ? 1 : 0;
    }

    if (this.noProgressCount >= 3 || this.sameErrorCount >= 5) {
      this.state = "open";
    }
  }

  isOpen(): boolean {
    return this.state === "open";
  }

  reset() {
    this.noProgressCount = 0;
    this.lastError = "";
    this.sameErrorCount = 0;
    this.state = "closed";
  }
}
