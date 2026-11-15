export interface RectBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export const ORB_WINDOW_SIZE = { width: 76, height: 76 };
export const CHAT_WINDOW_SIZE = { width: 416, height: 572 };
export const WINDOW_EDGE_MARGIN = 16;

export function getDefaultOrbBounds(workArea: RectBounds): RectBounds {
  return {
    x: Math.round(workArea.x + workArea.width - ORB_WINDOW_SIZE.width - 28),
    y: Math.round(workArea.y + workArea.height - ORB_WINDOW_SIZE.height - 28),
    width: ORB_WINDOW_SIZE.width,
    height: ORB_WINDOW_SIZE.height,
  };
}

export function clampBoundsToWorkArea(bounds: RectBounds, workArea: RectBounds): RectBounds {
  const maxX = Math.max(workArea.x, workArea.x + workArea.width - bounds.width);
  const maxY = Math.max(workArea.y, workArea.y + workArea.height - bounds.height);
  return {
    x: Math.round(Math.min(Math.max(bounds.x, workArea.x), maxX)),
    y: Math.round(Math.min(Math.max(bounds.y, workArea.y), maxY)),
    width: bounds.width,
    height: bounds.height,
  };
}

/**
 * Computes expanded chat panel bounds anchored near the orb's current corner/position,
 * clamping cleanly inside the active monitor's workArea.
 */
export function computeExpandedBounds(orbBounds: RectBounds, workArea: RectBounds): RectBounds {
  const orbCenterX = orbBounds.x + orbBounds.width / 2;
  const orbCenterY = orbBounds.y + orbBounds.height / 2;
  const workCenterX = workArea.x + workArea.width / 2;
  const workCenterY = workArea.y + workArea.height / 2;

  const targetX =
    orbCenterX >= workCenterX
      ? orbBounds.x + orbBounds.width - CHAT_WINDOW_SIZE.width
      : orbBounds.x;

  const targetY =
    orbCenterY >= workCenterY
      ? orbBounds.y + orbBounds.height - CHAT_WINDOW_SIZE.height
      : orbBounds.y;

  return clampBoundsToWorkArea(
    {
      x: targetX,
      y: targetY,
      width: CHAT_WINDOW_SIZE.width,
      height: CHAT_WINDOW_SIZE.height,
    },
    workArea
  );
}

/**
 * Restores orb bounds anchored cleanly to the same corner where the chat panel sits.
 */
export function computeCollapsedBounds(
  chatBounds: RectBounds,
  lastOrbBounds: RectBounds | null,
  workArea: RectBounds
): RectBounds {
  if (lastOrbBounds) {
    return clampBoundsToWorkArea(
      {
        x: lastOrbBounds.x,
        y: lastOrbBounds.y,
        width: ORB_WINDOW_SIZE.width,
        height: ORB_WINDOW_SIZE.height,
      },
      workArea
    );
  }

  return clampBoundsToWorkArea(
    {
      x: chatBounds.x + chatBounds.width - ORB_WINDOW_SIZE.width,
      y: chatBounds.y + chatBounds.height - ORB_WINDOW_SIZE.height,
      width: ORB_WINDOW_SIZE.width,
      height: ORB_WINDOW_SIZE.height,
    },
    workArea
  );
}
