import { screen } from 'electron';
import type { DisplayInfo } from '../../../shared/types.ts';

export class MonitorService {
  getAllDisplays(): DisplayInfo[] {
    const primaryId = screen.getPrimaryDisplay().id;
    return screen.getAllDisplays().map((d, index) => ({
      id: d.id,
      label: d.label?.trim() || (d.id === primaryId ? `Primary Display (${index + 1})` : `Display ${index + 1}`),
      isPrimary: d.id === primaryId,
      bounds: { ...d.bounds },
      workArea: { ...d.workArea },
      scaleFactor: d.scaleFactor || 1,
    }));
  }

  getTargetDisplay(displayId?: number | null): DisplayInfo {
    const displays = this.getAllDisplays();
    if (typeof displayId === 'number') {
      const matched = displays.find((d) => d.id === displayId);
      if (matched) return matched;
    }
    return displays.find((d) => d.isPrimary) ?? displays[0];
  }

  getDisplayForPoint(x: number, y: number): DisplayInfo {
    const electronDisplay = screen.getDisplayNearestPoint({ x, y });
    const all = this.getAllDisplays();
    return all.find((d) => d.id === electronDisplay.id) ?? all[0];
  }
}
