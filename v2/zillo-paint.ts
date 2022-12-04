import { html, css, LitElement } from "lit";
import { customElement, property } from "lit/decorators.js";

@customElement("zillo-paint")
export default class ZilloPaint extends LitElement {
  constructor() {
    super();
  }
  render() {
    return html` <link
        href="http://unpkg.com/nes.css/css/nes-core.min.css"
        rel="stylesheet"
      />
      <div>
        <span class="nes-text is-primary">Primary</span>
        <span class="nes-text is-success">Success</span>
        <span class="nes-text is-warning">Warning</span>
        <span class="nes-text is-error">Error</span>
        <span class="nes-text is-disabled">Disabled</span>
        <button type="button" class="nes-btn is-primary">TITI</button>
        <div class="nes-table-responsive">
          <table class="nes-table is-bordered is-centered">
            <thead>
              <tr>
                <th>Table.is-bordered</th>
                <th>Table.is-centered</th>
                <th>Table.is-centered</th>
                <th>Table.is-centered</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Thou hast had a good morning</td>
                <td>Thou hast had a good afternoon</td>
                <td>Thou hast had a good evening</td>
                <td>Thou hast had a good night</td>
              </tr>
              <tr>
                <td>Thou hast had a good morning</td>
                <td>Thou hast had a good afternoon</td>
                <td>Thou hast had a good evening</td>
                <td>Thou hast had a good night</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>`;
  }
}
