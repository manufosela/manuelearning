import { describe, it, expect, vi, afterEach } from 'vitest';

await import('../src/components/copy-button.js');

const flush = () => new Promise((r) => setTimeout(r, 0));

async function mount(text) {
  const el = document.createElement('copy-button');
  el.text = text;
  el.label = 'Copiar enlace';
  document.body.appendChild(el);
  await el.updateComplete;
  return el;
}

afterEach(() => {
  document.body.innerHTML = '';
  vi.unstubAllGlobals();
});

describe('copy-button', () => {
  it('copies its text and confirms it', async () => {
    const writeText = vi.fn(() => Promise.resolve());
    vi.stubGlobal('navigator', { clipboard: { writeText } });
    const el = await mount('https://x.com/invitacion?token=a');

    el.shadowRoot.querySelector('button').click();
    await flush();
    await el.updateComplete;

    expect(writeText).toHaveBeenCalledWith('https://x.com/invitacion?token=a');
    expect(el.shadowRoot.querySelector('button').textContent).toContain('Copiado');
  });

  it('says so when the clipboard is not available', async () => {
    vi.stubGlobal('navigator', { clipboard: { writeText: vi.fn(() => Promise.reject(new Error('denied'))) } });
    const el = await mount('texto');

    el.shadowRoot.querySelector('button').click();
    await flush();
    await el.updateComplete;

    expect(el.shadowRoot.querySelector('[role="status"]').textContent).toContain('No se ha podido copiar');
  });
});
