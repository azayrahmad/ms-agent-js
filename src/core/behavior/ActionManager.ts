import { AgentCore } from "../Core";
import type { AgentRequest } from "../base/types";

/**
 * Manager responsible for high-level character actions and movement coordination.
 */
export class ActionManager {
  private core: AgentCore;
  private setInstantPosition: (x: number, y: number) => void;

  constructor(
    core: AgentCore,
    setInstantPosition: (x: number, y: number) => void,
  ) {
    this.core = core;
    this.setInstantPosition = setInstantPosition;
  }

  /**
   * Makes the agent gesture at a specific screen position.
   */
  public gestureAt(x: number, y: number): AgentRequest {
    return this.enqueueRequest(async (_request) => {
      const direction = this.toAgentPerspective(this.getDirection(x, y, 4));
      const stateName = `Gesturing${direction}`;
      if (this.core.definition.states[stateName]) {
        await this.core.stateManager.setState(stateName);
      } else {
        const animName = `Gesture${direction}`;
        if (this.core.definition.animations[animName]) {
          await this.core.stateManager.playAnimation(animName, "Gesturing");
        }
      }
    });
  }

  /**
   * Makes the agent look at a specific screen position.
   */
  public lookAt(x: number, y: number): AgentRequest {
    return this.enqueueRequest(async (request) => {
      const direction = this.toAgentPerspective(this.getDirection(x, y, 8));
      const animName = `Look${direction}`;
      if (
        this.core.animationManager.currentAnimationName === animName &&
        this.core.animationManager.isAnimating
      ) {
        return;
      }
      if (this.core.definition.animations[animName]) {
        this.core.emit("animationStart" as any, animName);
        await this.core.stateManager.playAnimation(animName, "Looking");
        if (!request.isCancelled) {
          this.core.emit("animationEnd" as any, animName);
        }
      }
    });
  }

  /**
   * Moves the agent to a new screen position.
   */
  public moveTo(x: number, y: number, speed: number = 400): AgentRequest {
    return this.enqueueRequest(async (request) => {
      const startX = this.core.options.x;
      const startY = this.core.options.y;
      const dx = x - startX;
      const dy = y - startY;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < 1) {
        this.setInstantPosition(x, y);
        return;
      }

      const duration = (distance / speed) * 1000;
      const startTime = performance.now();
      const direction4 = this.getDirection(x, y, 4);
      const moveAnim = `Moving${direction4}`;
      let activeAnim = "";

      if (this.core.definition.animations[moveAnim]) {
        activeAnim = moveAnim;
      } else {
        const direction8 = this.toAgentPerspective(this.getDirection(x, y, 8));
        const lookAnim = `Look${direction8}`;
        if (this.core.definition.animations[lookAnim]) {
          activeAnim = lookAnim;
        }
      }

      if (activeAnim) {
        this.core.stateManager.playAnimation(activeAnim, "Moving");
      }

      return new Promise<void>((resolve) => {
        const moveStep = (currentTime: number) => {
          if (request.isCancelled) {
            if (activeAnim) this.core.stateManager.handleAnimationCompleted();
            resolve();
            return;
          }
          const elapsed = currentTime - startTime;
          const progress = Math.min(elapsed / duration, 1);
          const curX = startX + dx * progress;
          const curY = startY + dy * progress;
          this.setInstantPosition(curX, curY);
          if (progress < 1) {
            requestAnimationFrame(moveStep);
          } else {
            if (activeAnim) this.core.stateManager.handleAnimationCompleted();
            resolve();
          }
        };
        requestAnimationFrame(moveStep);
      });
    });
  }

  private enqueueRequest(
    task: (request: AgentRequest) => Promise<void>,
  ): AgentRequest {
    return this.core.requestQueue.add(async (request) => {
      this.core.emit("requestStart" as any, request);
      await task(request);
      this.core.emit("requestComplete" as any, request);
    });
  }

  /** Translates a world direction to the agent's POV (swaps Left/Right). */
  private toAgentPerspective(direction: string): string {
    return direction
      .replace("Left", "TEMP")
      .replace("Right", "Left")
      .replace("TEMP", "Right");
  }

  /** Calculates the direction from the agent to a target point. */
  public getDirection(
    targetX: number,
    targetY: number,
    numDirections: 4 | 8,
  ): string {
    const centerX =
      this.core.options.x +
      (this.core.definition.character.width * this.core.options.scale) / 2;
    const centerY =
      this.core.options.y +
      (this.core.definition.character.height * this.core.options.scale) / 2;
    const dx = targetX - centerX;
    const dy = targetY - centerY;
    const angle = Math.atan2(dy, dx);
    let degrees = angle * (180 / Math.PI);
    if (degrees < 0) degrees += 360;

    if (numDirections === 4) {
      if (degrees >= 315 || degrees < 45) return "Right";
      if (degrees >= 45 && degrees < 135) return "Down";
      if (degrees >= 135 && degrees < 225) return "Left";
      return "Up";
    } else {
      if (degrees >= 337.5 || degrees < 22.5) return "Right";
      if (degrees >= 22.5 && degrees < 67.5) return "DownRight";
      if (degrees >= 67.5 && degrees < 112.5) return "Down";
      if (degrees >= 112.5 && degrees < 157.5) return "DownLeft";
      if (degrees >= 157.5 && degrees < 202.5) return "Left";
      if (degrees >= 202.5 && degrees < 247.5) return "UpLeft";
      if (degrees >= 247.5 && degrees < 292.5) return "Up";
      return "UpRight";
    }
  }
}
