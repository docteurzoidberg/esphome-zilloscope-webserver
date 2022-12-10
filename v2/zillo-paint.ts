import { html, css, LitElement } from "lit";
import { customElement, state, query, property } from "lit/decorators.js";

//DOC: passer a true pour dev sans les maj zillo
const nozillo = false;

const canvasScale = 20;
const canvasBorderWidth = 4;

const nesPalette = [
  "#7C7C7C",
  "#0000FC",
  "#0000BC",
  "#4428BC",
  "#940084",
  "#A80020",
  "#A81000",
  "#881400",
  "#503000",
  "#007800",
  "#006800",
  "#005800",
  "#004058",

  "#000000",
  "#BCBCBC",
  "#0078F8",
  "#0058F8",
  "#6844FC",
  "#D800CC",
  "#E40058",
  "#F83800",
  "#E45C10",
  "#AC7C00",
  "#00B800",
  "#00A800",
  "#00A844",
  "#008888",
  "#000000",

  "#F8F8F8",
  "#3CBCFC",
  "#6888FC",
  "#9878F8",
  "#F878F8",
  "#F85898",
  "#F87858",
  "#FCA044",
  "#F8B800",
  "#B8F818",
  "#58D854",
  "#58F898",
  "#00E8D8",
  "#787878",

  "#FCFCFC",
  "#A4E4FC",
  "#B8B8F8",
  "#D8B8F8",
  "#F8B8F8",
  "#F8A4C0",
  "#F0D0B0",
  "#FCE0A8",
  "#F8D878",
  "#D8F878",
  "#B8F8B8",
  "#B8F8D8",
  "#00FCFC",
  "#F8D8F8",
];

const hexToRgb = function (hex: string) {
  var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
        short:
          "" +
          parseInt(result[1], 16) +
          "," +
          parseInt(result[2], 16) +
          "," +
          parseInt(result[3], 16),
      }
    : null;
};

const colorPalette = nesPalette.map((color) => {
  return {
    color: color,
    short: color
      .replace("#", "")
      .match(/.{1,2}/g)
      ?.join(""),
  };
});

export function getBasePath() {
  let str = window.location.pathname;
  return str.endsWith("/") ? str.slice(0, -1) : str;
}

let basePath = getBasePath();

@customElement("zillo-paint")
export default class ZilloPaint extends LitElement {
  @query("#canvas")
  canvas!: HTMLCanvasElement;
  @query("#importimage")
  importimage!: HTMLInputElement;

  @state()
  width: number = 0;
  @state()
  height: number = 0;
  @state()
  canvasWidth: number = 0;
  @state()
  canvasHeight: number = 0;
  @state()
  primaryColor: string = "#FFFFFF";
  @state()
  secondaryColor: string = "#000000";
  @state()
  currentTool: string = "brush";
  @state()
  brushSize: number = 1;
  @state()
  pixel_x: number = 0;
  @state()
  pixel_y: number = 0;

  arrayBuffer!: ArrayBuffer;
  typedArray!: Uint8Array;

  calcScaleX: number = 0;
  calcScaleY: number = 0;

  mouse_x: number = 0;
  mouse_y: number = 0;

  drawing = false;
  drawingColorPrimary = false;

  ctx: any = null;

  constructor() {
    super();

    if (nozillo) {
      this.width = 16;
      this.height = 16;
      this._initCanvas(16, 16);
    }
  }

  protected firstUpdated(
    _changedProperties: Map<string | number | symbol, unknown>
  ): void {
    this.ctx = this.canvas.getContext("2d");
    window.source.addEventListener("ping", (e: Event) => {
      //console.dir(e);
      const messageEvent = e as MessageEvent;
      const d: String = messageEvent.data;
      if (d.length) {
        const config = JSON.parse(messageEvent.data);
        if (this.width == 0 && this.height == 0) {
          this._initCanvas(config.w, config.h);
        }
      }
    });
  }

  _initCanvas(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.arrayBuffer = new ArrayBuffer(width * height * 4);
    this.typedArray = new Uint8Array(this.arrayBuffer);

    this.canvasWidth = width * canvasScale + canvasBorderWidth * (width + 1);
    this.canvasHeight = height * canvasScale + canvasBorderWidth * (height + 1);
    this.calcScaleX = this.canvasWidth / width;
    this.calcScaleY = this.canvasHeight / height;
    this.canvas.width = this.canvasWidth;
    this.canvas.height = this.canvasHeight;
    //init green
    this._clearBuffer({ r: 0, g: 255, b: 0 });
    this._drawCanvas();
  }

  _clearBuffer(rgb?: any) {
    //default: black
    if (!rgb) rgb = { r: 0, g: 0, b: 0 };
    for (let i = 0; i < this.typedArray.length; i++) {
      this.typedArray[i * 4 + 0] = rgb.r;
      this.typedArray[i * 4 + 1] = rgb.g;
      this.typedArray[i * 4 + 2] = rgb.b;
      this.typedArray[i * 4 + 3] = 0;
    }
  }
  _drawCanvas() {
    if (this.ctx) {
      this.ctx.save();
      this.ctx.clearRect(0, 0, this.canvasWidth, this.canvasHeight);
      this.draw();
      this.ctx.restore();
    }
  }

  //handle palette's color mouse left/right clicks
  handleColorMouseDown(e: MouseEvent) {
    //if left click. set selected color to primary. if right click. to secondary
    const target = e.target as HTMLElement;
    const color = target.getAttribute("color") || "#000000";
    if (e.button == 0) {
      this.primaryColor = color;
    } else if (e.button == 2) {
      this.secondaryColor = color;
    }
  }

  //start painting
  handleCanvasMouseDown(e: MouseEvent) {
    if (e.button === 1) return;
    if (!this.drawing) {
      this.drawing = true;
      this.drawingColorPrimary = e.button == 2 ? false : true;
    }
    const x = this.pixel_x - 1;
    const y = this.pixel_y - 1;
    const rgb = hexToRgb(
      this.drawingColorPrimary ? this.primaryColor : this.secondaryColor
    );
    const should_redraw = this._paintPixel(x, y, rgb);
    if (should_redraw) {
      this._drawCanvas();
      this.callSetPixel(x, y, rgb);
    }
  }

  //release painting
  handleCanvasMouseUp() {
    this.drawing = false;
  }

  //set typedArray pixel's byte from rgb color
  _paintPixel(x: number, y: number, rgb: any) {
    const index = (y * this.width + x) * 4;
    const r = this.typedArray[index];
    const g = this.typedArray[index + 1];
    const b = this.typedArray[index + 2];
    if (r != rgb?.r || g != rgb?.g || b != rgb?.b) {
      this.typedArray[index] = rgb?.r;
      this.typedArray[index + 1] = rgb?.g;
      this.typedArray[index + 2] = rgb?.b;
      this.typedArray[index + 3] = 0;
      return true;
    }
    return false;
  }

  handleCanvasMouseMove(e: MouseEvent) {
    this.mouse_x = e.offsetX;
    this.mouse_y = e.offsetY;
    this.pixel_x = Math.ceil(this.mouse_x / this.calcScaleX);
    this.pixel_y = Math.ceil(this.mouse_y / this.calcScaleY);

    if (this.pixel_x < 1) this.pixel_x = 1;
    if (this.pixel_y < 1) this.pixel_y = 1;
    if (this.pixel_x > this.width) this.pixel_x = this.width;
    if (this.pixel_y > this.height) this.pixel_y = this.height;

    if (!this.drawing) return;

    const rgb = hexToRgb(
      this.drawingColorPrimary ? this.primaryColor : this.secondaryColor
    );
    const x = this.pixel_x - 1;
    const y = this.pixel_y - 1;
    const should_redraw = this._paintPixel(x, y, rgb);
    if (should_redraw) {
      this._drawCanvas();
      this.callSetPixel(x, y, rgb);
    }
  }

  handleCanvasMouseOut(e: MouseEvent) {
    //this.drawing = false;
  }

  handleImport(e: Event) {
    if (!this.importimage?.files) return;
    let imageFile = this.importimage.files[0];
    var reader = new FileReader();
    const me = this;
    reader.onload = function (e) {
      var importimg = document.createElement("img");
      importimg.onload = function () {
        // Dynamically create a canvas element
        const importcanvas = document.createElement("canvas");
        const importctx = importcanvas.getContext("2d");
        if (!importctx) {
          console.log("Could not get context");
          return;
        }
        importctx.imageSmoothingEnabled = false;
        importctx.clearRect(0, 0, me.width, me.height);
        importctx.drawImage(importimg, 0, 0, me.width, me.height);
        const imagedata = importctx.getImageData(0, 0, me.width, me.height);
        for (let i = 0; i < imagedata.data.length; i += 4) {
          me.typedArray[i + 0] = imagedata.data[i + 0];
          me.typedArray[i + 1] = imagedata.data[i + 1];
          me.typedArray[i + 2] = imagedata.data[i + 2];
          me.typedArray[i + 3] = 0;
          me._drawCanvas();
        }
      };
      importimg.src = e.target.result;
    };
    reader.readAsDataURL(imageFile);
  }

  handleExport() {
    const importcanvas = document.createElement("canvas");
    importcanvas.width = this.width;
    importcanvas.height = this.height;
    const importctx = importcanvas.getContext("2d");
    if (!importctx) {
      console.log("Could not get context");
      return;
    }

    const imagedata = importctx.createImageData(this.width, this.height);
    for (let i = 0; i < imagedata.data.length; i += 4) {
      imagedata.data[i + 0] = this.typedArray[i + 0];
      imagedata.data[i + 1] = this.typedArray[i + 1];
      imagedata.data[i + 2] = this.typedArray[i + 2];
      imagedata.data[i + 3] = 255;
    }

    importctx.putImageData(imagedata, 0, 0);

    const anchor = document.createElement("a");
    anchor.href = importcanvas.toDataURL("image/png");
    anchor.download = "IMAGE.PNG";
    anchor.click();
  }

  updated(changedProperties: Map<string, unknown>) {
    super.updated(changedProperties);
  }

  connectedCallback() {
    super.connectedCallback();
    window.source.addEventListener("state", (e: Event) => {
      //console.dir(e);
    });
  }

  callSetPixel(x: number, y: number, rgb: any) {
    return;
    fetch(
      `${basePath}/setpixel/?x=${x}&y=${y}&r=${rgb.r}&g=${rgb.g}&b=${rgb.b}`,
      {
        method: "GET",
      }
    ).then((r) => {
      //console.log(r);
    });
  }

  callSetBuffer() {
    //console.log(this.typedArray);
    const data = new Blob([this.arrayBuffer], {
      type: "octet/stream",
    });
    fetch(`${basePath}/setbuffer`, {
      method: "POST",
      body: data,
    }).then((r) => {
      //console.log(r);
    });
  }

  callGetBuffer() {
    fetch(`${basePath}/getbuffer`, {
      method: "GET",
    }).then((r) => {
      console.log(r);
    });
  }

  draw() {
    const ctx = this.ctx;
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);
    for (let x = 0; x < this.width; x++) {
      for (let y = 0; y < this.height; y++) {
        // draw pixel
        const pixelIndex = (y * this.width + x) * 4;
        const dataview = new DataView(this.arrayBuffer);
        const r = dataview.getUint8(pixelIndex);
        const g = dataview.getUint8(pixelIndex + 1);
        const b = dataview.getUint8(pixelIndex + 2);
        ctx.fillStyle = "rgba(" + r + "," + g + "," + b + ", 0.9)";
        const canvasX = x * canvasScale + canvasBorderWidth * (x + 1);
        const canvasY = y * canvasScale + canvasBorderWidth * (y + 1);
        ctx.fillRect(canvasX, canvasY, canvasScale, canvasScale);
      }
    }

    ctx.strokeStyle = "black";
    ctx.lineWidth = canvasBorderWidth;
    for (
      let x = canvasBorderWidth / 2;
      x < this.canvasWidth;
      x += canvasScale + canvasBorderWidth
    ) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, this.canvasHeight);
      ctx.stroke();
    }
    for (
      let y = canvasBorderWidth / 2;
      y < this.canvasHeight;
      y += canvasScale + canvasBorderWidth
    ) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(this.canvasWidth, y);
      ctx.stroke();
    }
  }

  clearCanvas() {
    this._clearBuffer();
    this._drawCanvas();
  }

  importFile() {
    this.importimage?.click();
  }

  renderPalette() {
    return colorPalette.map(
      (color) =>
        html`<span
          oncontextmenu="return false;"
          @mousedown="${this.handleColorMouseDown}"
          class="color"
          color="${color.color}"
          style="background-color: ${color.color}"
          >${color.short}</span
        >`
    );
  }

  renderHexColor(hex: string) {
    return hex
      .replace("#", "")
      .match(/.{1,2}/g)
      ?.map((v) => {
        return html`${v}<br />`;
      });
  }
  renderRgbColor(hex: string) {
    return hexToRgb(hex)
      ?.short.split(",")
      .map((v) => {
        return html`${v}<br />`;
      });
  }

  render() {
    return html`<link
        href="http://unpkg.com/nes.css/css/nes-core.min.css"
        rel="stylesheet"
      />
      <div>
        <div class="row">
          <div id="display">
            <h2>Display</h2>
            <canvas
              id="canvas"
              oncontextmenu="return false;"
              @mouseup="${this.handleCanvasMouseUp}"
              @mousedown="${this.handleCanvasMouseDown}"
              @mousemove="${this.handleCanvasMouseMove}"
              @mouseleave="${this.handleCanvasMouseOut}"
            ></canvas>
            <div>
              <span id="coords">X:${this.pixel_x},${this.pixel_y}</span>
            </div>
          </div>
        </div>
        <div class="row">
          <div id="maincolors">
            <div id="primary">
              <h3>Primary</h3>
              <span
                class="color"
                style="background-color: ${this.primaryColor}"
                id="primarycolor"
              ></span>
              <span>hex:</span>
              <span class="hex">${this.renderHexColor(this.primaryColor)}</span>
              <span>rgb:</span>
              <span class="rgb">${this.renderRgbColor(this.primaryColor)}</span>
            </div>
            <div id="secondary">
              <h3>Secondary</h3>
              <span
                class="color"
                style="background-color: ${this.secondaryColor}"
                id="secondarycolor"
              ></span>
              <span>hex:</span>
              <span class="hex"
                >${this.renderHexColor(this.secondaryColor)}</span
              >
              <span>rgb:</span>
              <span class="rgb"
                >${this.renderRgbColor(this.secondaryColor)}</span
              >
            </div>
          </div>
        </div>
        <div class="row">
          <div id="tools">
            <h2>Tools</h2>
            <div>
              <div class="tool" tool="brush">
                <h4>Brush</h4>
                <div>size: (//todo: slider)</div>
                <div>shape: (//todo: options square/round)</div>
              </div>
              <div class="tool" tool="picker">
                <h4>Colorpicker</h4>
              </div>
              <div class="tool" tool="bucket"><h4>Fill</h4></div>
              <div class="tool" tool="line"><h4>Line</h4></div>
              <div class="tool" tool="shape">
                <h4>Shapes</h4>
                <div>shape: (//todo: options rectangle round)</div>
                <div>fill: (//todo: checkbox)</div>
                <div>border: (//todo: checkbox)</div>
              </div>
            </div>
          </div>
        </div>
        <div class="row">
          <div id="palette">
            <h2>Palette</h2>
            <div id="colors">${this.renderPalette()}</div>
          </div>
        </div>
        <div class="row">
          <div>
            <h2>Controls</h2>
            <div id="controls">
              <button
                class="nes nes-btn"
                type="button"
                @click="${this.clearCanvas}"
              >
                CLEAR
              </button>
              <button
                class="nes nes-btn"
                type="button"
                @click="${this.callSetBuffer}"
              >
                SEND
              </button>
              <button class="nes nes-btn is-disabled" type="button" disabled>
                RECV
              </button>

              <button
                class="nes nes-btn"
                type="button"
                @click="${this.importFile}"
              >
                IMPORT
              </button>
              <button
                class="nes nes-btn"
                type="button"
                @click="${this.handleExport}"
              >
                EXPORT
              </button>
            </div>
          </div>
        </div>
        <div class="row">
          <input
            type="file"
            id="importimage"
            accept="image/*"
            @change="${this.handleImport}"
          />
        </div>
      </div>`;
  }

  static get styles() {
    return css`
      h2 {
        margin: 20px;
      }
      .color {
        //border: 1px solid;
        display: inline-block;
        margin: 2px;
        width: 32px;
        height: 32px;
        padding: 0;
        border: 2px solid;
        border-radius: 2px;
        box-shadow: 0.5;
        font-size: 12px;
        word-wrap: break-word;
        font-family: monospace;
        text-shadow: 2px;
      }
      #primarycolor,
      #secondarycolor {
        width: 48px;
        height: 48px;
      }
      #canvas {
        background-color: blue;
        border: 10px solid;
      }
      #colors,
      #controls,
      #canvas {
        margin: 0 20px 20px 20px;
      }
      #coords {
        margin: 5px;
      }
      #colors {
        width: 504px;
      }
      .rgb {
        word-wrap: break-word;
        width: 75px;
        display: inline-block;
      }
      .hex {
        word-wrap: break-word;
        width: 75px;
        display: inline-block;
      }
      #importimage {
        display: none;
      }
      #tools h4 {
        text-decoration: underline;
        margin-top: 4px;
      }
    `;
  }
}