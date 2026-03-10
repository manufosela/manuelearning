import { LitElement, html, css, nothing } from 'lit';
import { extractYouTubeId, buildEmbedUrl } from '../lib/youtube.js';
import { materialIconsLink } from './shared/material-icons.js';

const SPEED_OPTIONS = [0.75, 1, 1.25, 1.5, 2];

/** Load the YouTube IFrame API script once. */
function loadYTApi() {
  if (window.YT && window.YT.Player) return Promise.resolve();
  if (window._ytApiPromise) return window._ytApiPromise;

  window._ytApiPromise = new Promise((resolve) => {
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      if (prev) prev();
      resolve();
    };
    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    document.head.appendChild(tag);
  });
  return window._ytApiPromise;
}

/**
 * @element video-player
 * Embeds a YouTube video with responsive 16:9 aspect ratio.
 * Supports playback speed control, position tracking, and bookmarks.
 *
 * @attr {string} url - YouTube video URL (watch, short or embed format)
 * @attr {number} startAt - Start playback at this second (default 0)
 * @attr {Array} bookmarks - Array of bookmark objects [{seconds, note, createdAt}]
 *
 * Fires:
 * - video-ready: when iframe loads
 * - video-time-update: periodically with {detail: {currentTime}} while playing
 * - bookmark-add: when user clicks add bookmark {detail: {seconds}}
 * - bookmark-seek: when user clicks a bookmark chip {detail: {seconds}}
 * - bookmark-remove: when user removes a bookmark {detail: {bookmark}}
 */
export class VideoPlayer extends LitElement {
  static properties = {
    url: { type: String },
    startAt: { type: Number, attribute: 'start-at' },
    bookmarks: { type: Array },
    _speed: { type: Number, state: true },
    _playerReady: { type: Boolean, state: true },
    _showBookmarkInput: { type: Boolean, state: true },
  };

  static styles = css`
    :host {
      display: block;
    }

    .video-container {
      position: relative;
      width: 100%;
      padding-bottom: 56.25%; /* 16:9 */
      background: #0f172a;
      border-radius: 0.75rem;
      overflow: hidden;
    }

    .video-container iframe,
    .video-container #yt-player {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      border: 0;
    }

    .no-video {
      display: flex;
      align-items: center;
      justify-content: center;
      flex-direction: column;
      gap: 0.5rem;
      padding: 3rem;
      background: #f1f5f9;
      border-radius: 0.75rem;
      color: #64748b;
      text-align: center;
    }

    .no-video .material-symbols-outlined {
      font-size: 2.5rem;
      color: #cbd5e1;
    }

    .controls {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 0.5rem;
      margin-top: 0.75rem;
    }

    .speed-controls {
      display: flex;
      align-items: center;
      gap: 0.25rem;
    }

    .speed-label {
      font-size: 0.813rem;
      font-weight: 600;
      color: #475569;
      margin-right: 0.25rem;
    }

    .speed-btn {
      padding: 0.25rem 0.5rem;
      border: 1px solid #e2e8f0;
      border-radius: 0.375rem;
      background: #fff;
      color: #334155;
      font-size: 0.813rem;
      font-family: inherit;
      cursor: pointer;
      transition: all 0.15s;
    }

    .speed-btn:hover {
      background: #f8fafc;
      border-color: #cbd5e1;
    }

    .speed-btn--active {
      background: #84cc16;
      color: #fff;
      border-color: #84cc16;
    }

    .speed-btn--active:hover {
      background: #65a30d;
    }

    .bookmark-btn {
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
      padding: 0.25rem 0.625rem;
      border: 1px solid #e2e8f0;
      border-radius: 0.375rem;
      background: #fff;
      color: #334155;
      font-size: 0.813rem;
      font-family: inherit;
      cursor: pointer;
      transition: all 0.15s;
      margin-left: auto;
    }

    .bookmark-btn:hover {
      background: #fef9c3;
      border-color: #facc15;
    }

    .bookmark-btn .material-symbols-outlined {
      font-size: 1rem;
    }

    .bookmarks-list {
      display: flex;
      flex-wrap: wrap;
      gap: 0.375rem;
      margin-top: 0.5rem;
    }

    .bookmark-chip {
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
      padding: 0.25rem 0.5rem;
      border: 1px solid #e2e8f0;
      border-radius: 1rem;
      background: #fffbeb;
      color: #92400e;
      font-size: 0.75rem;
      cursor: pointer;
      transition: all 0.15s;
    }

    .bookmark-chip:hover {
      background: #fef3c7;
      border-color: #fbbf24;
    }

    .bookmark-chip .material-symbols-outlined {
      font-size: 0.875rem;
    }

    .bookmark-remove {
      background: none;
      border: none;
      padding: 0;
      margin-left: 0.125rem;
      cursor: pointer;
      color: #dc2626;
      font-size: 0;
      line-height: 1;
      opacity: 0.6;
      transition: opacity 0.15s;
    }

    .bookmark-remove:hover {
      opacity: 1;
    }

    .bookmark-remove .material-symbols-outlined {
      font-size: 0.875rem;
    }

    .bookmark-input-row {
      display: flex;
      align-items: center;
      gap: 0.375rem;
      margin-top: 0.5rem;
    }

    .bookmark-note-input {
      flex: 1;
      padding: 0.375rem 0.625rem;
      border: 1px solid #e2e8f0;
      border-radius: 0.375rem;
      font-size: 0.813rem;
      font-family: inherit;
      outline: none;
      max-width: 16rem;
    }

    .bookmark-note-input:focus {
      border-color: #84cc16;
    }

    .bookmark-save-btn,
    .bookmark-cancel-btn {
      padding: 0.25rem 0.5rem;
      border: 1px solid #e2e8f0;
      border-radius: 0.375rem;
      background: #fff;
      font-size: 0.813rem;
      font-family: inherit;
      cursor: pointer;
    }

    .bookmark-save-btn {
      background: #84cc16;
      color: #fff;
      border-color: #84cc16;
    }

    .bookmark-cancel-btn:hover {
      background: #f8fafc;
    }
  `;

  constructor() {
    super();
    this.url = '';
    this.startAt = 0;
    this.bookmarks = [];
    this._speed = 1;
    this._playerReady = false;
    this._showBookmarkInput = false;
    this._pendingBookmarkTime = 0;
    this._player = null;
    this._timeInterval = null;
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this._clearTimeInterval();
    if (this._player) {
      this._player.destroy();
      this._player = null;
    }
  }

  _clearTimeInterval() {
    if (this._timeInterval) {
      clearInterval(this._timeInterval);
      this._timeInterval = null;
    }
  }

  async _initPlayer(videoId) {
    await loadYTApi();

    const container = this.shadowRoot.querySelector('#yt-player');
    if (!container) return;

    if (this._player) {
      this._player.destroy();
      this._player = null;
    }

    this._player = new window.YT.Player(container, {
      videoId,
      playerVars: {
        enablejsapi: 1,
        origin: window.location.origin,
        start: Math.floor(this.startAt || 0),
      },
      events: {
        onReady: () => {
          this._playerReady = true;
          this._postCommand('setPlaybackRate', [this._speed]);
          this.dispatchEvent(new CustomEvent('video-ready', { bubbles: true, composed: true }));
          this._startTimeTracking();
        },
        onStateChange: (e) => {
          if (e.data === window.YT.PlayerState.PLAYING) {
            this._startTimeTracking();
          } else {
            this._clearTimeInterval();
            this._emitTimeUpdate();
          }
        },
      },
    });
  }

  _startTimeTracking() {
    this._clearTimeInterval();
    this._timeInterval = setInterval(() => this._emitTimeUpdate(), 5000);
  }

  _emitTimeUpdate() {
    if (!this._player || typeof this._player.getCurrentTime !== 'function') return;
    const currentTime = this._player.getCurrentTime();
    this.dispatchEvent(new CustomEvent('video-time-update', {
      detail: { currentTime },
      bubbles: true,
      composed: true,
    }));
  }

  /** Get the current video time in seconds. */
  getCurrentTime() {
    if (!this._player || typeof this._player.getCurrentTime !== 'function') return 0;
    return this._player.getCurrentTime();
  }

  /** Seek to a specific time in seconds. */
  seekTo(seconds) {
    if (!this._player || typeof this._player.seekTo !== 'function') return;
    this._player.seekTo(seconds, true);
  }

  _setSpeed(rate) {
    this._speed = rate;
    this._postCommand('setPlaybackRate', [rate]);
  }

  /**
   * Send a command to the YouTube iframe via postMessage.
   * @param {string} func - YouTube API function name
   * @param {Array} args - function arguments
   */
  _postCommand(func, args = []) {
    if (!this._player || typeof this._player.getIframe !== 'function') return;
    const iframe = this._player.getIframe();
    if (!iframe || !iframe.contentWindow) return;
    iframe.contentWindow.postMessage(JSON.stringify({
      event: 'command',
      func,
      args,
    }), 'https://www.youtube.com');
  }

  _onBookmarkAdd() {
    this._pendingBookmarkTime = this.getCurrentTime();
    this._showBookmarkInput = true;
  }

  _saveBookmark() {
    const input = this.shadowRoot.querySelector('.bookmark-note-input');
    const note = input ? input.value.trim() : '';
    this._showBookmarkInput = false;
    this.dispatchEvent(new CustomEvent('bookmark-add', {
      detail: { seconds: this._pendingBookmarkTime, note },
      bubbles: true,
      composed: true,
    }));
  }

  _cancelBookmark() {
    this._showBookmarkInput = false;
  }

  _onBookmarkSeek(seconds) {
    this.seekTo(seconds);
    this.dispatchEvent(new CustomEvent('bookmark-seek', {
      detail: { seconds },
      bubbles: true,
      composed: true,
    }));
  }

  _onBookmarkRemove(e, bookmark) {
    e.stopPropagation();
    this.dispatchEvent(new CustomEvent('bookmark-remove', {
      detail: { bookmark },
      bubbles: true,
      composed: true,
    }));
  }

  _formatTime(seconds) {
    const s = Math.floor(seconds);
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${String(sec).padStart(2, '0')}`;
  }

  updated(changedProps) {
    if (changedProps.has('url')) {
      const videoId = extractYouTubeId(this.url);
      if (videoId) {
        this._playerReady = false;
        this.updateComplete.then(() => this._initPlayer(videoId));
      }
    }
  }

  render() {
    const videoId = extractYouTubeId(this.url);

    if (!videoId) {
      return html`
        ${materialIconsLink}
        <div class="no-video">
          <span class="material-symbols-outlined">videocam_off</span>
          <p>No hay video disponible para esta clase</p>
        </div>
      `;
    }

    const sortedBookmarks = [...(this.bookmarks || [])].sort((a, b) => a.seconds - b.seconds);

    return html`
      ${materialIconsLink}
      <div class="video-container">
        <div id="yt-player"></div>
      </div>

      ${this._playerReady ? html`
        <div class="controls">
          <div class="speed-controls">
            <span class="speed-label">Velocidad:</span>
            ${SPEED_OPTIONS.map((s) => html`
              <button
                class="speed-btn ${this._speed === s ? 'speed-btn--active' : ''}"
                @click=${() => this._setSpeed(s)}
              >${s}x</button>
            `)}
          </div>
          <button class="bookmark-btn" @click=${this._onBookmarkAdd} ?disabled=${this._showBookmarkInput}>
            <span class="material-symbols-outlined">bookmark_add</span>
            Marcador
          </button>
        </div>

        ${this._showBookmarkInput ? html`
          <div class="bookmark-input-row">
            <input
              class="bookmark-note-input"
              type="text"
              placeholder="Nota (opcional) — ${this._formatTime(this._pendingBookmarkTime)}"
              @keydown=${(e) => { if (e.key === 'Enter') this._saveBookmark(); if (e.key === 'Escape') this._cancelBookmark(); }}
            />
            <button class="bookmark-save-btn" @click=${this._saveBookmark}>Guardar</button>
            <button class="bookmark-cancel-btn" @click=${this._cancelBookmark}>Cancelar</button>
          </div>
        ` : nothing}

        ${sortedBookmarks.length > 0 ? html`
          <div class="bookmarks-list">
            ${sortedBookmarks.map((bm) => html`
              <span class="bookmark-chip" @click=${() => this._onBookmarkSeek(bm.seconds)}>
                <span class="material-symbols-outlined">bookmark</span>
                ${this._formatTime(bm.seconds)}${bm.note ? ` — ${bm.note}` : ''}
                <button
                  class="bookmark-remove"
                  @click=${(e) => this._onBookmarkRemove(e, bm)}
                  title="Eliminar marcador"
                >
                  <span class="material-symbols-outlined">close</span>
                </button>
              </span>
            `)}
          </div>
        ` : nothing}
      ` : nothing}
    `;
  }
}

customElements.define('video-player', VideoPlayer);
