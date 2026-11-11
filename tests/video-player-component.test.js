import { describe, it, expect, vi, beforeAll, afterEach } from 'vitest';

await import('../src/components/video-player.js');

const players = [];
class FakePlayer {
  constructor(container, options) {
    this.options = options;
    this.time = 65;
    this.posted = [];
    this.iframe = { contentWindow: { postMessage: (msg) => this.posted.push(JSON.parse(msg)) } };
    this.destroy = vi.fn();
    this.seekTo = vi.fn();
    players.push(this);
  }
  getCurrentTime() { return this.time; }
  getIframe() { return this.iframe; }
}
const flush = () => new Promise((r) => setTimeout(r, 0));
const $ = (el, s) => el.shadowRoot.querySelector(s);

async function mount(url = 'https://youtu.be/abcdefghijk', props = {}) {
  const el = Object.assign(document.createElement('video-player'), { url, ...props });
  document.body.appendChild(el);
  for (let i = 0; i < 3; i++) await flush();
  await el.updateComplete;
  return el;
}
async function ready(el) {
  players.at(-1).options.events.onReady();
  await el.updateComplete;
  return players.at(-1);
}

afterEach(() => {
  document.body.innerHTML = '';
  vi.useRealTimers();
});

describe('video-player', () => {
  beforeAll(async () => {
    // First player: the YouTube API is not loaded yet, so the component injects its script.
    const el = await mount();
    expect(document.head.querySelector('script[src="https://www.youtube.com/iframe_api"]')).not.toBeNull();
    window.YT = { Player: FakePlayer, PlayerState: { PLAYING: 1, PAUSED: 2 } };
    window.onYouTubeIframeAPIReady();
    for (let i = 0; i < 3; i++) await flush();
    expect(players).toHaveLength(1);
    el.remove();
  });

  it('explains when there is no valid video', async () => {
    const el = await mount('https://example.com/video');
    expect($(el, '.no-video').textContent).toContain('No hay video disponible');
  });

  it('creates the player at the saved second and shows the controls once ready', async () => {
    const el = await mount('https://youtu.be/abcdefghijk', { startAt: 42.7 });
    const player = players.at(-1);
    expect(player.options.videoId).toBe('abcdefghijk');
    expect(player.options.playerVars.start).toBe(42);
    expect($(el, '.controls')).toBeNull();

    const onReady = vi.fn();
    el.addEventListener('video-ready', onReady);
    await ready(el);
    expect(onReady).toHaveBeenCalled();
    expect($(el, '.controls')).not.toBeNull();
  });

  it('changes the playback speed through the iframe API', async () => {
    const el = await mount();
    const player = await ready(el);
    el.shadowRoot.querySelector('button[aria-label="Velocidad de reproducción 1.5x"]').click();
    await el.updateComplete;
    expect(player.posted.at(-1)).toEqual({ event: 'command', func: 'setPlaybackRate', args: [1.5] });
    expect($(el, '.speed-btn--active').textContent).toBe('1.5x');
  });

  it('reports the current time while playing and when it stops', async () => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] });
    const el = await mount();
    const player = await ready(el);
    const updates = [];
    el.addEventListener('video-time-update', (e) => updates.push(e.detail.currentTime));
    player.options.events.onStateChange({ data: 1 });
    vi.advanceTimersByTime(5000);
    player.time = 80;
    player.options.events.onStateChange({ data: 2 });
    expect(updates).toEqual([65, 80]);
    el.remove();
    expect(player.destroy).toHaveBeenCalled();
  });

  it('adds a bookmark with a note at the current time, or cancels it', async () => {
    const el = await mount();
    await ready(el);
    const added = vi.fn();
    el.addEventListener('bookmark-add', (e) => added(e.detail));

    $(el, '.bookmark-btn').click();
    await el.updateComplete;
    expect($(el, '.bookmark-note-input').placeholder).toContain('1:05');
    $(el, '.bookmark-note-input').value = '  idea clave ';
    $(el, '.bookmark-save-btn').click();
    await el.updateComplete;
    expect(added).toHaveBeenCalledWith({ seconds: 65, note: 'idea clave' });

    $(el, '.bookmark-btn').click();
    await el.updateComplete;
    $(el, '.bookmark-note-input').dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    await el.updateComplete;
    expect($(el, '.bookmark-input-row')).toBeNull();
    expect(added).toHaveBeenCalledTimes(1);
  });

  it('lists bookmarks in order, seeks to one and removes another', async () => {
    const el = await mount('https://youtu.be/abcdefghijk', { bookmarks: [{ seconds: 125, note: 'final' }, { seconds: 9 }] });
    const player = await ready(el);
    const chips = [...el.shadowRoot.querySelectorAll('.bookmark-chip')];
    expect(chips.map((c) => c.textContent.replace(/\s+/g, ' ').trim())).toEqual(['bookmark 0:09 close', 'bookmark 2:05 — final close']);

    const seek = vi.fn();
    const removed = vi.fn();
    el.addEventListener('bookmark-seek', (e) => seek(e.detail));
    el.addEventListener('bookmark-remove', (e) => removed(e.detail));
    chips[0].click();
    expect(player.seekTo).toHaveBeenCalledWith(9, true);
    expect(seek).toHaveBeenCalledWith({ seconds: 9 });
    chips[1].querySelector('.bookmark-remove').click();
    expect(removed).toHaveBeenCalledWith({ bookmark: { seconds: 125, note: 'final' } });
    expect(seek).toHaveBeenCalledTimes(1);
  });
});
