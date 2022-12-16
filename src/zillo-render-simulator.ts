import { html, css, LitElement } from "lit";
import { customElement, state, query, property } from "lit/decorators.js";

//DOC: passer a true pour dev sans les maj zillo
const nozillo = true;
const canvasScale = 20;
const canvasBorderWidth = 4;

interface rgb {
  r: number;
  g: number;
  b: number;
  short: string;
}

const rgbToHex = (rgb: rgb) => {
  return (
    "#" +
    ((1 << 24) | (rgb.r << 16) | (rgb.g << 8) | rgb.b).toString(16).slice(1)
  );
};

const hexToRgb = (hex: string): rgb => {
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
    : {
        r: 0,
        g: 0,
        b: 0,
        short: "00,00,00",
      };
};

@customElement("zillo-render-simulator")
export default class ZilloRenderSimulator extends LitElement {
  @query("#displaycanvas")
  canvas!: HTMLCanvasElement;

  @state()
  displayWidth: number = 0;
  @state()
  displayHeight: number = 0;
  @state()
  canvasWidth: number = 0;
  @state()
  canvasHeight: number = 0;

  @state()
  pixel_x: number = 0;
  @state()
  pixel_y: number = 0;

  mouse_x: number = 0;
  mouse_y: number = 0;
  canvasCalcScaleX: number = 0;
  canvasCalcScaleY: number = 0;
  ctx: any = null;
  arrayBuffer!: ArrayBuffer;
  typedArray!: Uint8Array;

  _initCanvas(width: number, height: number) {
    this.arrayBuffer = new ArrayBuffer(width * height * 4);
    this.typedArray = new Uint8Array(this.arrayBuffer);
    this.canvasWidth = width * canvasScale + canvasBorderWidth * (width + 1);
    this.canvasHeight = height * canvasScale + canvasBorderWidth * (height + 1);
    this.canvasCalcScaleX = this.canvasWidth / width;
    this.canvasCalcScaleY = this.canvasHeight / height;
    this.canvas.width = this.canvasWidth;
    this.canvas.height = this.canvasHeight;
    this._clearBuffer();
    this._draw();
  }

  _clearBuffer(rgb?: rgb) {
    //default: black
    if (!rgb) rgb = hexToRgb("#000000");
    for (let i = 0; i < this.typedArray.length; i += 4) {
      this.typedArray[i + 0] = rgb.r;
      this.typedArray[i + 1] = rgb.g;
      this.typedArray[i + 2] = rgb.b;
      this.typedArray[i + 3] = 0;
    }
  }

  _draw() {
    if (this.ctx) {
      this.ctx.save();
      this.ctx.clearRect(0, 0, this.canvasWidth, this.canvasHeight);
      this._drawCanvas();
      this.ctx.restore();
    }
  }

  _drawCanvas() {
    const ctx = this.ctx;

    //fill with white backgound (for transparency)
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);

    //drawing buffer to canvas
    for (let x = 0; x < this.displayWidth; x++) {
      for (let y = 0; y < this.displayHeight; y++) {
        // get color from buffer
        const pixelIndex = (y * this.displayWidth + x) * 4;
        const dataview = new DataView(this.arrayBuffer);
        const r = dataview.getUint8(pixelIndex);
        const g = dataview.getUint8(pixelIndex + 1);
        const b = dataview.getUint8(pixelIndex + 2);
        //put pixel color but at 0.9 alpha on canvas
        ctx.fillStyle = "rgba(" + r + "," + g + "," + b + ", 0.9)";
        const canvasX = x * canvasScale + canvasBorderWidth * (x + 1);
        const canvasY = y * canvasScale + canvasBorderWidth * (y + 1);
        //draw scaled pixel rect
        ctx.fillRect(canvasX, canvasY, canvasScale, canvasScale);
      }
    }

    //Draw grid
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

  handleCanvasMouseDown(e: MouseEvent) {
    if (e.button === 1) return;
  }

  handleCanvasMouseUp() {}

  handleCanvasMouseMove(e: MouseEvent) {
    this.mouse_x = e.offsetX;
    this.mouse_y = e.offsetY;
    this.pixel_x = Math.ceil(this.mouse_x / this.canvasCalcScaleX);
    this.pixel_y = Math.ceil(this.mouse_y / this.canvasCalcScaleY);
    if (this.pixel_x < 1) this.pixel_x = 1;
    if (this.pixel_y < 1) this.pixel_y = 1;
    if (this.pixel_x > this.displayWidth) this.pixel_x = this.displayWidth;
    if (this.pixel_y > this.displayHeight) this.pixel_y = this.displayHeight;
  }

  handleCanvasMouseOut(e: MouseEvent) {}

  protected firstUpdated(
    _changedProperties: Map<string | number | symbol, unknown>
  ): void {
    this.ctx = this.canvas.getContext("2d");
    if (nozillo && this.displayWidth == 0 && this.displayHeight == 0) {
      this.displayWidth = 16;
      this.displayHeight = 16;
      this._initCanvas(this.displayWidth, this.displayHeight);
      return;
    }
  }

  static getStyles() {
    return css`
      #displaycanvas {
        background-color: blue;
        border: 10px solid;
        margin: 0 20px 20px 20px;
      }
    `;
  }

  render() {
    return html`
      <div id="simulatordisplay" class="col">
        <h2>Display</h2>
        <canvas
          id="displaycanvas"
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
    `;
  }
}
