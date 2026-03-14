import { describe, it, expect, vi } from 'vitest';
import { EventEmitter } from '../src/core/base/EventEmitter';

describe('EventEmitter', () => {
  it('should register and emit events', () => {
    const emitter = new EventEmitter<any>();
    const callback = vi.fn();

    emitter.on('test', callback);
    emitter.emit('test', 'data');

    expect(callback).toHaveBeenCalledWith('data');
  });

  it('should remove listeners', () => {
    const emitter = new EventEmitter<any>();
    const callback = vi.fn();

    emitter.on('test', callback);
    emitter.off('test', callback);
    emitter.emit('test');

    expect(callback).not.toHaveBeenCalled();
  });

  it('should clear all listeners', () => {
    const emitter = new EventEmitter<any>();
    const callback = vi.fn();

    emitter.on('test', callback);
    emitter.clear();
    emitter.emit('test');

    expect(callback).not.toHaveBeenCalled();
  });
});
