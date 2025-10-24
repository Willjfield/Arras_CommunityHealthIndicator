import type { IndicatorConfig } from "../types/IndicatorConfig";
import { DataToMap } from "./dataToMap";
import type { Map } from "maplibre-gl";

export class AreaDataToMap extends DataToMap {
    constructor(data: IndicatorConfig, map: Map) {
        super(data, map);
    }

    async setupIndicator() {
        super.setupIndicator();
        this.removeOldEvents();

        const map: Map = (this as any).map;
        const data: IndicatorConfig = (this as any).data;
        const source: any = map.getSource(data.source_name);
        const geojson = await source.getData();
        geojson.features = geojson.features.map((feature: any) => {
            const properties = data.google_sheets_data.data.find((row: any) => +row.geoid === +feature.properties.geoid);
            if (properties) {
                return {
                    type: 'Feature',
                    geometry: feature.geometry,
                    properties: properties
                }
            }
            return null;
        });

        if (source && typeof source.setData === "function") {
            source.setData(geojson);
        } else {
            console.error(`Source ${data.source_name} not found`);
        }
        this.setPaintAndLayoutProperties();
        this.addNewEvents();
        return true;
    }

    removeOldEvents() {
        super.removeOldEvents();
    }

    addNewEvents() {
        super.addNewEvents();
    }

    async setPaintAndLayoutProperties(year:number | null) {
        await super.setPaintAndLayoutProperties(year);
        const map = (this as any).map;
        if (!map) return false;
        const data = (this as any).data;
        if (!data || !data.layers || !data.layers.main || !data.style || !data.style.min || !data.style.max || !data.fill_color) {
            console.error('Missing required data properties:', { 
                data, 
                layers: data?.layers, 
                style: data?.style,
                fill_color: data?.fill_color 
            });
            return false;
        }
        
        data.fill_color[2][1][1] = ''+year;
        const fillColor = [...data.fill_color, data.style.min.value, data.style.min.color, data.style.max.value, data.style.max.color]
       
        if (!data.layers.main) {
            console.error('data.layers.main is undefined');
            return false;
        }
        map.setPaintProperty(data.layers.main, 'fill-color', fillColor);
        map.setLayoutProperty(data.layers.main, 'visibility', 'visible');
        return true;
    }

    generateGeojson() {
        super.generateGeojson();
    }
}