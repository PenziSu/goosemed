import type { BrowserWindow } from 'electron';
import type { OpenExternalUrlResult } from './urlSecurity';

export const openExternalUrl = async (
  _url: string,
  _parentWindow?: BrowserWindow,
  _locale?: string
): Promise<OpenExternalUrlResult> => {
  return 'blocked';
};
