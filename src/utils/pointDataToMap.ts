import type { IndicatorConfig } from "../types/IndicatorConfig";
import { DataToMap } from "./dataToMap";
import { type Map } from "maplibre-gl";
import type { Emitter } from "mitt";

export class PointDataToMap extends DataToMap {
  maxDataValue: number;
  minDataValue: number;
  // private circleRadiusExpression: any;
  // private iconSizeExpression: any;
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

  getExpression() {
    const minValue = this.minDataValue;
    const maxValue = this.maxDataValue;
    console.log(minValue, maxValue);

    const propAccessor = (this.data as any).has_count
      ? `Count_${this.year}`
      : `${this.year}`;
    console.log(propAccessor);
    return [
        "interpolate",
        ["linear"],
        ["to-number", ["get", propAccessor]],
        minValue,
        0.2,
        maxValue,
        1.0,
      ];
    // if (expType === "circleRadius") {
    //   return [
    //     "interpolate",
    //     ["linear"],
    //     ["zoom"],
    //     8,
    //     [
    //       "*",
    //       ["to-number", (1.25 / 3).toString()],
    //       ["sqrt", ["to-number", ["get", propAccessor]]],
    //     ],
    //     15,
    //     [
    //       "*",
    //       ["to-number", "1.25"],
    //       ["sqrt", ["to-number", ["get", propAccessor]]],
    //     ],
    //   ];
    // }
    // if (expType === "iconSize") {
    //   // Top-level zoom interpolation, with data-based multiplication at each zoom level
    //   return [
    //     "interpolate",
    //     ["linear"],
    //     ["zoom"],
    //     8,
    //     [
    //       "*",
    //       0.5,
    //       [
    //         "interpolate",
    //         ["linear"],
    //         ["to-number", ["get", propAccessor]],
    //         minValue,
    //         0.5,
    //         maxValue,
    //         10.0,
    //       ],
    //     ],
    //     15,
    //     [
    //       "*",
    //       1.0,
    //       [
    //         "interpolate",
    //         ["linear"],
    //         ["to-number", ["get", propAccessor]],
    //         minValue,
    //         0.2,
    //         maxValue,
    //         10.0,
    //       ],
    //     ],
    //   ];
    // }
    // return null;
  }

  async setupIndicator(year: number | null): Promise<boolean> {
    //console.log(year);
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
      ...geojson.features.map(
        (feature: any) => {
          if(feature.properties.geoid === "overall") {
            return -1;
          }
          return +feature.properties[propAccessor] || -1
        }
      )
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
        map.setLayoutProperty(mainLayer, "icon-image", [
          "literal",
          (this as any).data.icons[0].name,
        ]);
        //map.setPaintProperty(mainLayer, "icon-halo-width", 0);

        this.removePopup();

        this.emitter?.emit(`feature-${this.side || "left"}-hovered`, null);
        return;
      } else {
        map.setLayoutProperty(mainLayer, "icon-image", [
          "case",
          ["==", ["get", "geoid"], features[0].properties.geoid],
          ["literal", (this as any).data.icons[0].name + "-invert"],
          ["literal", (this as any).data.icons[0].name],
        ]);
        // map.setPaintProperty(mainLayer, "icon-halo-width", [
        //   "case",
        //   ["==", ["get", "geoid"], features[0].properties.geoid],
        //   0.1,
        //   0,
        // ]);
        // const outlineColor =
        //   this.arrasBranding.colors[this.data.style.colors.circle];

        //map.setPaintProperty(mainLayer, "icon-halo-color", "#000");
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

    map.setLayoutProperty(
      (this as any).data.layers.main,
      "visibility",
      "visible"
    );
    map.setLayoutProperty(
      (this as any).data.layers.main,
      "icon-size",
      this.getExpression()
    );

    return true;
  }

  generateGeojson() {
    super.generateGeojson();
    // Fix: Access private 'data' property through 'as any'
    const rawGoogleData = (this as any).data.google_sheets_data.data;
    //console.log(rawGoogleData);
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
    console.log(geojson);
    return geojson;
  }
}
