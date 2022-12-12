import { LitElement, html, css } from "lit";
import { customElement, state, property } from "lit/decorators.js";

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
    [is-selected="true"] {
      border: 4px solid blue;
    }
    li {
      list-style: none;
    }
  `;

  @state() imageList: Array<PaintImage> = [];
  @state() currentImage: PaintImage | null = null;
  @state() previewWidth: number = 64;
  @state() previewHeight: number = 64;

  _initImageList(width: number, height: number) {
    console.log("initImageList");
    this.addImage(width, height, true);
    //this.requestUpdate();
  }
  _getImageById(id: string | null): PaintImage | null {
    if (!id) return null;
    const imgs = this.imageList.filter((image: PaintImage) => {
      return image.id === id;
    });
    if (imgs.length > 0) return imgs[0];
    return null;
  }

  addImage(width: number, height: number, isinit: bool = false) {
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
    //this.requestUpdate();
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
      this.addImage();
    }
    this.dispatchEvent(
      new CustomEvent("image-changed", { detail: this.currentImage })
    );
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
    window.addEventListener("new-image", (e: Event) => {
      const customEvent = e as CustomEvent;
      console.log("new-image", customEvent.detail);
      this.addImage(customEvent.detail.width, customEvent.detail.height);
      //this.requestUpdate();
      console.dir(this.imageList);
    });

    //console.log("imageList FirstUpdated");
    //if (this.imageList.length === 0) {
    //this._initImageList(10, 10);
    //}
  }

  renderRemoveBtn(id: string) {
    if (this.imageList.length > 1)
      return html`
        <button type="button" image-id=${id} @click=${this.removeImage}>
          remove
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
      <ul>
        ${this.renderImageList()}
      </ul>
    `;
  }
}
