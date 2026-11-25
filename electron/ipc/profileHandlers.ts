import { ipcMain } from 'electron';
import type { ProfileService } from '../services/profile/profileService.ts';

export function registerProfileHandlers(deps: { profileService: ProfileService }): void {
  const { profileService } = deps;

  ipcMain.handle('profile:get', () => {
    return profileService.getProfile();
  });

  ipcMain.handle('profile:update', (_event, payload: unknown) => {
    return profileService.updateProfile(payload);
  });
}
