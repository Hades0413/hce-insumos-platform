import { createApi, type Api } from './endpoints';
import { createHttpClient, redirectToLogin } from './http-client';

export const API_BASE_URL: string = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';

const permissionListeners = new Set<() => void>();

export function subscribePermissionsChanged(listener: () => void): () => void {
  permissionListeners.add(listener);
  return () => {
    permissionListeners.delete(listener);
  };
}

const httpClient = createHttpClient({
  baseURL: API_BASE_URL,
  onSessionExpired: redirectToLogin,
  onPermissionsChanged: () => permissionListeners.forEach((listener) => listener()),
});

export const api: Api = createApi(httpClient.instance, httpClient.resetCsrf);
