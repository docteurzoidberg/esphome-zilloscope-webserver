import { html, css, LitElement } from "lit";
import { customElement, state, query, property } from "lit/decorators.js";

import "./paint-tools";
import "./paint-tool";
import "./paint-imagelist";

import { PaintImage } from "./paint-imagelist";

//DOC: passer a true pour dev sans les maj zillo
const nozillo = true;

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

interface rgb {
  r: number;
  g: number;
  b: number;
  short: string;
}

interface pixelcoord {
  x: number;
  y: number;
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
  brushSize: number = 0;
  @state()
  eraserSize: number = 1;
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

  toolpreview = false;
  drawing = false;
  drawingColorPrimary = false;

  ctx: any = null;

  @state() currentImage: PaintImage | null = null;
  @property() selectedTool: string = "brush";

  selectedToolElement!: HTMLElement;

  constructor() {
    super();
  }

  protected firstUpdated(
    _changedProperties: Map<string | number | symbol, unknown>
  ): void {
    console.log("firstUpdated");
    console.log(this._getFilledCirclePixels(8, 8, 1));
    this.selectedToolElement = this.renderRoot.querySelector(
      "[name='" + this.selectedTool + "']"
    ) as HTMLElement;

    this.selectedToolElement.setAttribute("selected", "");
    //console.dir(this.selectedToolElement.querySelectorAll("[type=button]"));
    console.log(this.selectedToolElement);
    console.log(this.selectedToolElement.shadowRoot);
    console.log(
      this.selectedToolElement.shadowRoot?.querySelectorAll("button")
    );

    this.ctx = this.canvas.getContext("2d");

    if (nozillo && this.width == 0 && this.height == 0) {
      this.width = 16;
      this.height = 16;
      this._initCanvas(this.width, this.height);
      return;
    }

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

    const event = new CustomEvent("init-canvas", {
      detail: {
        width: width,
        height: height,
      },
    });

    this.arrayBuffer = new ArrayBuffer(width * height * 4);
    this.typedArray = new Uint8Array(this.arrayBuffer);

    this.canvasWidth = width * canvasScale + canvasBorderWidth * (width + 1);
    this.canvasHeight = height * canvasScale + canvasBorderWidth * (height + 1);
    this.calcScaleX = this.canvasWidth / width;
    this.calcScaleY = this.canvasHeight / height;
    this.canvas.width = this.canvasWidth;
    this.canvas.height = this.canvasHeight;

    //init green
    this._clearBuffer(hexToRgb("#00FF00"));
    this._drawCanvas(0);

    window.dispatchEvent(event);
    window.dispatchEvent(
      new CustomEvent("drawing-update", {
        detail: this.typedArray,
      })
    );
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

  _drawCanvas(ts: number) {
    if (this.ctx) {
      this.ctx.save();
      this.ctx.clearRect(0, 0, this.canvasWidth, this.canvasHeight);
      this.draw();
      this.ctx.restore();
    }
    requestAnimationFrame((ts: number) => {
      this._drawCanvas(ts);
    });
  }

  //set typedArray pixel's byte from rgb color
  _paintPixel(x: number, y: number, rgb: rgb) {
    if (x > this.width || x < 0 || y > this.height || y < 0) {
      console.log(`invalid coordinates: x: ${x} y: ${y}`);
      return false;
    }
    const index = (y * this.width + x) * 4;
    const r = this.typedArray[index];
    const g = this.typedArray[index + 1];
    const b = this.typedArray[index + 2];
    if (r != rgb.r || g != rgb.g || b != rgb.b) {
      this.typedArray[index] = rgb.r;
      this.typedArray[index + 1] = rgb.g;
      this.typedArray[index + 2] = rgb.b;
      this.typedArray[index + 3] = 0;
      this.callSetPixel(x, y, rgb);
      return true;
    }
    return false;
  }

  //get color from typedArray pixel's
  _getPixel(x: number, y: number): rgb | null {
    if (x >= this.width || x < 0 || y >= this.height || y < 0) {
      console.log(`invalid coordinates: x: ${x} y: ${y}`);
      return null;
    }
    const index = (y * this.width + x) * 4;
    return {
      r: this.typedArray[index],
      g: this.typedArray[index + 1],
      b: this.typedArray[index + 2],
      short:
        "" +
        this.typedArray[index] +
        "," +
        this.typedArray[index + 1] +
        "," +
        this.typedArray[index + 2],
    };
  }

  _startUseTool(tool: string, x: number, y: number, button: number) {
    console.log("start using " + tool);
    if (!this.drawing) {
      this.drawing = true;
      this.drawingColorPrimary = button == 2 ? false : true;
      this._useTool(tool, x, y);
    }
  }

  _useTool(tool: string, x: number, y: number) {
    console.log(`using ${tool} at ${x},${y}`);
    let should_redraw = false;

    if (tool == "brush") {
      const rgb = hexToRgb(
        this.drawingColorPrimary ? this.primaryColor : this.secondaryColor
      );
      should_redraw = this._useBrush(x, y, rgb, this.brushSize);
    } else if (tool == "eraser") {
      const rgb = hexToRgb("#000000");
      should_redraw = this._useBrush(x, y, rgb, this.eraserSize);
    } else if (tool == "colorpicker") {
      const rgb = this._getPixel(x, y);
      if (!rgb) return;
      if (this.drawingColorPrimary) {
        this.primaryColor = rgbToHex(rgb);
      } else {
        this.secondaryColor = rgbToHex(rgb);
      }
    }

    if (should_redraw) {
      window.dispatchEvent(
        new CustomEvent("drawing-update", {
          detail: this.typedArray,
        })
      );
    }
  }

  _endUseTool() {
    console.log("stop using " + this.selectedTool);
  }

  // use current brush to set pixels
  _useBrush(x: number, y: number, rgb: rgb, size: number) {
    let redraw = false;
    const pixels = this._getBrushPixels(x, y, size);
    console.log('tous les pxels qui sont a draw')
    console.log('tous les pxels qui sont a draw', pixels)
    pixels.forEach((pixel) => {
      if (this._paintPixel(pixel.x, pixel.y, rgb)) redraw = true;
    });
    return redraw;
  }

  _shouldToolPreview() {
    if (this.selectedTool == "brush") return true;
    if (this.selectedTool == "eraser") return true;
    if (this.selectedTool == "colorpicker") return true;
    return false;
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
    const x = this.pixel_x - 1;
    const y = this.pixel_y - 1;
    this._startUseTool(this.selectedTool, x, y, e.button);
  }

  //release painting
  handleCanvasMouseUp() {
    this.drawing = false;
    this._endUseTool();
  }

  handleCanvasMouseMove(e: MouseEvent) {
    this.toolpreview = this._shouldToolPreview();
    this.mouse_x = e.offsetX;
    this.mouse_y = e.offsetY;
    this.pixel_x = Math.ceil(this.mouse_x / this.calcScaleX);
    this.pixel_y = Math.ceil(this.mouse_y / this.calcScaleY);
    if (this.pixel_x < 1) this.pixel_x = 1;
    if (this.pixel_y < 1) this.pixel_y = 1;
    if (this.pixel_x > this.width) this.pixel_x = this.width;
    if (this.pixel_y > this.height) this.pixel_y = this.height;
    if (!this.drawing) return;
    const x = this.pixel_x - 1;
    const y = this.pixel_y - 1;
    this._useTool(this.selectedTool, x, y);
  }

  handleCanvasMouseOut(e: MouseEvent) {
    //this.drawing = false;
    this.toolpreview = false;
  }

  updated(changedProperties: Map<string, unknown>) {
    super.updated(changedProperties);
    //console.log("updated");

    this.shadowRoot?.querySelectorAll(".is_primary").forEach((element) => {
      element.classList.remove("is-primary");
    });

    this.selectedToolElement = this.shadowRoot?.querySelector(
      "paint-tool[name='" + this.selectedTool + "']"
    ) as HTMLElement;

    const selectedToolButton = this.selectedToolElement.querySelector(
      "button"
    ) as HTMLButtonElement;
    if (selectedToolButton) {
      console.log(selectedToolButton);
      selectedToolButton.classList.add("is-primary");
    }
  }

  callSetPixel(x: number, y: number, rgb: rgb) {
    if (nozillo) return;
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
    if (nozillo) return;
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
    if (nozillo) return;
    fetch(`${basePath}/getbuffer`, {
      method: "GET",
    }).then((r) => {
      console.log(r);
    });
  }

  draw() {
    const ctx = this.ctx;
    const tool_x = this.pixel_x - 1;
    const tool_y = this.pixel_y - 1;
    let toolpixels: Set<pixelcoord> = new Set();

    //fill with white backgound (for transparency)
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);

    //draw tool preview?
    if (this.toolpreview) {
      if (this.selectedTool == "brush") {
        toolpixels = this._getBrushPixels(tool_x, tool_y, this.brushSize);
      }
      if (this.selectedTool == "eraser") {
        toolpixels = this._getBrushPixels(tool_x, tool_y, this.eraserSize);
      }
      if (this.selectedTool == "colorpicker") {
        toolpixels = new Set([{ x: tool_x, y: tool_y }]);
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

    //drawing buffer to canvas
    for (let x = 0; x < this.width; x++) {
      for (let y = 0; y < this.height; y++) {
        // get color from buffer
        const pixelIndex = (y * this.width + x) * 4;
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

        //preview tool path
        if (this.toolpreview) {
          let previewPixels = new Set();

          for (let item of toolpixels) {
            if (item.x == x && item.y == y) {
              previewPixels.add(item)
            }
          }

          if (previewPixels.size >= 1) {
            ctx.fillStyle = "rgba(255,0,0,0.2)";
            ctx.fillRect(canvasX, canvasY, canvasScale, canvasScale);
            ctx.lineWidth = canvasBorderWidth;
            ctx.strokeStyle = "rgba(255,0,0,1)";
            ctx.strokeRect(canvasX, canvasY, canvasScale, canvasScale);
            //todo: tester si ya des 'pixels voisins' et ne dessiner que les bordures exterieures a la forme
          }
        }
      }
    }
  }

  _getHorizontalLinePixels(x: number, y: number, w: number): Array<pixelcoord> {
    let pixels = [];
    // Future: Could be made more efficient by manipulating buffer directly in certain rotations.
    for (let i = x; i < x + w; i++) pixels.push({ x: i, y: y } as pixelcoord);
    return pixels;
  }

  _getVerticalLinePixels(x: number, y: number, h: number): Array<pixelcoord> {
    let pixels = [];
    // Future: Could be made more efficient by manipulating buffer directly in certain rotations.
    for (let i = y; i < y + h; i++) pixels.push({ x: x, y: i } as pixelcoord);
    return pixels;
  }

  _getFilledCirclePixels(center_x: number, center_y: number, radius: number) {
    let dx = -radius;
    let dy = 0;
    let err = 2 - 2 * radius;
    let e2;
    let pixels: Set<pixelcoord> = new Set

    if (radius < 3) {
      for (let i = 0; i <= radius; i++) {
        for (let j = 0; j <= radius; j++) {
          if ((i + j) > radius) {
            continue
          }
          console.log('center', center_x + j)
          console.log('this.width', this.width)
          console.log('y', j)
          if ((center_x + j) < this.width) {
            pixels.add({ x: center_x + j, y: center_y + i });
          }
          pixels.add({ x: center_x - j, y: center_y - i });
          pixels.add({ x: center_x - i, y: center_y + j });
          pixels.add({ x: center_x + i, y: center_y - j });
        }
      }
      return pixels
    }


    do {
      pixels.add({ x: center_x - dx, y: center_y + dy });
      pixels.add({ x: center_x + dx, y: center_y + dy });
      pixels.add({ x: center_x + dx, y: center_y - dy });
      pixels.add({ x: center_x - dx, y: center_y - dy });
      let hline_width = 2 * -dx + 1;
      this._getHorizontalLinePixels(
        center_x + dx,
        center_y + dy,
        hline_width
      ).forEach((pixel) => pixels.add(pixel));
      this._getHorizontalLinePixels(
        center_x + dx,
        center_y - dy,
        hline_width
      ).forEach((pixel) => pixels.add(pixel));
      e2 = err;
      if (e2 < dy) {
        err += ++dy * 2 + 1;
        if (-dx == dy && e2 <= dx) {
          e2 = 0;
        }
      }
      if (e2 > dx) {
        err += ++dx * 2 + 1;
      }
    } while (dx <= 0);
    return pixels;
  }
  _getBrushPixels(
    x: number,
    y: number,
    size: number,
    shape: string = "circle"
  ): Set<pixelcoord> {
    let pixels: Set<pixelcoord> = new Set
    if (shape == "square") {
      if (size == 1) {
        return new Set([{ x: x, y: y }]);
      }
      for (let px = -Math.floor(size / 2); px < size - 1; px++) {
        for (let py = -Math.floor(size / 2); py < size - 1; py++) {
          const nx = x + px;
          const ny = y + py;
          if (nx < 0 || ny < 0 || nx > this.width || ny > this.height) continue;
          pixels.add({ x: nx, y: ny });
        }
      }
    } else if (shape == "circle") {
      pixels = this._getFilledCirclePixels(x, y, size);
    }
    return pixels;
  }

  clearCanvas() {
    this._clearBuffer();
    window.dispatchEvent(
      new CustomEvent("drawing-update", {
        detail: this.typedArray,
      })
    );
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

  _updateBrushSize(e: any) {
    const [element] = e.composedPath();
    console.log(element.value);
    this.brushSize = element.value;
  }

  _updateEraserSize(e: any) {
    const [element] = e.composedPath();
    console.log(element.value);
    this.eraserSize = element.value;
  }

  _onToolChanged(event: Event) {
    const target = event.target as any;
    this.selectedTool = target.name;
    this.selectedToolElement = this.renderRoot.querySelector(
      "[name='" + this.selectedTool + "']"
    ) as HTMLElement;

    this.renderRoot.querySelectorAll("paint-tool").forEach((toolelement) => {
      toolelement.shadowRoot
        ?.querySelectorAll(".is-primary")
        .forEach((buttonelement) => {
          buttonelement.classList.remove("is-primary");
        });
      toolelement.removeAttribute("selected");
    });

    if (this.selectedToolElement.shadowRoot) {
      this.selectedToolElement.shadowRoot
        .querySelector("button")
        ?.classList.add("is-primary");
    }

    this.selectedToolElement.setAttribute("selected", "");
    console.log(this.selectedTool);
    console.log(this.selectedToolElement);
  }

  sendNewImageEvent() {
    console.log("dispatch event");
    window.dispatchEvent(
      new CustomEvent("new-image", {
        detail: {
          width: this.width,
          height: this.height,
        },
      })
    );
  }

  handleImageListChange(e: CustomEvent) {
    console.log("image-changed");
    const img = e.detail as PaintImage;
    this.currentImage = img;
    const ctx = img.canvas.getContext("2d");
    if (!ctx) return;
    const imageData = ctx.getImageData(
      0,
      0,
      img.canvas.width,
      img.canvas.height
    );

    //convert imageData to uint8buffer
    for (let i = 0; i < this.typedArray.length; i += 4) {
      this.typedArray[i + 0] = imageData?.data[i + 0];
      this.typedArray[i + 1] = imageData?.data[i + 1];
      this.typedArray[i + 2] = imageData?.data[i + 2];
      this.typedArray[i + 3] = 0;
    }
  }

  render() {
    return html`<link
        href="http://unpkg.com/nes.css/css/nes-core.min.css"
        rel="stylesheet"
      />
      <div>
        <div class="row" id="toolsrow">
          <div class="col" id="tools">
            <h2>Tools</h2>
            <paint-tools>
              <paint-tool name="brush" @tool-selected="${this._onToolChanged}">
                <img
                  slot="icon"
                  width="32"
                  height="32"
                  src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAAAXNSR0IArs4c6QAAAJdJREFUWIXtlEEOhCAMRR+TuRSHY8Xh4FZ1xSRMHNSKqWb6lgql/1EFx/l3wsRaoqn9mtiAihkGBECkFxDCp/TwjEcbGCZPKQGQcx6eZW7grdhzNPkQcwNHZkCb/PlfwSXJG7c2IACllO5hjBE4n7xxfwPt7mut3ctmYmetn5gb2PwTfk/72pIzDZgb2JwB5d7dmBtwHGcBx7Qxn2rRvkEAAAAASUVORK5CYII="
                  alt="pencil"
                />
                <span slot="title">Pencil</span>
                <section slot="options">
                  <div>size: ${this.brushSize}</div>
                  <input
                    type="range"
                    min="0"
                    max="5"
                    value="0"
                    step="1"
                    @change="${this._updateBrushSize}"
                  />
                  <div>shape: (//todo: options square/round)</div>
                </section>
              </paint-tool>
              <paint-tool name="eraser" @tool-selected="${this._onToolChanged}">
                <img
                  slot="icon"
                  width="32"
                  height="32"
                  src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAAAXNSR0IArs4c6QAAAJRJREFUWIXtlEEOAiEMRZ/GS3E4Vr0TV4Bb1VVjNIidQcNM7Fu3pe+HFIIg+HcuE73qKco5AyAi3beuEwt8hduOHgVQHQfQWgMgpTSsO1UCm8xLKa6hp0jgJ+bGoROYMhcR4OkOdPsPnQDwMPTSMR9e2+UJjLZTgFqra5BdPK+5sTyBt3/ATD7d8td6r7mxPIEgCII7QIM8GpY9O8kAAAAASUVORK5CYII="
                  alt="eraser"
                />
                <span slot="title">Eraser</span>
                <section slot="options">
                  <div>size:</div>
                  <input
                    type="range"
                    min="1"
                    max="5"
                    value="1"
                    step="2"
                    @change="${this._updateEraserSize}"
                  />
                  <div>shape: (//todo: options square/round)</div>
                </section>
              </paint-tool>
              <paint-tool
                name="colorpicker"
                @tool-selected="${this._onToolChanged}"
              >
                <img
                  slot="icon"
                  width="32"
                  height="32"
                  src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAAAXNSR0IArs4c6QAAAKpJREFUWIXtlEEOwyAMBIcqn4K3ceRt8Cz3UCElKUmhAblRmRtIYHZkA5N/xwy8W2pqPQY+oIoRBgRA5CXAmLcSmw11A8uFswLgvQcghMB6XUheRN1Ajx4QgBgjAM65plq3NvCp26tqqBv4Zgo2yVNKrNfZxH46jriVgWJyay3QnjyjbqBmClqTN02WuoHqHuidPKNu4OzVpz/d1eSZ3zeQ6ZV4j7qByWTyBNagQ/hk9Pj2AAAAAElFTkSuQmCC"
                  alt="colorpicker"
                />
                <span slot="title">Colorpicker</span>
                <section slot="options"></section>
              </paint-tool>
              <paint-tool name="fill" @tool-selected="${this._onToolChanged}">
                <img
                  slot="icon"
                  width="32"
                  height="32"
                  src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAAAXNSR0IArs4c6QAAAIhJREFUWIXtlkEOgCAMBFfjtznxN761XjgYhWhpk4p2jk3ZlG0DBYK/syjO0kJrVRRggrjqlBIBIOd8jqPGRZrzOYBr71Wa8zjQ630jDzXvkfY8DuC+90Pa7g6ICyAJUmqGYQHWmM3AYfpF2u4ObFqBxs1FuDsQf0EwvBH1eN1GVEqxe7eD4JPsvt0mbk13t8AAAAAASUVORK5CYII="
                  alt="fill"
                />
                <span slot="title">Fill</span>
                <section slot="options"></section>
              </paint-tool>
              <paint-tool name="line" @tool-selected="${this._onToolChanged}">
                <img
                  slot="icon"
                  width="32"
                  height="32"
                  src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAAAXNSR0IArs4c6QAAAHBJREFUWIXtkrEKwDAIBV9Lf9vJD0+mByWDlFaJUm/LorlDoGn+zhE1WEQGAKiqueuM+sBTLu+Bq7mI4P5e2V7A7QYMc3NH/QJvzUndAl/NSb0CXuakTgFvc5K/QJQ5yVsg2pzkLQBgAHHmZHuBpmkmVPFAIfAsahQAAAAASUVORK5CYII="
                  alt="line"
                />
                <span slot="title">Line</span>
                <section slot="options"></section>
              </paint-tool>
              <paint-tool
                class="tool"
                name="shape"
                @tool-selected="${this._onToolChanged}"
              >
                <span slot="title">Shapes</span>
                <img
                  slot="icon"
                  width="32"
                  height="32"
                  src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAAAXNSR0IArs4c6QAAAGRJREFUWIXtlTEOgDAMAw/Eq/K3TPlbvlUWkDq0DASpA77VUmx5iEEI8Xe2meDuDSAiSgbuznVn6LWXrn/AtAGgAWRmycDMHr2WN6AACqAACqAAx0y4V6z75a/o1nCoL29ACCFOPEYQRkhdfHgAAAAASUVORK5CYII="
                  alt="shape"
                />
                <section slot="options">
                  <div>shape: (//todo: options rectangle round)</div>
                  <div>fill: (//todo: checkbox)</div>
                  <div>border: (//todo: checkbox)</div>
                </section>
              </paint-tool>
            </paint-tools>
          </div>
          <div class="col" id="controls">
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
            </div>
          </div>
        </div>

        <div class="row" id="canvasrow">
          <div id="display" class="col">
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
          <div id="files" class="col">
            <h2>Files</h2>

            <paint-imagelist
              id="imagelist"
              @image-changed="${this.handleImageListChange}"
            >
            </paint-imagelist>
          </div>
        </div>

        <div class="row" id="paletterow">
          <div id="maincolors" class="col">
            <h2>Colors</h2>
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
          <div id="palette" class="col">
            <h2>Palette</h2>
            <div id="colors">${this.renderPalette()}</div>
          </div>
        </div>

        <div class="row"></div>
      </div>`;
  }

  static get styles() {
    return css`
      [selected] button {
        background-color: blue;
      }
      paint-tool[selected] [slot="title"] {
        font-weight: bold;
        text-decoration: underline;
      }
      paint-tool:not([selected]) [slot="options"] {
        display: none;
      }
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

      #tools h4 {
        text-decoration: underline;
        margin-top: 4px;
      }
      //#imagelist {
      //  position: absolute;
      //  left: 500px;
      //}
      .row {
        display: flex;
        flex-direction: row;
        flex-wrap: nowrap;
        justify-content: flex-start;
        align-content: stretch;
        align-items: flex-start;
        //border: 4px solid red;
      }
      .col {
        //border: 4px solid;
      }

      #toolsrow:nth-child(1) {
        order: 0;
        flex: 1 1 auto;
        align-self: stretch;
      }

      #toolsrow:nth-child(2) {
        order: 0;
        flex: 0 1 auto;
        align-self: stretch;
      }

      #canvasrow:nth-child(1) {
        order: 0;
        flex: 1 1 auto;
        align-self: stretch;
      }

      #canvasrow:nth-child(2) {
        order: 0;
        flex: 0 1 auto;
        align-self: stretch;
      }

      #paletterow:nth-child(1) {
        order: 0;
        flex: 0 1 auto;
        align-self: stretch;
      }

      #paletterow:nth-child(2) {
        order: 0;
        flex: 1 1 auto;
        align-self: stretch;
      }

      :host {
        pointer-events: auto;
        cursor: url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAABFklEQVRYR9WXURLDIAhE6/0PbSdOtUpcd1Gnpv1KGpTHBpCE1/cXq+vrMph7dGvXZTtpfW10DCA5jrH1H0Jhs5E0hnZdCR+vb5S8Nn8mQCeS9BdSalYJqMBjAGzq59xAESN7VFVUgV8AZB/dZBR7QTFDCqGquvUBVVoEtgIwpQRzmANSFHgWQKExHdIrPeuMvQNDarXe6nC/AutgV3JW+6bgqQLeV8FekRtgV+ToDKEKnACYKsfZjjkam7a0ZpYTytwmgainpC3HvwBocgKOxqRjehoR9DFKNFYtOwCGYCszobeCbl26N6yyQ6g8X/Wex/rBPsNEV6qAMaJPMynIHQCoSqS9JSMmwef51LflTgCRszU7DvAGiV6mHWfsaVUAAAAASUVORK5CYII=),
          auto;
      }
    `;
  }
}
