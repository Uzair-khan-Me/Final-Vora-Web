import { AppError } from "./errors";
import { serverConfig } from "./config";

class CapacityGate {
  private active = 0;

  acquire() {
    if (this.active >= serverConfig.maxConcurrent) {
      throw new AppError(
        "CAPACITY_REACHED",
        "The server is at capacity. Wait for another download to finish and try again.",
        429,
      );
    }
    this.active += 1;
    let released = false;
    return () => {
      if (!released) {
        released = true;
        this.active = Math.max(0, this.active - 1);
      }
    };
  }

  get inUse() {
    return this.active;
  }
}

const state = globalThis as typeof globalThis & { __finalVoraCapacity?: CapacityGate };
export const capacity = (state.__finalVoraCapacity ??= new CapacityGate());
