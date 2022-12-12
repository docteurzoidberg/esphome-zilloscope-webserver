import { html, css, LitElement } from "lit";
import { customElement, property } from "lit/decorators.js";

@customElement("paint-tools")
export default class PaintTools extends LitElement {
  @property({ type: Array }) _tools = [];
  static styles = css`
    .selected * {
      color: red;
    }
  `;

  constructor() {
    super();
  }

  render() {
    return html` <div class="tools">
      <slot></slot>
    </div>`;
  }
}
