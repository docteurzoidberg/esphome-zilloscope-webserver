import { html, css, LitElement } from "lit";
import { customElement, property } from "lit/decorators.js";

@customElement("paint-tool")
export default class PaintTool extends LitElement {
  @property() name: string = "one-default-tool";

  _onSelect(e: Event) {
    const target = e.target as HTMLElement;
    this.dispatchEvent(new Event("tool-selected"));
  }

  static get styles() {
    return css`
      .tools div {
        background-color: cyan;
      }
    `;
  }

  render() {
    return html`
      <link
        href="http://unpkg.com/nes.css/css/nes-core.min.css"
        rel="stylesheet"
      />

      <button type="button" class="nes nes-btn" @click="${this._onSelect}">
        <slot name="icon"></slot>
      </button>

      <slot name="options"></slot>
    `;
  }
}
