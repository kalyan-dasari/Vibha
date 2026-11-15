import { describe, expect, it } from 'vitest';
import {
  computeScaledDimensions,
  dipRectToPhysicalRect,
} from '../electron/services/screen/cropService.ts';
import {
  CHAT_WINDOW_SIZE,
  ORB_WINDOW_SIZE,
  computeCollapsedBounds,
  computeExpandedBounds,
} from '../electron/windows/chatWindow.ts';

describe('cropService DPI scaling and clamping', () => {
  it('scales DIP coordinates accurately for 150% Windows DPI display scaling', () => {
    const physical = dipRectToPhysicalRect(
      { x: 100, y: 200, width: 400, height: 300 },
      1.5,
      2880,
      1620
    );
    expect(physical).toEqual({ x: 150, y: 300, width: 600, height: 450 });
  });

  it('clamps selection rectangles that cross display edges', () => {
    const physical = dipRectToPhysicalRect(
      { x: 1800, y: 900, width: 400, height: 300 },
      1,
      1920,
      1080
    );
    expect(physical).toEqual({ x: 1800, y: 900, width: 120, height: 180 });
  });

  it('rejects tiny accidental click selections below minimum threshold', () => {
    expect(() =>
      dipRectToPhysicalRect({ x: 10, y: 10, width: 3, height: 3 }, 1, 1920, 1080)
    ).toThrow(/too small/i);
  });

  it('downscales oversized screenshots while preserving aspect ratio', () => {
    const scaled = computeScaledDimensions(3840, 2160, 1920);
    expect(scaled).toEqual({ width: 1920, height: 1080, resized: true });

    const unscaled = computeScaledDimensions(1280, 720, 1920);
    expect(unscaled).toEqual({ width: 1280, height: 720, resized: false });
  });
});

describe('chatWindow expand/collapse geometry', () => {
  const workArea = { x: 0, y: 0, width: 1920, height: 1040 };

  it('keeps expanded chat panel clamped inside screen workArea from bottom-right orb', () => {
    const orb = {
      x: 1820,
      y: 940,
      width: ORB_WINDOW_SIZE.width,
      height: ORB_WINDOW_SIZE.height,
    };
    const expanded = computeExpandedBounds(orb, workArea);
    expect(expanded.width).toBe(CHAT_WINDOW_SIZE.width);
    expect(expanded.height).toBe(CHAT_WINDOW_SIZE.height);
    expect(expanded.x + expanded.width).toBeLessThanOrEqual(workArea.width);
    expect(expanded.y + expanded.height).toBeLessThanOrEqual(workArea.height);
  });

  it('restores orb back to remembered session bounds on collapse', () => {
    const rememberedOrb = { x: 120, y: 150, width: 76, height: 76 };
    const chat = { x: 120, y: 150, width: 416, height: 572 };
    const collapsed = computeCollapsedBounds(chat, rememberedOrb, workArea);
    expect(collapsed).toEqual(rememberedOrb);
  });
});
