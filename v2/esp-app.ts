import { LitElement, html, css, PropertyValues } from "lit";
import { customElement, state, query } from "lit/decorators.js";
import { getBasePath } from "./esp-entity-table";

import "./esp-entity-table";
import "./esp-log";
import "./esp-switch";
import "./esp-logo";
import "./zillo-paint";
import "./zillo-tabs";

window.source = new EventSource(getBasePath() + "/events");

interface Config {
  ota: boolean;
  title: string;
}

@customElement("esp-app")
export default class EspApp extends LitElement {
  @state() scheme: string = "";
  @state() ping: string = "";
  @state() width: number = 0;
  @state() height: number = 0;
  @query("#beat")
  beat!: HTMLSpanElement;

  version: String = import.meta.env.PACKAGE_VERSION;
  config: Config = { ota: false, title: "" };

  darkQuery: MediaQueryList = window.matchMedia("(prefers-color-scheme: dark)");

  frames = [
    { color: "inherit" },
    { color: "red", transform: "scale(1.25) translateY(-30%)" },
    { color: "inherit" },
  ];

  constructor() {
    super();
  }

  //createRenderRoot() {
  //  return this; // turn off shadow dom to access external styles
  //}

  firstUpdated(changedProperties: PropertyValues) {
    super.firstUpdated(changedProperties);
    document.getElementsByTagName("head")[0].innerHTML +=
      '<meta name=viewport content="width=device-width, initial-scale=1,user-scalable=no">';
    const l = <HTMLLinkElement>document.querySelector("link[rel~='icon']"); // Set favicon to house
    l.href =
      'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="25" height="25"><path d="M1 12.5h2.9v7.8h17v-7.8h2.9l-2.9-2.9V4.5h-1.8v3.3L12.3 1 1 12.5Z"/></svg>';
    this.darkQuery.addEventListener("change", () => {
      this.scheme = this.isDark();
    });
    this.scheme = this.isDark();
    window.source.addEventListener("ping", (e: Event) => {
      //console.dir(e);
      const messageEvent = e as MessageEvent;
      const d: String = messageEvent.data;
      if (d.length) {
        const config = JSON.parse(messageEvent.data);
        this.config = config;
        if (this.width == 0 && this.height == 0) {
          console.log("initapp");
          this.width = config.w;
          this.height = config.h;
        }
        document.title = config.title;
        document.documentElement.lang = config.lang;
      }
      this.ping = messageEvent.lastEventId;
    });
    window.source.onerror = function (e: Event) {
      console.dir(e);
      //alert("Lost event stream!")
    };
  }

  isDark() {
    return this.darkQuery.matches ? "dark" : "light";
  }

  updated(changedProperties: Map<string, unknown>) {
    super.updated(changedProperties);
    if (changedProperties.has("scheme")) {
      let el = document.documentElement;
      document.documentElement.style.setProperty("color-scheme", this.scheme);
    }
    if (changedProperties.has("ping")) {
      this.beat.animate(this.frames, 1000);
    }
  }

  ota() {
    if (this.config.ota) {
      let basePath = getBasePath();
      return html`<h2>OTA Update</h2>
        <form
          method="POST"
          action="${basePath}/update"
          enctype="multipart/form-data"
        >
          <input class="btn" type="file" name="update" />
          <input class="btn" type="submit" value="Update" />
        </form>`;
    }
  }

  render() {
    return html`
      <h1>
        <esp-logo></esp-logo>
        ${this.config.title}
        <img id="beat" src="/logo.png" title="${this.version}" />
      </h1>
      <zillo-tabs>
        <h2 slot="tab">PAINT</h2>
        <section slot="panel">
          <zillo-paint
            width="${this.height}"
            height="${this.height}"
          ></zillo-paint>
        </section>
        <h2 slot="tab">ENTITIES</h2>
        <section slot="panel">
          <esp-entity-table></esp-entity-table>
        </section>
        <h2 slot="tab">SETTINGS</h2>
        <section slot="panel">
          <h2>
            <esp-switch
              color="var(--primary-color,currentColor)"
              class="right"
              .state="${this.scheme}"
              @state="${(e: CustomEvent) => (this.scheme = e.detail.state)}"
              labelOn="🌒"
              labelOff="☀️"
              stateOn="dark"
              stateOff="light"
              optimistic
            >
            </esp-switch>
            Scheme
          </h2>
        </section>
        <h2 slot="tab">LOGS</h2>
        <section slot="panel">
          <esp-log rows="50"></esp-log>
        </section>
        <h2 slot="tab">OTA</h2>
        <section slot="panel">${this.ota()}</section>
      </zillo-tabs>
    `;
  }

  static get styles() {
    return [
      css`
        * {
          font-family: "Press Start 2P", sans-serif;
        }
        h1 {
          text-align: center;
          vertical-align: middle;
          width: 100%;
          line-height: 4rem;
          text-transform: uppercase;
        }
        #beat {
          float: right;
          vertical-align: middle;
          height: 4rem;
          margin: 10px;
        }
        a.logo {
          height: 4rem;
          float: left;
          color: inherit;
        }
        .right {
          float: right;
        }
      `,
    ];
  }
}
