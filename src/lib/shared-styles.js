import { css } from 'lit';

/**
 * Shared styles for loading, empty, and error states.
 * Import and spread into component `static styles` arrays.
 */
export const stateStyles = css`
  .state-loading {
    text-align: center;
    padding: 3rem 2rem;
    color: var(--color-text-secondary, #475569);
  }

  .state-spinner {
    width: 1.5rem;
    height: 1.5rem;
    border: 3px solid var(--color-border, #e2e8f0);
    border-top-color: #84cc16;
    border-radius: 50%;
    animation: state-spin 0.6s linear infinite;
    margin: 0 auto 0.75rem;
  }

  @keyframes state-spin {
    to { transform: rotate(360deg); }
  }

  .state-empty {
    text-align: center;
    padding: 2rem;
    color: var(--color-text-muted, #94a3b8);
    font-size: 0.875rem;
    background: var(--color-bg-white, #fff);
    border-radius: 0.75rem;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
  }

  .state-empty .material-symbols-outlined {
    font-size: 2.5rem;
    color: var(--color-border-light, #cbd5e1);
    display: block;
    margin-bottom: 0.5rem;
  }

  .state-error {
    text-align: center;
    padding: 2rem;
    background: var(--color-error-bg, #fef2f2);
    border-radius: 0.75rem;
    color: var(--color-error-text, #991b1b);
    font-size: 0.875rem;
  }

  .state-error p {
    margin: 0 0 1rem;
  }

  .state-retry-btn {
    display: inline-flex;
    align-items: center;
    gap: 0.375rem;
    padding: 0.5rem 1rem;
    background: var(--color-bg-white, #fff);
    color: var(--color-error-text, #991b1b);
    border: 1px solid var(--color-error-border, #fecaca);
    border-radius: 0.5rem;
    font-size: 0.813rem;
    font-weight: 600;
    font-family: inherit;
    cursor: pointer;
    transition: background-color 0.15s;
  }

  .state-retry-btn:hover {
    background: var(--color-error-bg, #fef2f2);
  }

  .state-retry-btn .material-symbols-outlined {
    font-size: 1rem;
  }
`;
