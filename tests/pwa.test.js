import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

const publicDir = join(import.meta.dirname, '..', 'public');

describe('PWA manifest.json', () => {
  const manifest = JSON.parse(readFileSync(join(publicDir, 'manifest.json'), 'utf-8'));

  it('should have required name fields', () => {
    expect(manifest.name).toBe('ManuElearning');
    expect(manifest.short_name).toBeTruthy();
  });

  it('should have start_url and display mode', () => {
    expect(manifest.start_url).toBe('/');
    expect(manifest.display).toBe('standalone');
  });

  it('should have theme and background colors', () => {
    expect(manifest.theme_color).toMatch(/^#[0-9a-fA-F]{6}$/);
    expect(manifest.background_color).toMatch(/^#[0-9a-fA-F]{6}$/);
  });

  it('should have at least two icons', () => {
    expect(manifest.icons.length).toBeGreaterThanOrEqual(2);
  });

  it('should have a 192x192 icon', () => {
    const icon192 = manifest.icons.find((i) => i.sizes === '192x192');
    expect(icon192).toBeTruthy();
    expect(icon192.src).toMatch(/^\/icons\//);
  });

  it('should have a 512x512 icon', () => {
    const icon512 = manifest.icons.find((i) => i.sizes === '512x512');
    expect(icon512).toBeTruthy();
    expect(icon512.src).toMatch(/^\/icons\//);
  });
});

describe('Service Worker file', () => {
  const swContent = readFileSync(join(publicDir, 'service-worker.js'), 'utf-8');

  it('should define a cache name', () => {
    expect(swContent).toMatch(/CACHE_NAME\s*=/);
  });

  it('should handle install event', () => {
    expect(swContent).toContain("addEventListener('install'");
  });

  it('should handle activate event', () => {
    expect(swContent).toContain("addEventListener('activate'");
  });

  it('should handle fetch event', () => {
    expect(swContent).toContain("addEventListener('fetch'");
  });

  it('should define an offline URL', () => {
    expect(swContent).toMatch(/OFFLINE_URL\s*=/);
  });

  it('should skip Firebase API requests', () => {
    expect(swContent).toContain('googleapis.com');
    expect(swContent).toContain('firebaseio.com');
  });
});

describe('Offline fallback page', () => {
  const offlineHtml = readFileSync(join(publicDir, 'offline.html'), 'utf-8');

  it('should be a valid HTML page', () => {
    expect(offlineHtml).toContain('<!DOCTYPE html>');
    expect(offlineHtml).toContain('<html');
    expect(offlineHtml).toContain('</html>');
  });

  it('should contain a user-friendly message', () => {
    expect(offlineHtml).toContain('Sin conexión');
  });

  it('should have a retry mechanism', () => {
    expect(offlineHtml).toContain('Reintentar');
  });
});

describe('PWA icons', () => {
  it('should have icon-192x192 file', () => {
    const content = readFileSync(join(publicDir, 'icons', 'icon-192x192.svg'), 'utf-8');
    expect(content).toContain('<svg');
  });

  it('should have icon-512x512 file', () => {
    const content = readFileSync(join(publicDir, 'icons', 'icon-512x512.svg'), 'utf-8');
    expect(content).toContain('<svg');
  });

  it('should have apple-touch-icon file', () => {
    const content = readFileSync(join(publicDir, 'icons', 'apple-touch-icon.svg'), 'utf-8');
    expect(content).toContain('<svg');
  });
});

describe('Layout PWA integration', () => {
  const mainLayout = readFileSync(
    join(import.meta.dirname, '..', 'src', 'layouts', 'MainLayout.astro'),
    'utf-8'
  );
  const adminLayout = readFileSync(
    join(import.meta.dirname, '..', 'src', 'layouts', 'AdminLayout.astro'),
    'utf-8'
  );

  it('MainLayout should link manifest.json', () => {
    expect(mainLayout).toContain('rel="manifest"');
    expect(mainLayout).toContain('href="/manifest.json"');
  });

  it('MainLayout should have theme-color meta', () => {
    expect(mainLayout).toContain('name="theme-color"');
  });

  it('MainLayout should register service worker', () => {
    expect(mainLayout).toContain("serviceWorker.register('/service-worker.js')");
  });

  it('AdminLayout should link manifest.json', () => {
    expect(adminLayout).toContain('rel="manifest"');
    expect(adminLayout).toContain('href="/manifest.json"');
  });

  it('AdminLayout should have theme-color meta', () => {
    expect(adminLayout).toContain('name="theme-color"');
  });

  it('AdminLayout should register service worker', () => {
    expect(adminLayout).toContain("serviceWorker.register('/service-worker.js')");
  });
});
