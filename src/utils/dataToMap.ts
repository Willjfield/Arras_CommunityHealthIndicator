import type { Icon, IndicatorConfig } from "../types/IndicatorConfig";
import type { Map } from "maplibre-gl";
import type { Emitter } from "mitt";
import maplibregl from "maplibre-gl";
import { createApp, type App, reactive } from "vue";
import Popup from "../components/Popup.vue";
import vuetify from "../plugins/vuetify.js";

//import useIndicatorLevelStore from "../stores/indicatorLevelStore.js";



export class DataToMap {
  readonly data: IndicatorConfig;
  private readonly map: Map;
  protected readonly emitter?: Emitter<any>;
  events: { click: any; mousemove: any; mouseleave: any };
  year: number | null;
  side: "left" | "right" | null;
  protected popup: any = null;
  protected frozenPopup: boolean = false;
  protected popupApp: App | null = null;
  protected highlightedGeoid: string | null = null;
  protected lastPopupGeoid: string | null = null;
  protected popupProperties: ReturnType<typeof reactive> | null = null;
  protected arrasBranding: any;
  protected sitePath: string;
  constructor(
    _data: IndicatorConfig,
    _map: Map,
    side: "left" | "right" | null = null,
    _emitter?: Emitter<any>,
    _arrasBranding?: any,
    _sitePath?: string
  ) {
    this.data = _data;
    this.map = _map;
    this.emitter = _emitter;
    this.events = {
      click: null,
      mousemove: null,
      mouseleave: null,
    };
    this.year = null;
    this.side = side;
    this.highlightedGeoid = null;
    this.arrasBranding = _arrasBranding;
    this.sitePath = _sitePath || '';
    // console.log(this.arrasBranding.colors)
  }

  protected resolveIconPath(filename: string): string {
    // If it's already an absolute URL, return as-is
    if (filename.startsWith('http://') || filename.startsWith('https://')) {
      return filename;
    }
    // If it starts with /, it's already a root path - prepend sitePath
    if (filename.startsWith('/')) {
      return this.sitePath + filename;
    }
    // Otherwise, treat as relative and prepend sitePath + /
    return this.sitePath + '/' + filename;
  }

  async setupIndicator(year: number | null): Promise<boolean> {
    this.year = year || this.year || null;
    console.log(this.year);
    return true;
  }

  generateGeojson() {}

  async addIconsToMap() {
    if (!this.map) return false;
    const icons: Icon[] = this.data.icons;
    //If, in the future, we want to add more than one icon, we need to change this to a loop. For now we assume there is one and it is used as the "main" one
    if (icons && icons.length === 1) {
      if (icons[0]?.filename?.endsWith(".svg")) {
        const iconPath = this.resolveIconPath(icons[0].filename as string);
        const svg = await fetch(iconPath).then((res) =>
          res.text()
        );
        const imgElement = await this.svgToPng(svg, false);
        const image = await this.map.loadImage(imgElement.src);
        if (!this.map.hasImage(icons[0].name)) {
          this.map.addImage(icons[0].name, (image as any).data);
        }
        const imgElementInverted = await this.svgToPng(svg, true);
        const imageInverted = await this.map.loadImage(imgElementInverted.src);
        if (!this.map.hasImage(icons[0].name + "-invert")) {
          this.map.addImage(icons[0].name + "-invert", (imageInverted as any).data);
        }
      } else {
        const iconPath = this.resolveIconPath(icons[0].filename as string);
        const img = await this.map.loadImage(iconPath);

        if (!this.map.hasImage(icons[0].name)) {
          this.map.addImage(icons[0].name, img.data, { sdf: true });
        }
       
      }
      this.map.setLayoutProperty(
        this.data.layers.main,
        "icon-image",
        icons[0].name as string
      );
      return true;
    }
    return false;
  }

  hideLayers() {
    if (!this.map) return;
    if (this.data.layers.main) {
      this.map.setLayoutProperty(this.data.layers.main, "visibility", "none");
    }
    if (this.data.layers.outline) {
      this.map.setLayoutProperty(
        this.data.layers.outline,
        "visibility",
        "none"
      );
    }
    if (this.data.layers.circle) {
      this.map.setLayoutProperty(this.data.layers.circle, "visibility", "none");
    }
  }

  //This may be getting called too much but not a huge problem. Better than not enough.
  removeOldEvents() {
    if (!this.map) {
      // Clean up popup even if map is gone
      if (this.popupApp) {
        this.popupApp.unmount();
        this.popupApp = null;
      }
      if (this.popup) {
        this.popup.remove();
        this.popup = null;
      }
      return;
    }
    if (this.events.click) {
      this.map.off("click", this.events.click);
    }
    if (this.events.mousemove) {
      this.map.off("mousemove", this.events.mousemove);
    }
    if (this.events.mouseleave) {
      this.map.off("mouseleave", this.events.mouseleave);
    }
    if (this.popupApp) {
      this.popupApp.unmount();
      this.popupApp = null;
    }
    if (this.popup) {
      this.popup.remove();
      this.popup = null;
    }
  }
  addNewEvents() {
    this.events.mouseleave = () => {
      this.removePopup();
    };
    const mainLayer = (this as any).data.layers.main;
    this.map.on("mouseleave", mainLayer, this.events.mouseleave);
  }

  protected createPopupIfNeeded() {
    if (!this.popup) {
      this.popup = new maplibregl.Popup({
        closeButton: true,
        closeOnClick: false,
        closeOnMove: false,
        // offset: this.side === 'right' ? [-10, 0] : [10, 0],
        // anchor: this.side as 'left' | 'right' | undefined,
        focusAfterOpen: false,
      });
    }
  }

  protected showPopup(lngLat: any, properties: any, side: "left" | "right") {
    if (!this.map) return;

    // Get the geoid from properties (could be properties.geoid or properties.id, etc.)
    const currentGeoid = properties?.geoid || properties?.id || null;
    const geoidChanged = currentGeoid !== this.lastPopupGeoid;

    // Use unique container ID based on side to avoid conflicts between left and right popups
    const containerId = `popup-container-${side}`;
    this.createPopupIfNeeded();

    // Always update popup position
    this.popup.setLngLat(lngLat);

    // Only recreate the HTML container if geoid changed or popup doesn't exist
    if (geoidChanged || !this.popupApp) {
      this.popup.setHTML(`<div id="${containerId}"></div>`).addTo(this.map);
    }

    const popupContainer = document.getElementById(containerId);

    if (popupContainer) {
      if (geoidChanged || !this.popupApp) {
        // Unmount existing app if it exists
        if (this.popupApp) {
          this.popupApp.unmount();
          this.popupApp = null;
        }

        // Create reactive object for properties
        this.popupProperties = reactive({ ...properties });

        // Create and mount new app instance with reactive properties
        this.popupApp = createApp(Popup, {
          properties: this.popupProperties,
          side,
        }).use(vuetify);
        this.popupApp.mount(popupContainer);

        // Update last geoid
        this.lastPopupGeoid = currentGeoid;
      } else {
        // Same geoid - just update the reactive properties by copying new values
        if (this.popupProperties) {
          Object.assign(this.popupProperties, properties);
        }
      }
    }
  }

  protected removePopup() {
    if (this.popupApp) {
      this.popupApp.unmount();
      this.popupApp = null;
    }
    if (this.popup) {
      this.popup.remove();
      this.popup = null;
    }
    this.lastPopupGeoid = null;
    this.popupProperties = null;
  }

  async setPaintAndLayoutProperties(year: number | null) {
    if (!this.map) return false;
    this.year = year || this.year || null;
    try {
      await this.addIconsToMap(); //Add the icon to the map
    } catch (error) {
      console.error(error);
    } finally {
      if (this.map && this.data.layers.main) {
        this.map.setLayoutProperty(
          this.data.layers.main,
          "visibility",
          "visible"
        );
      }
      if (this.map && this.data.layers.outline) {
        this.map.setLayoutProperty(
          this.data.layers.outline,
          "visibility",
          "visible"
        );
      }
      return true;
    }
  }

  
async svgToPng(svg: string, invertColors: boolean = false): Promise<HTMLImageElement> {
  const SCALE_FACTOR = 0.667;
  const parser = new DOMParser();
  const doc = parser.parseFromString(svg, "image/svg+xml");
  const circle = doc.getElementsByClassName("bg-circle")[0] as HTMLElement;
  const circleTransform = `translate(${SCALE_FACTOR*25}%, ${SCALE_FACTOR*25}%) scale(${SCALE_FACTOR})`
  const paths = doc.getElementsByTagName("path") as HTMLCollectionOf<SVGPathElement>;

  const pngColors = {
    icon: this.arrasBranding.colors[this.data.style.colors.icon],
    circle: this.arrasBranding.colors[this.data.style.colors.circle]+'cc'
  }
  if (invertColors) {
    pngColors.icon = this.arrasBranding.colors[this.data.style.colors.icon];
    pngColors.circle = this.arrasBranding.colors[this.data.style.colors.icon]+'70';
  }

  for(let path = 1; path < paths.length; path++) {
    paths[path].setAttribute("fill", pngColors.icon)
  }
  if (circle) {
    circle.style.transform = circleTransform;
    circle.setAttribute("fill", pngColors.circle)
  }
  svg = doc.documentElement.outerHTML;

  const svgBlob = new Blob([svg], { type: "image/svg+xml" });
  const svgUrl = URL.createObjectURL(svgBlob);
  const iconSize = 64;
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      // Create a canvas to rasterize the SVG to PNG
      const canvas = document.createElement("canvas");
      // Use natural dimensions if available, otherwise default to 16x16
      const width = iconSize;//img.naturalWidth || img.width || 16;
      const height = iconSize;//img.naturalHeight || img.height || 16;
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        URL.revokeObjectURL(svgUrl);
        reject(new Error("Could not get canvas context"));
        return;
      }

      // Draw the SVG image to the canvas
      ctx.drawImage(img, 0, 0, width, height);

      // Create a new image element from the canvas PNG data URL
      const pngImg = new Image();
      pngImg.onload = () => {
        URL.revokeObjectURL(svgUrl);
        resolve(pngImg);
      };
      pngImg.onerror = (error) => {
        URL.revokeObjectURL(svgUrl);
        reject(error);
      };
      // Convert canvas to PNG data URL
      pngImg.src = canvas.toDataURL("image/png");
    };
    img.onerror = (error) => {
      URL.revokeObjectURL(svgUrl);
      reject(error);
    };
    img.src = svgUrl;
  });
}
}
