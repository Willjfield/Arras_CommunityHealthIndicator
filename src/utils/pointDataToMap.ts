import type { IndicatorConfig } from "../types/IndicatorConfig";
import { DataToMap } from "./dataToMap";
import { type Map } from "maplibre-gl";
import type { Emitter } from "mitt";
import {
  POINT_SIZE_MIN,
  POINT_SIZE_MAX,
  POINT_SIZE_VALUE_MIN,
  POINT_SIZE_VALUE_MAX,
  CIRCLE_OPACITY_DEFAULT,
  CIRCLE_OPACITY_HOVER,
  EXCLUDED_GEO_PATTERNS,
} from "../constants";

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

  /**
   * Generates a MapLibre GL expression for circle radius based on data values
   * Uses Cohort_ prefix if both count and percentage are available, otherwise Count_ prefix
   * @returns MapLibre expression array for circle-radius property
   */
  getSizeExpression() {
    const data = this.data;
    let propAccessor = '';
    
    if (data.has_count && data.has_pct) {
      propAccessor = `Cohort_${this.year}`;
    } else {
      propAccessor = `Count_${this.year}`;
    }

    const sizeExp = [
      "case",
      ["has", propAccessor],
      [
        "interpolate",
        ["linear"],
        ["to-number", ["get", propAccessor]],
        POINT_SIZE_VALUE_MIN,
        POINT_SIZE_MIN,
        POINT_SIZE_VALUE_MAX,
        POINT_SIZE_MAX,
      ],
      POINT_SIZE_MIN + 3, // Default size when no data
    ];
    
    return sizeExp;
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
        (feature: any) => +feature.properties[propAccessor] || Number.MAX_SAFE_INTEGER
      )
    );
    this.maxDataValue = Math.max(
      ...geojson.features.map((feature: any) => {
        const geoid = feature.properties.geoid?.toLowerCase() || '';
        const name = feature.properties.name?.toLowerCase() || '';
        const isExcluded = EXCLUDED_GEO_PATTERNS.some(pattern => 
          geoid.includes(pattern) || name.includes(pattern)
        );
        if (isExcluded) {
          return -1;
        }
        return +feature.properties[propAccessor] || -1;
      })
    );

    const map = (this as any).map as Map;
    const data = this.data;
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

  /**
   * Adds event handlers for mouse interactions on point features
   * Handles hover highlighting, popup display, and click to freeze/unfreeze popup
   */
  addNewEvents() {
    super.addNewEvents();
    const map = (this as any).map as Map;
    const mainLayer = this.data.layers.main;

    if (!map) return;

    this.events.mousemove = (event: any) => {
      if (this.frozenPopup) return;
      this.createPopupIfNeeded();
      const features = map.queryRenderedFeatures(event.point, {
        layers: [mainLayer],
      });

      if (features.length === 0) {
        map.setPaintProperty(mainLayer, "circle-opacity", CIRCLE_OPACITY_DEFAULT);
        this.removePopup();
        this.emitter?.emit(`feature-${this.side || "left"}-hovered`, null);
        this.emitter?.emit(`feature-name-${this.side || "left"}-hovered`, null);
        return;
      } else {
        map.setPaintProperty(mainLayer, "circle-opacity", [
          "case",
          ["==", ["get", "geoid"], features[0].properties.geoid],
          CIRCLE_OPACITY_HOVER,
          CIRCLE_OPACITY_DEFAULT,
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

        this.emitter?.emit(
          `feature-name-${this.side || "left"}-hovered`,
          features[0].properties.name
        );
      }
    };
    map.on("mousemove", this.events.mousemove);
    this.events.click = (_event: any) => {
      this.frozenPopup = !this.frozenPopup;
    };
    map.on("click", this.events.click);
  }

  /**
   * Applies paint and layout properties to point layers
   * Sets circle radius, color, opacity, and sort key based on data values
   */
  async setPaintAndLayoutProperties(year: number | null) {
    await super.setPaintAndLayoutProperties(year);
    const map = (this as any).map as Map;
    if (!map) return false;
    const mainLayer = this.data.layers.main;
    map.setLayoutProperty(mainLayer, "visibility", "visible");
    map.setPaintProperty(mainLayer, "circle-radius", this.getSizeExpression());
    map.setPaintProperty(mainLayer, "circle-opacity", CIRCLE_OPACITY_DEFAULT);
    
    // Set sort key to ensure larger circles render on top
    map.setLayoutProperty(mainLayer, "circle-sort-key", [
      "case",
      ["has", `Cohort_${this.year}`],
      ["/", 1, ["to-number", ["get", `Cohort_${this.year}`]]],
      ["has", `Count_${this.year}`],
      ["/", 1, ["to-number", ["get", `Count_${this.year}`]]],
      ["has", `${this.year}`],
      ["/", 1, ["to-number", ["get", `${this.year}`]]],
      0,
    ]);

    const maxColor = this.arrasBranding.colors[this.data.style.max.color];
    const circleColor =
      this.data.has_count && !this.data.has_pct
        ? maxColor
        : this.getGradientExpression();

    map.setPaintProperty(mainLayer, "circle-color", circleColor);

    map.setLayoutProperty(mainLayer, "visibility", "visible");

    return true;
  }

  /**
   * Generates GeoJSON from Google Sheets data
   * Converts tabular data with lat/lng coordinates into GeoJSON Point features
   * @returns GeoJSON FeatureCollection with Point geometries
   */
  generateGeojson() {
    super.generateGeojson();
    const rawGoogleData = this.data.google_sheets_data.data;
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
