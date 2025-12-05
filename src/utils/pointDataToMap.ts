import type { IndicatorConfig } from "../types/IndicatorConfig";
import { DataToMap } from "./dataToMap";
import { type Map } from "maplibre-gl";
import type { Emitter } from "mitt";

export class PointDataToMap extends DataToMap {
  maxDataValue: number;
  minDataValue: number;

  constructor(
    data: IndicatorConfig,
    map: Map,
    side: "left" | "right" | null = null,
    emitter?: Emitter<any>,
    arrasBranding?: any,
    sitePath?: string
  ) {
    super(data, map, side, emitter, arrasBranding as any, sitePath);
    this.minDataValue = 0;
    this.maxDataValue = 100;
    this.arrasBranding = arrasBranding as any;
  }

  getSizeExpression() {
    const minValue = 10;
    const maxValue = 400;

    // const propAccessor = (this.data as any).has_count
    //   ? `Count_${this.year}`
    //   : `${this.year}`;
    return [
      "case",
      ["has", `Tested_${this.year}`],
      ["interpolate", ["linear"], ["to-number", ["get", `Tested_${this.year}`]], minValue, 3, maxValue, 20],
      6
    ]
  }

  async setupIndicator(year: number | null): Promise<boolean> {
    await super.setupIndicator?.(year);
    this.removeOldEvents();
    const geojson = this.generateGeojson();
    const propAccessor = (this.data as any).has_count
      ? `Count_${this.year}`
      : `${this.year}`;
    this.minDataValue = Math.min(
      ...geojson.features.map(
        (feature: any) => +feature.properties[propAccessor] || 9999999999999
      )
    );
    this.maxDataValue = Math.max(
      ...geojson.features.map((feature: any) => {
        if (feature.properties.geoid === "overall") {
          return -1;
        }
        return +feature.properties[propAccessor] || -1;
      })
    );

    const map: Map = (this as any).map;
    const data: IndicatorConfig = (this as any).data;
    const source: any = await map.getSource(data.source_name);

    if (source && typeof source.setData === "function") {
      source.setData(geojson);
    } else {
      console.error(`Source ${data.source_name} not found`);
    }
    await this.setPaintAndLayoutProperties(year);
    this.addNewEvents();
    return true;
  }

  removeOldEvents() {
    super.removeOldEvents();
  }

  addNewEvents() {
    super.addNewEvents();
    const map = (this as any).map;
    const mainLayer = (this as any).data.layers.main;

    if (!map) return;

    // Create popup once
    //this.createPopupIfNeeded();

    this.events.mousemove = (event: any) => {
      if (this.frozenPopup) return;
      this.createPopupIfNeeded();
      const features = map.queryRenderedFeatures(event.point, {
        layers: [mainLayer],
      });

      if (features.length === 0) {
        map.setPaintProperty(mainLayer, "circle-opacity", 0.75);
        this.removePopup();
        this.emitter?.emit(`feature-${this.side || "left"}-hovered`, null);
        return;
      } else {
        map.setPaintProperty(mainLayer, "circle-opacity", [
          "case",
          ["==", ["get", "geoid"], features[0].properties.geoid],
          1,
          0.75,
        ]);

        // Show popup with Vue component
        this.showPopup(
          event.lngLat,
          features[0].properties,
          this.side as "left" | "right"
        );

        this.emitter?.emit(
          `feature-${this.side || "left"}-hovered`,
          features[0].properties.geoid
        );
      }
    };
    map.on("mousemove", this.events.mousemove);
    this.events.click = (_event: any) => {
      this.frozenPopup = !this.frozenPopup;
    };
    map.on("click", this.events.click);
  }

  async setPaintAndLayoutProperties(year: number | null) {
    await super.setPaintAndLayoutProperties(year);
    const map = (this as any).map;
    if (!map) return false;
    const mainLayer = (this as any).data.layers.main;
    map.setLayoutProperty(mainLayer, "visibility", "visible");
    map.setPaintProperty(mainLayer, "circle-radius", this.getSizeExpression());
    map.setPaintProperty(mainLayer, "circle-opacity", 0.75);
   // const sortKey = this.getSortKeyExpression();
    map.setLayoutProperty(mainLayer, "circle-sort-key", 
      ["case",
        ["has", `Tested_${this.year}`],
        ['/',1,["to-number", ["get", `Tested_${this.year}`]]],
         ["has", `Count_${this.year}`],
         ['/',1,["to-number", ["get", `Count_${this.year}`]]],
         ["has", `${this.year}`],
         ['/',1,["to-number", ["get", `${this.year}`]]],
        0
      ]
    );

   // const data = (this as any).data;
    //const maxColor = this.arrasBranding.colors[data.style.max.color];
    const circleColor = this.getGradientExpression();
        map.setLayoutProperty(mainLayer, "visibility", "visible");

    map.setPaintProperty(mainLayer, "circle-color", circleColor);

    return true;
  }

  generateGeojson() {
    super.generateGeojson();
    // Fix: Access private 'data' property through 'as any'
    const rawGoogleData = (this as any).data.google_sheets_data.data;
    const geojson = {
      type: "FeatureCollection",
      features: rawGoogleData.map((row: any) => {
        return {
          type: "Feature",
          geometry: {
            type: "Point",
            coordinates: [+row.lng, +row.lat],
          },
          properties: row,
        };
      }),
    };
    return geojson;
  }
}
