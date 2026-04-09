import {
  type FrameDefinition,
  type Animation,
} from '../base/types';
import type { SpriteManager } from '../resources/SpriteManager';
import type { AudioManager } from '../resources/AudioManager';
import { EventEmitter } from '../base/EventEmitter';
import { Machine, type MachineConfig } from './StateMachine';

/**
 * Context for the animation state machine.
 */
export interface AnimationContext {
  /** The currently playing animation definition. */
  currentAnimation: Animation | null;
  /** The 0-based index of the current frame in the current animation. */
  currentFrameIndex: number;
  /** Timestamp (from performance.now()) when the current frame was first displayed. */
  lastFrameTime: number;
  /** A reference to the last valid (non-null) frame rendered, used as a buffer during logic frames. */
  lastRenderedFrame: FrameDefinition | null;
  /** Whether the current animation should loop back to the beginning instead of finishing. */
  isLooping: boolean;
  /** Internal promise controls for the currently playing animation. */
  animationPromise: { resolve: (val: boolean) => void; reject: (err: any) => void } | null;
  /** Set of frame indices visited during the current exit sequence to detect and break infinite loops. */
  exitHistory: Set<number>;
  /** The base name of a transition-type 2 animation sequence. */
  baseAnimationName?: string;
  /** The associated "Continued" animation for type 2 sequences. */
  continuedAnimationName?: string;
  /** The associated "Return" animation for type 2 sequences. */
  returnAnimationName?: string;
  /** Whether we are currently playing the "Return" animation of a type 2 sequence. */
  isProcessingReturn?: boolean;
}

/**
 * Events that the AnimationManager state machine can process.
 */
export type AnimationEvent =
  | { type: 'PLAY'; animation: Animation; useExitBranch?: boolean; loop?: boolean }
  | { type: 'TICK'; currentTime: number }
  | { type: 'INTERRUPT' }
  | { type: 'STOP' };

/**
 * AnimationManager class for handling low-level frame timing, branching, and sound synchronization.
 * It manages the progression through an animation's frame sequence and handles probabilistic branching.
 */
export class AnimationManager extends EventEmitter<any> {
  private spriteManager: SpriteManager;
  private audioManager: AudioManager;
  /** Dictionary of all available animations for this character. */
  private animations: Record<string, Animation>;
  /** Internal state machine for playback logic. */
  private machine: Machine<AnimationContext, AnimationEvent>;
  /** The promise for the active animation playback. */
  private activePromise: Promise<boolean> | null = null;
  /** Default scaling factor (usually overwritten by the Agent's options). */
  private scale: number = 2;
  /** The current mouth shape overlay (viseme). */
  private currentViseme: string | null = null;

  /**
   * The name of the animation currently being played.
   */
  public get currentAnimationName(): string {
    return this.machine.context.currentAnimation?.name || '';
  }

  /**
   * Whether the manager is currently in the process of exiting an animation.
   */
  public get isExitingFlag(): boolean {
    return this.machine.state === 'Exiting';
  }

  public set isExitingFlag(value: boolean) {
    if (value && this.machine.state === 'Playing') {
      this.machine.send({ type: 'INTERRUPT' });
    }
  }

  /**
   * The index of the frame currently being processed.
   */
  public get currentFrameIndexValue(): number {
    return this.machine.context.currentFrameIndex;
  }

  /**
   * The current playback state of the manager (Idle, Playing, or Exiting).
   */
  public get playbackState(): string {
    return this.machine.state;
  }

  /**
   * @param spriteManager - Manager for character image rendering.
   * @param audioManager - Manager for character sound playback.
   * @param animations - Record of animation definitions.
   */
  constructor(
    spriteManager: SpriteManager,
    audioManager: AudioManager,
    animations: Record<string, Animation>,
  ) {
    super();
    this.spriteManager = spriteManager;
    this.audioManager = audioManager;
    this.animations = animations;

    const machineConfig: MachineConfig<AnimationContext, AnimationEvent> = {
      initial: 'Idle',
      context: {
        currentAnimation: null,
        currentFrameIndex: 0,
        lastFrameTime: 0,
        lastRenderedFrame: null,
        isLooping: false,
        animationPromise: null,
        exitHistory: new Set(),
      },
      states: {
        Idle: {
          on: {
            PLAY: [
              { target: 'Exiting', cond: 'shouldStartExiting', actions: ['setupAnimation'] },
              { target: 'Playing', actions: ['setupAnimation'] },
            ],
          },
        },
        Playing: {
          on: {
            TICK: { actions: ['processTick'] },
            INTERRUPT: 'Exiting',
            STOP: 'Idle',
            PLAY: [
              { target: 'Exiting', cond: 'shouldStartExiting', actions: ['setupAnimation'] },
              { target: 'Playing', actions: ['setupAnimation'] },
            ],
          },
        },
        Exiting: {
          on: {
            TICK: { actions: ['processTick'] },
            STOP: 'Idle',
            PLAY: [
              { target: 'Exiting', cond: 'shouldStartExiting', actions: ['setupAnimation'] },
              { target: 'Playing', actions: ['setupAnimation'] },
            ],
          },
        },
      },
    };

    this.machine = new Machine(machineConfig, {
      guards: {
        shouldStartExiting: (_, event) => event.type === 'PLAY' && !!event.useExitBranch,
      },
      actions: {
        setupAnimation: (ctx, event) => {
          if (event.type !== 'PLAY') return;

          const isSequenceTransition =
            event.animation.name === ctx.continuedAnimationName ||
            event.animation.name === ctx.returnAnimationName;

          if (!isSequenceTransition) {
            ctx.baseAnimationName = undefined;
            ctx.continuedAnimationName = undefined;
            ctx.returnAnimationName = undefined;
            ctx.isProcessingReturn = false;
          }

          const previousAnimation = ctx.currentAnimation?.name || '';
          ctx.currentAnimation = event.animation;
          ctx.currentFrameIndex = 0;
          ctx.lastFrameTime = performance.now();
          ctx.isLooping = !!event.loop;
          ctx.exitHistory.clear();

          // Handle transitionType 2 (Return mechanism)
          if (
            event.animation.transitionType === 2 &&
            !ctx.baseAnimationName &&
            !ctx.isProcessingReturn
          ) {
            const baseName = event.animation.name;
            const continuedName = this.findAnimationCaseInsensitive(baseName + 'Continued');
            const returnName = this.findAnimationCaseInsensitive(baseName + 'Return');

            if (continuedName && returnName) {
              ctx.baseAnimationName = baseName;
              ctx.continuedAnimationName = continuedName;
              ctx.returnAnimationName = returnName;
            }
          }

          if (previousAnimation && previousAnimation !== event.animation.name) {
            this.emit('animationCompleted', previousAnimation);
          }
          this.emit('animationStarted', event.animation.name);

          // Play sound for the first frame if it has one
          this.checkAndPlaySound(ctx.currentAnimation.frames[0]);
        },
        processTick: (ctx, event) => {
          if (event.type !== 'TICK') return;
          this.runTick(ctx, event.currentTime);
        },
      },
    });
  }

  /**
   * Returns whether a specific animation (or the current one) contains any frames with mouth overlays.
   *
   * @param animationName - The name of the animation to check. Defaults to the current animation.
   */
  public supportsSpeech(animationName?: string): boolean {
    const name = animationName || this.currentAnimationName;
    const animation = this.animations[name];
    if (!animation) return false;
    return animation.frames.some((f) => !!f.mouths && f.mouths.length > 0);
  }

  /**
   * Returns whether the frame currently being processed has mouth overlays.
   */
  public currentFrameHasMouths(): boolean {
    const frame = this.currentFrame;
    return !!frame?.mouths && frame.mouths.length > 0;
  }

  /**
   * Internal logic for processing an animation tick, separated from the machine action for clarity.
   */
  private runTick(ctx: AnimationContext, currentTime: number): void {
    if (!ctx.currentAnimation || ctx.currentAnimation.frames.length === 0) return;

    let safetyCounter = 0;
    const MAX_NULL_FRAMES = 100;

    while (ctx.currentAnimation && safetyCounter <= MAX_NULL_FRAMES) {
      const currentFrame = ctx.currentAnimation.frames[ctx.currentFrameIndex];

      if (currentFrame.duration === 0) {
        const { index: nextIndex, isBranch } = this.getNextFrameDetails(ctx, currentFrame);

        if (!isBranch && ctx.currentAnimation?.transitionType === 1 && this.machine.state !== 'Exiting') {
          break;
        }

        if (this.checkAnimationCompletion(ctx, currentFrame, nextIndex, isBranch)) return;

        ctx.currentFrameIndex = nextIndex;
        ctx.lastFrameTime = currentTime;
        this.emit('frameChanged');
        this.checkAndPlaySound(ctx.currentAnimation.frames[ctx.currentFrameIndex]);

        safetyCounter++;
        if (safetyCounter > MAX_NULL_FRAMES) {
          console.warn(
            `MSAgentJS: Infinite loop detected in animation '${ctx.currentAnimation?.name}'. Safety break at frame ${ctx.currentFrameIndex}.`,
          );
          break;
        }
        continue;
      }

      if (currentTime - ctx.lastFrameTime >= currentFrame.duration * 10) {
        const { index: nextIndex, isBranch } = this.getNextFrameDetails(ctx, currentFrame);

        if (this.checkAnimationCompletion(ctx, currentFrame, nextIndex, isBranch)) return;

        ctx.currentFrameIndex = nextIndex;
        ctx.lastFrameTime = currentTime;

        this.emit('frameChanged');
        this.checkAndPlaySound(ctx.currentAnimation.frames[ctx.currentFrameIndex]);

        safetyCounter++;
        continue;
      }

      break;
    }
  }

  /**
   * Returns the frame definition that should currently be rendered.
   * Handles "null frames" (duration 0) by returning the last valid rendered frame instead.
   */
  public get currentFrame(): FrameDefinition | null {
    const ctx = this.machine.context;
    if (!ctx.currentAnimation || ctx.currentAnimation.frames.length === 0) {
      return ctx.lastRenderedFrame;
    }
    const frame = ctx.currentAnimation.frames[ctx.currentFrameIndex];
    // Don't display frames with duration 0 (logic frames); stick to the last valid one.
    if (frame.duration === 0) {
      return ctx.lastRenderedFrame;
    }
    return frame;
  }

  /**
   * Whether an animation is currently active and updating.
   */
  public get isAnimating(): boolean {
    return this.machine.state !== 'Idle';
  }

  /**
   * Sets the current animation and starts its playback immediately.
   * Does not wait for completion or return a promise.
   *
   * @param animationName - The name of the animation to set.
   * @param useExitBranch - Whether to initialize the animation in an "exiting" state.
   * @param loop - Whether the animation should loop back to frame 0 instead of completing.
   */
  public setAnimation(
    animationName: string,
    useExitBranch: boolean = false,
    loop: boolean = false,
  ): void {
    const animation = this.animations[animationName];
    if (animation) {
      this.machine.send({ type: 'PLAY', animation, useExitBranch, loop });
      this.update(this.machine.context.lastFrameTime);
    } else {
      this.machine.send({ type: 'STOP' });
    }
  }

  /**
   * Plays an animation and returns a promise that resolves when it's done.
   *
   * @param animationName - The name of the animation to play.
   * @param useExitBranch - Whether to start in an "exiting" state.
   * @param loop - Whether the animation should loop back to frame 0 instead of completing.
   * @returns A promise that resolves to true when the animation finishes.
   */
  public async playAnimation(
    animationName: string,
    useExitBranch: boolean = false,
    loop: boolean = false,
  ): Promise<boolean> {
    this.activePromise = new Promise((resolve, reject) => {
      this.machine.context.animationPromise = { resolve, reject };
      this.setAnimation(animationName, useExitBranch, loop);
    });
    return this.activePromise;
  }

  /**
   * Updates the animation frame based on elapsed time.
   * This is called on every animation frame (e.g., from the Agent's main loop).
   * It handles frame timing, sound triggers, and instant "null frame" (logic frame) fast-forwarding.
   *
   * @param currentTime - The current performance timestamp.
   */
  public update(currentTime: number = performance.now()): void {
    this.machine.send({ type: 'TICK', currentTime });
  }

  /**
   * Sets the current mouth shape (viseme) to overlay on the animation.
   *
   * @param type - The name of the mouth shape (e.g., 'Closed', 'OpenWide1').
   */
  public setViseme(type: string | null): void {
    this.currentViseme = type;
  }

  /**
   * Checks if the current animation should be marked as complete.
   * Completions occur either at the end of the frame sequence or when an exit branch loops back.
   */
  private checkAnimationCompletion(
    ctx: AnimationContext,
    currentFrame: FrameDefinition,
    nextFrameIndex: number,
    isBranch: boolean,
  ): boolean {
    const isExiting = this.machine.state === 'Exiting';

    if (isExiting) {
      // If we are exiting and reached the end (either by natural end or exit branch loop back to frame 0)
      if (nextFrameIndex === 0) {
        // Handle transitionType 2 (Return mechanism)
        if (ctx.returnAnimationName && !ctx.isProcessingReturn) {
          const returnAnim = this.animations[ctx.returnAnimationName];
          if (returnAnim) {
            ctx.isProcessingReturn = true;
            // Stay in Exiting state for the return animation
            this.machine.send({ type: 'PLAY', animation: returnAnim, useExitBranch: true });
            return true;
          }
        }
        this.completeAnimation(ctx);
        return true;
      }
    } else {
      // If NOT yet exiting, check if we've reached a 0-duration frame with an exit branch.
      // In Microsoft Agent transition type 1, these act as "terminal" pause frames.
      // If we reach one during normal sequential playback, we force an exit.
      if (
        ctx.currentAnimation?.transitionType === 1 &&
        currentFrame.duration === 0 &&
        currentFrame.exitBranch !== undefined &&
        !isBranch
      ) {
        this.machine.send({ type: 'INTERRUPT' });
        return false;
      }

      // Normal completion when we loop back to the first frame sequentially
      if (!isBranch && nextFrameIndex === 0) {
        // Handle transitionType 2 (Return mechanism) - Move to Continued
        if (ctx.continuedAnimationName && ctx.currentAnimation?.name === ctx.baseAnimationName) {
          const continuedAnim = this.animations[ctx.continuedAnimationName];
          if (continuedAnim) {
            this.machine.send({ type: 'PLAY', animation: continuedAnim, loop: true });
            return true;
          }
        }

        if (ctx.animationPromise) {
          if (ctx.isLooping) {
            // Instead of completing, we just loop back (which nextFrameIndex 0 already does)
            return false;
          }
          this.completeAnimation(ctx);
          return true;
        }
      }
    }
    return false;
  }

  /**
   * Determines the next frame index to jump to, considering exit branches and probabilities.
   */
  private getNextFrameDetails(
    ctx: AnimationContext,
    currentFrame: FrameDefinition,
  ): {
    index: number;
    isBranch: boolean;
  } {
    // Sequential next index calculation.
    const sequentialNext = (ctx.currentFrameIndex + 1) % ctx.currentAnimation!.frames.length;

    const isExiting = this.machine.state === 'Exiting';

    // If exiting, prioritize the exit branch if it exists
    if (isExiting) {
      // Check if we've already visited this frame in the current exit sequence
      if (ctx.exitHistory.has(ctx.currentFrameIndex)) {
        // Break the loop by falling back to sequential playback
        return { index: sequentialNext, isBranch: false };
      }
      ctx.exitHistory.add(ctx.currentFrameIndex);

      if (currentFrame.exitBranch !== undefined) {
        return { index: currentFrame.exitBranch - 1, isBranch: true };
      }
      // If the current frame has no exit branch but is a 0-duration frame (logic frame),
      // fallback to the exit branch of the last frame that was actually rendered.
      if (currentFrame.duration === 0 && ctx.lastRenderedFrame?.exitBranch !== undefined) {
        return { index: ctx.lastRenderedFrame.exitBranch - 1, isBranch: true };
      }
    }

    // If exiting, we still want to follow "forward" branches that take us closer to the end
    // (frame 0). If no forward branches exist, we ignore branching to break loops.
    const branching = currentFrame.branching || [];
    const useBranchingWhileExiting =
      isExiting &&
      branching.some((b) => b.branchTo - 1 > ctx.currentFrameIndex || b.branchTo - 1 === 0);

    if (branching.length > 0 && (!isExiting || useBranchingWhileExiting)) {
      const randomValue = Math.floor(Math.random() * 100);
      let cumulative = 0;

      for (const branch of branching) {
        // If exiting, only consider forward-leading branches
        if (isExiting) {
          const isForward =
            branch.branchTo - 1 > ctx.currentFrameIndex ||
            (branch.branchTo - 1 === 0 && ctx.currentFrameIndex > 0);
          if (!isForward) continue;
        }

        cumulative += branch.probability;
        if (randomValue < cumulative) {
          return { index: branch.branchTo - 1, isBranch: true };
        }
      }
    }

    // Default to sequential playback (wrapping around to 0)
    return { index: sequentialNext, isBranch: false };
  }

  /**
   * Interrupts the current animation and plays a new one.
   * If the current animation has an exit sequence, it will wait for that sequence to complete first.
   *
   * @param newAnimationName - The name of the animation to start.
   * @param useExitBranch - Whether the new animation should start in an exiting state.
   * @param loop - Whether the new animation should loop.
   * @returns A promise that resolves when the *new* animation finishes.
   */
  public async interruptAndPlayAnimation(
    newAnimationName: string,
    useExitBranch: boolean = false,
    loop: boolean = false,
  ): Promise<boolean> {
    if (!this.isAnimating) {
      return this.playAnimation(newAnimationName, useExitBranch, loop);
    }

    // If there is no promise to wait for (e.g. started via setAnimation/Idling),
    // create one so we can await the exit sequence.
    if (!this.activePromise) {
      this.activePromise = new Promise((resolve, reject) => {
        this.machine.context.animationPromise = { resolve, reject };
      });
    }

    // Signal the current animation to interrupt and navigate towards its neutral frame via exit branches
    this.isExitingFlag = true;

    // Wait for current animation to complete its exit sequence
    if (this.activePromise) {
      await this.activePromise;
    }

    // Play the new animation
    return this.playAnimation(newAnimationName, useExitBranch, loop);
  }

  /**
   * Finds an animation name in the character definition using case-insensitive search.
   */
  private findAnimationCaseInsensitive(name: string): string | undefined {
    const searchName = name.toLowerCase();
    return Object.keys(this.animations).find((k) => k.toLowerCase() === searchName);
  }

  /**
   * Marks the current animation as finished and resolves any pending promises.
   */
  private completeAnimation(ctx: AnimationContext): void {
    const completedAnimation = ctx.currentAnimation?.name || '';
    if (ctx.animationPromise) {
      ctx.animationPromise.resolve(true);
      ctx.animationPromise = null;
      this.activePromise = null;
    }

    ctx.baseAnimationName = undefined;
    ctx.continuedAnimationName = undefined;
    ctx.returnAnimationName = undefined;
    ctx.isProcessingReturn = false;

    ctx.currentAnimation = null;
    this.machine.send({ type: 'STOP' });
    this.emit('animationCompleted', completedAnimation);
  }

  /**
   * Checks if a frame has an associated sound effect and plays it if it does.
   */
  private checkAndPlaySound(frame: FrameDefinition | null): void {
    if (frame && frame.duration > 0) {
      this.machine.context.lastRenderedFrame = frame;
    }
    if (frame?.soundEffect) {
      this.audioManager.playFrameSound(frame.soundEffect);
    }
  }

  /**
   * Draws the current animation frame onto the provided 2D canvas context.
   *
   * @param ctx - The destination canvas context.
   * @param x - Horizontal position.
   * @param y - Vertical position.
   * @param scale - Scaling factor.
   */
  public draw(ctx: CanvasRenderingContext2D, x: number, y: number, scale: number = this.scale): void {
    const frame = this.currentFrame;
    if (frame) {
      this.spriteManager.drawFrame(ctx, frame, x, y, scale, this.currentViseme);
    }
  }

  /**
   * Preloads all image and audio assets for a specific animation.
   *
   * @param animationName - The animation to preload.
   */
  public async preloadAnimation(animationName: string): Promise<void> {
    const animation = this.animations[animationName];
    if (!animation) return;

    const soundsToLoad: string[] = [];
    for (const frame of animation.frames) {
      for (const img of frame.images) {
        await this.spriteManager.loadSprite(img.filename);
      }
      if (frame.soundEffect) {
        soundsToLoad.push(frame.soundEffect);
      }
    }
    if (soundsToLoad.length > 0) {
      await this.audioManager.loadSounds(soundsToLoad);
    }
  }
}
