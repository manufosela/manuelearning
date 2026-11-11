import { LitElement, html, css } from 'lit';

const FEEDBACK_MS = 2000;

/**
 * @element copy-button
 * Copies `text` to the clipboard and confirms it for a moment.
 */
export class CopyButton extends LitElement {
  static properties = {
    text: { type: String },
    label: { type: String },
    _state: { type: String, state: true },
  };

  static styles = css`
    :host { display: inline-block; }

    button {
      padding: 0.375rem 0.75rem;
      border: 1px solid var(--color-border, #e2e8f0);
      border-radius: 0.375rem;
      background: var(--color-bg-white, #fff);
      color: var(--color-text-secondary, #334155);
      font: inherit;
      font-size: 0.75rem;
      font-weight: 600;
      cursor: pointer;
    }

    button:focus-visible {
      outline: 3px solid var(--color-primary, #84cc16);
      outline-offset: 2px;
    }

    .failed {
      margin-left: 0.5rem;
      font-size: 0.75rem;
      color: var(--color-error-text, #991b1b);
    }
  `;

  constructor() {
    super();
    this.text = '';
    this.label = 'Copiar';
    /** @type {'idle' | 'copied' | 'failed'} */
    this._state = 'idle';
  }

  async _copy() {
    try {
      await navigator.clipboard.writeText(this.text);
      this._state = 'copied';
    } catch (err) {
      console.error('copy-button: clipboard write failed', err);
      this._state = 'failed';
    }
    setTimeout(() => { this._state = 'idle'; }, FEEDBACK_MS);
  }

  render() {
    return html`
      <button type="button" @click=${this._copy}>${this._state === 'copied' ? 'Copiado ✓' : this.label}</button>
      <span role="status" class="failed">${this._state === 'failed' ? 'No se ha podido copiar; selecciona el texto y cópialo a mano' : ''}</span>
    `;
  }
}

customElements.define('copy-button', CopyButton);
