import { html } from 'lit';

const MATERIAL_FONT_URL =
  'https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap';

/**
 * Returns a `<link>` template to include Material Symbols font inside Shadow DOM.
 * Usage: include `${materialIconsLink}` at the top of your `render()` method.
 */
export const materialIconsLink = html`<link href=${MATERIAL_FONT_URL} rel="stylesheet" />`;
