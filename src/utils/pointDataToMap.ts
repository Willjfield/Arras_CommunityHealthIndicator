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
    emitter?: Emitter<any>
  ) {
    super(data, map, side, emitter);
    this.minDataValue = 0;
    this.maxDataValue = 100;
  }

  getExpression(expType: "circleRadius" | "iconSize") {
    const minValue = this.minDataValue;
    const maxValue = this.maxDataValue;
    const mappedValue = (value: number) => {
      return (value - minValue) / (maxValue - minValue);
    };
    const mappedMinValue = mappedValue(minValue);
    const mappedMaxValue = mappedValue(maxValue);
    const propAccessor = (this.data as any).has_count
        ? `Count_${this.year}`
        : `${this.year}`;
    if (expType === "circleRadius") {
      
      return [
        "interpolate",
        ["linear"],
        ["zoom"],
        8,
        [
          "*",
          ["to-number", 1.25 / 3 + mappedMinValue],
          ["sqrt", ["to-number", ["get", propAccessor]]],
        ],
        15,
        [
          "*",
          ["to-number", 1.25 + mappedMaxValue],
          ["sqrt", ["to-number", ["get", propAccessor]]],
        ],
      ];
    }
    if (expType === "iconSize") {
      return [
        "interpolate",
        ["linear"],
        ["zoom"],
        8,
        [
          "*",
          ["to-number", 0.03 + mappedMinValue * 0.1],
          ["sqrt", ["to-number", ["get", propAccessor]]]
        ],
        15,
        [
          "*",
          ["to-number", 0.1 + mappedMaxValue * 0.1],
          ["sqrt", ["to-number", ["get", propAccessor]]]
        ]
      ];
    }
    return null;
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
        (feature: any) =>
          +feature.properties[propAccessor] || 9999999999999
      )
    );
    this.maxDataValue = Math.max(
      ...geojson.features.map(
        (feature: any) => +feature.properties[propAccessor] || -1
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
        map.setPaintProperty(mainLayer, "icon-color", "#000");
        this.removePopup();

        this.emitter?.emit(`feature-${this.side || "left"}-hovered`, null);
        return;
      } else {
        map.setPaintProperty(mainLayer, "icon-color", [
          "case",
          ["==", ["get", "geoid"], features[0].properties.geoid],
          ["literal", (this as any).data.style.selected.color],
          ["literal", (this as any).data.style.unselected.color],
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

    map.setLayoutProperty(
      (this as any).data.layers.main,
      "visibility",
      "visible"
    );
    map.setLayoutProperty(
      (this as any).data.layers.main,
      "icon-size",
      this.getExpression("iconSize")
    );
    let circleLayer = (this as any).data.layers.circle;
    if (circleLayer) {
      map.setLayoutProperty(circleLayer, "visibility", "visible");
      map.setPaintProperty(
        circleLayer,
        "circle-radius",
        this.getExpression("circleRadius")
      );
    }
    if (!circleLayer) {
      map.setLayoutProperty(circleLayer, "visibility", "none");
    }
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
