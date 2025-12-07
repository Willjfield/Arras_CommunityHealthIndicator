import type { IndicatorConfig } from "../types/IndicatorConfig";
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
  protected hoveringPlaceId: number = -1;
  minValue: number | null;
  maxValue: number | null;
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
    this.sitePath = _sitePath || "";
    this.hoveringPlaceId = -1;

    this.minValue = null;
    this.maxValue = null;
  }

  async setupIndicator(year: number | null): Promise<boolean> {
    this.year = year || this.year || null;
    
    const { minValue, maxValue } = this.getMinMaxValues();
    this.minValue = minValue;
    this.maxValue = maxValue;
    this.data.style.min.value = minValue;
    this.data.style.max.value = maxValue;
    return true;
  }

  generateGeojson() {}

  getGradientExpression() {
    const data: IndicatorConfig = (this as any).data;
    const { minValue, maxValue } = this.getMinMaxValues();
    const minColor = this.arrasBranding.colors[data.style.min.color];
    const maxColor = this.arrasBranding.colors[data.style.max.color];
    this.data.style.min.value = minValue;
    this.data.style.max.value = maxValue;
    if (
      !data ||
      !data.layers ||
      !data.layers.main ||
      !data.style ||
      !data.style.min ||
      !data.style.max ||
      !data.fill_color
    ) {
      console.error("Missing required data properties:", {
        data,
        layers: data?.layers,
        style: data?.style,
        fill_color: data?.fill_color,
      });
      return false;
    }

    // Replace the year string at the correct index with the selected year from this.year
    if (
      Array.isArray(data.fill_color) &&
      data.fill_color.length > 2 &&
      Array.isArray(data.fill_color[2]) &&
      data.fill_color[2].length > 1 &&
      Array.isArray(data.fill_color[2][1]) &&
      data.fill_color[2][1].length > 1
    ) {
      data.fill_color[2][1][1] = String(this.year ?? -1);
    } else {
      console.warn('fill_color array does not match expected structure. Year not set.');
    }

    const fillColor = [
      ...data.fill_color,
      minValue,
      minColor,
      maxValue,
      maxColor,
    ];
    if (!data.layers.main) {
      console.error("data.layers.main is undefined");
      return false;
    }
    return fillColor;
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
      if(this.frozenPopup || !this.popup) return;
      this.removePopup();
    };
    const mainLayer = (this as any).data.layers.main;
    this.map.on("mouseleave", mainLayer, this.events.mouseleave);

    this.events.mousemove = (event: any) => {
      const features = this.map.queryRenderedFeatures(event.point, {
        layers: ["places-fill"],
      });
      if (features.length > 0) {
        this.hoveringPlaceId = features[0].id as number;
        this.map.setFeatureState(
          { source: "places-source", id: this.hoveringPlaceId },
          { hover: true }
        );
      } else {
        this.map.setFeatureState(
          { source: "places-source", id: this.hoveringPlaceId },
          { hover: false }
        );
        this.hoveringPlaceId = -1;
      }
    };

    this.map.on("mousemove", this.events.mousemove);
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

  
  getMinMaxValues() {
    const data: IndicatorConfig = (this as any).data;

      //todo: this has to get min and max from all the  years, not just this year
    const years = data.google_sheets_data.headerShortNames.filter((year: string) => /^\d{4}$/.test(year) && !isNaN(Number(year)));
    let minValue = 9999999999999;
    let maxValue = 0;
    for(let year=0; year<years.length; year++) {
      const yearValues = data.google_sheets_data.data
      .filter((feature: any) => feature?.geoid !== "overall" && !feature?.geoid.includes("School District"))
      .map((feature: any) => feature[years[year] as string])
      .filter((value: any) => value !== null && value !== undefined && !isNaN(Number(value)) && value > 0);
      const thisyearMinValue = Math.min(...yearValues);
      const thisyearMaxValue = Math.max(...yearValues);
      if(+thisyearMinValue < minValue) {
        minValue = +thisyearMinValue;
      }
      if(+thisyearMaxValue > maxValue) {
        maxValue = +thisyearMaxValue;
      }
     
    }
    if(this.data.has_pct) {
      
      minValue = Math.max(minValue, 0);
      maxValue = Math.min(maxValue, 100);
      console.log('has pct', minValue, maxValue);
      return { minValue, maxValue };
    }
    return { minValue: Math.floor(minValue*.95), maxValue: Math.ceil(maxValue*1.05)};
  } 
}
