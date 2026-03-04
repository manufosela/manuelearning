import { LitElement, html, css } from 'lit';
import { extractYouTubeId, buildEmbedUrl } from '../lib/youtube.js';
import { materialIconsLink } from './shared/material-icons.js';

/**
 * @element video-player
 * Embeds a YouTube video with responsive 16:9 aspect ratio.
 *
 * @attr {string} url - YouTube video URL (watch, short or embed format)
 *
 * Fires:
 * - video-ready: when iframe loads
 */
export class VideoPlayer extends LitElement {
  static properties = {
    url: { type: String },
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

    .video-container iframe {
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
  `;

  constructor() {
    super();
    this.url = '';
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

    const embedUrl = buildEmbedUrl(videoId);

    return html`
      <div class="video-container">
        <iframe
          src=${embedUrl}
          title="Video de la clase"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowfullscreen
          loading="lazy"
          @load=${this._onLoad}
        ></iframe>
      </div>
    `;
  }

  _onLoad() {
    this.dispatchEvent(new CustomEvent('video-ready', { bubbles: true, composed: true }));
  }
}

customElements.define('video-player', VideoPlayer);
