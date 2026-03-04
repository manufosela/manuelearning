import { describe, it, expect } from 'vitest';
import { extractYouTubeId, buildEmbedUrl } from '../src/lib/youtube.js';

describe('extractYouTubeId', () => {
  it('should extract ID from standard watch URL', () => {
    expect(extractYouTubeId('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
  });

  it('should extract ID from short URL', () => {
    expect(extractYouTubeId('https://youtu.be/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
  });

  it('should extract ID from embed URL', () => {
    expect(extractYouTubeId('https://www.youtube.com/embed/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
  });

  it('should extract ID from URL with extra params', () => {
    expect(extractYouTubeId('https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=120')).toBe('dQw4w9WgXcQ');
  });

  it('should return null for invalid URL', () => {
    expect(extractYouTubeId('https://example.com')).toBeNull();
  });

  it('should return null for empty string', () => {
    expect(extractYouTubeId('')).toBeNull();
  });

  it('should handle URL without www', () => {
    expect(extractYouTubeId('https://youtube.com/watch?v=dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
  });
});

describe('buildEmbedUrl', () => {
  it('should build embed URL from video ID', () => {
    expect(buildEmbedUrl('dQw4w9WgXcQ')).toBe('https://www.youtube.com/embed/dQw4w9WgXcQ');
  });

  it('should return empty string for null ID', () => {
    expect(buildEmbedUrl(null)).toBe('');
  });

  it('should return empty string for empty ID', () => {
    expect(buildEmbedUrl('')).toBe('');
  });
});
