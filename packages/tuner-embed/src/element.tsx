import React from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { NestTuner, type TunerLocale } from '@nesttuner/ui';
import styles from '../../../apps/web/src/styles.css?inline';
import packageJson from '../../../package.json';

const VALID_LOCALES: TunerLocale[] = ['pt-BR', 'en', 'es'];
const ASSET_BASE_URL = new URL(`../runtime/v${packageJson.version}/`, import.meta.url).href;

function normalizeLocale(value: string | null): TunerLocale {
  if (!value) return 'pt-BR';
  const normalized = value.toLowerCase();
  if (normalized.startsWith('pt')) return 'pt-BR';
  if (normalized.startsWith('es')) return 'es';
  if (normalized.startsWith('en')) return 'en';
  return VALID_LOCALES.includes(value as TunerLocale) ? value as TunerLocale : 'pt-BR';
}

export class NestTunerElement extends HTMLElement {
  static get observedAttributes() {
    return ['locale'];
  }

  private reactRoot: Root | null = null;
  private mountPoint: HTMLDivElement | null = null;

  connectedCallback() {
    if (!this.shadowRoot) {
      const shadow = this.attachShadow({ mode: 'open' });
      const style = document.createElement('style');
      style.textContent = ':host{display:block;min-width:0;color-scheme:dark;}\n' + styles.replace(':root {', ':host {');

      this.mountPoint = document.createElement('div');
      this.mountPoint.className = 'nesttuner-embed-root';

      shadow.append(style, this.mountPoint);
    }

    if (!this.reactRoot && this.mountPoint) {
      this.reactRoot = createRoot(this.mountPoint);
    }
    this.renderReact();
  }

  disconnectedCallback() {
    this.reactRoot?.unmount();
    this.reactRoot = null;
  }

  attributeChangedCallback() {
    this.renderReact();
  }

  private renderReact() {
    if (!this.reactRoot) return;

    this.reactRoot.render(
      <React.StrictMode>
        <NestTuner
          locale={normalizeLocale(this.getAttribute('locale'))}
          embedded
          assetBaseUrl={ASSET_BASE_URL}
          onBack={() => {
            this.dispatchEvent(new CustomEvent('nesttuner-back', { bubbles: true, composed: true }));
          }}
        />
      </React.StrictMode>
    );
  }
}

if (!customElements.get('nest-tuner')) {
  customElements.define('nest-tuner', NestTunerElement);
}
