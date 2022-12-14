import { LitElement, html, css } from "lit";
import { customElement, query, state, property } from "lit/decorators.js";

export interface PaintImage {
  canvas: HTMLCanvasElement;
  id: string;
}

const getUniqueID = () => {
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
};

@customElement("paint-imagelist")
export class PaintImageList extends LitElement {
  static styles = css`
    #importimage {
      display: none;
    }
    [is-selected="true"] {
      border: 6px solid rgb(16, 141, 224);
    }
    ul {
      margin: 0;
      padding: 0;
    }
    li {
      list-style: none;
    }
    img {
      image-rendering: -moz-crisp-edges;
      image-rendering: -moz-crisp-edges;
      image-rendering: -o-crisp-edges;
      image-rendering: -webkit-optimize-contrast;
      -ms-interpolation-mode: nearest-neighbor;
      image-rendering: pixelated;
    }
  `;

  @query("#importimage")
  importimage!: HTMLInputElement;

  @state() imageList: Array<PaintImage> = [];
  @state() currentImage: PaintImage | null = null;

  //preview size
  @state() previewWidth: number = 64;
  @state() previewHeight: number = 64;

  //size for new images (after init)
  @property() imagesWidth: number = 0;
  @property() imagesHeight: number = 0;

  _initImageList(width: number, height: number) {
    this.imagesWidth = width;
    this.imagesHeight = height;
    console.log("initImageList");
    this._addImage(width, height, true);
  }
  _getImageById(id: string | null): PaintImage | null {
    if (!id) return null;
    const imgs = this.imageList.filter((image: PaintImage) => {
      return image.id === id;
    });
    if (imgs.length > 0) return imgs[0];
    return null;
  }

  _addImage(width: number, height: number, isinit: boolean = false) {
    const newcanvas = document.createElement("canvas") as HTMLCanvasElement;
    newcanvas.width = width;
    newcanvas.height = height;
    const ctx = newcanvas.getContext("2d");
    ctx?.fillRect(0, 0, newcanvas.width, newcanvas.height);
    const id = getUniqueID();
    const newimage = { canvas: newcanvas, id: id };
    this.imageList.push(newimage);
    this.currentImage = newimage;

    //eviter de declencher deux fois le drawing-update en notifiant le changement d'image alors que init
    if (!isinit)
      this.dispatchEvent(
        new CustomEvent("image-changed", { detail: newimage })
      );
  }

  selectImage(e: Event) {
    const target = e.target as HTMLImageElement;
    if (this.currentImage?.id == target.id) return;
    this.currentImage = this._getImageById(target.id);
    this.dispatchEvent(
      new CustomEvent("image-changed", { detail: this.currentImage })
    );
  }

  removeImage(e: Event) {
    const target = e.target as HTMLButtonElement;
    const imgid = target.getAttribute("image-id");
    this.imageList = this.imageList.filter((img) => {
      if (img.id === imgid) {
        return false;
      }
      return true;
    });
    if (imgid === this.currentImage?.id) {
      this.currentImage = this.imageList[this.imageList.length - 1];
    }
    if (this.imageList.length === 0) {
      this._addImage(this.imagesWidth, this.imagesHeight);
    }
    this.dispatchEvent(
      new CustomEvent("image-changed", { detail: this.currentImage })
    );
  }

  handleFileInputChange(e: Event) {
    if (!this.importimage?.files) return;
    let imageFile = this.importimage.files[0];
    var reader = new FileReader();
    const me = this;
    reader.onload = function (e) {
      var importimg = document.createElement("img");
      importimg.onload = function () {
        // Dynamically create a canvas element
        me._addImage(me.imagesWidth, me.imagesHeight, true);
        if (!me.currentImage) return;
        const importctx = me.currentImage?.canvas.getContext("2d");
        if (!importctx) {
          console.log("Could not get context");
          return;
        }
        importctx.imageSmoothingEnabled = false;
        importctx.clearRect(0, 0, me.imagesWidth, me.imagesHeight);
        importctx.drawImage(importimg, 0, 0, me.imagesWidth, me.imagesHeight);
        me.dispatchEvent(
          new CustomEvent("image-changed", { detail: me.currentImage })
        );
      };
      importimg.src = e.target?.result as string;
    };
    reader.readAsDataURL(imageFile);
  }

  handleNewImageClick() {
    this._addImage(this.imagesWidth, this.imagesHeight);
  }

  handleImportImageClick() {
    this.importimage?.click();
  }

  handleExportImageClick() {
    if (!this.currentImage) return;
    const anchor = document.createElement("a");
    anchor.href = this.currentImage.canvas.toDataURL("image/png");
    anchor.download = "IMAGE.PNG";
    anchor.click();
  }

  constructor() {
    super();
    window.addEventListener("init-canvas", (e: Event) => {
      const customEvent = e as CustomEvent;
      console.log("init", customEvent);
      this._initImageList(customEvent.detail.width, customEvent.detail.height);
    });
    window.addEventListener("drawing-update", (e: Event) => {
      if (!this.currentImage) return;
      const customEvent = e as CustomEvent;

      const newImageBinary = customEvent.detail as Uint8Array;
      if (!newImageBinary) return;

      console.log("drawing-update");
      console.dir(newImageBinary);
      const canvas = this.currentImage.canvas;
      if (!canvas) return;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const imageData = ctx.createImageData(canvas.width, canvas.height);

      for (let i = 0; i < imageData.data.length; i += 4) {
        const r = newImageBinary[i];
        const g = newImageBinary[i + 1];
        const b = newImageBinary[i + 2];
        imageData.data[i + 0] = r;
        imageData.data[i + 1] = g;
        imageData.data[i + 2] = b;
        imageData.data[i + 3] = 255;
      }
      ctx.putImageData(imageData, 0, 0);
      console.log("drawing-updated");
      this.requestUpdate();
    });
  }

  protected firstUpdated(
    _changedProperties: Map<string | number | symbol, unknown>
  ): void {
    console.log("ImageList FirstUpdated");
  }

  renderRemoveBtn(id: string) {
    if (this.imageList.length > 1)
      return html`
        <button
          class="nes-btn btn is-error"
          type="button"
          image-id=${id}
          @click=${this.removeImage}
        >
          -
        </button>
      `;
    else return html``;
  }

  renderImageList() {
    return this.imageList.map((img) => {
      return html`<li>
        <img
          id=${img.id}
          src="${img.canvas.toDataURL()}"
          width="${this.previewWidth}"
          height="${this.previewHeight}"
          @click="${this.selectImage}"
          is-selected="${this.currentImage?.id === img.id}"
        />
        ${this.renderRemoveBtn(img.id)}
      </li>`;
    });
  }
  render() {
    return html`
      <link
        href="http://unpkg.com/nes.css/css/nes-core.min.css"
        rel="stylesheet"
      />
      <input
        id="importimage"
        type="file"
        accept="image/png"
        @change="${this.handleFileInputChange}"
      />
      <div class="buttons">
        <button
          class="nes-btn btn new-btn is-primary"
          type="button"
          @click="${this.handleNewImageClick}"
        >
          New
        </button>
        <button
          class="nes-btn btn import-btn"
          type="button"
          @click="${this.handleImportImageClick}"
        >
          Import
        </button>
        <button
          class="nes-btn btn export-btn"
          type="button"
          @click="${this.handleExportImageClick}"
        >
          Export
        </button>
      </div>
      <div>
        <ul>
          ${this.renderImageList()}
        </ul>
      </div>
    `;
  }
}
