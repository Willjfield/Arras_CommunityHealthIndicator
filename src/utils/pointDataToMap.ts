import type { IndicatorConfig } from "../types/IndicatorConfig";
import { DataToMap } from "./dataToMap";
import type { Map } from "maplibre-gl";

export class PointDataToMap extends DataToMap {
    constructor(data: IndicatorConfig, map: Map) {
        super(data, map);
    }

    async setupIndicator(){
        super.setupIndicator();
        this.removeOldEvents();
        const geojson = this.generateGeojson();
        const map: Map = (this as any).map;
        const data: IndicatorConfig = (this as any).data;
        const source: any = await map.getSource(data.source_name);
        
        if (source && typeof source.setData === "function") {
            source.setData(geojson);
        }else{
            console.error(`Source ${data.source_name} not found`);
        }
        this.setPaintAndLayoutProperties();
        this.addNewEvents();
        return true;
    }

    removeOldEvents(){
        super.removeOldEvents();
    }

    addNewEvents(){
        super.addNewEvents();
    }

    setPaintAndLayoutProperties(){
        super.setPaintAndLayoutProperties();
        console.log((this as any).map.getStyle());
        (this as any).map.setLayoutProperty((this as any).data.layers.main, 'visibility', 'visible');
    }
    
    generateGeojson(){
        super.generateGeojson();
        // Fix: Access private 'data' property through 'as any'
        const rawGoogleData = (this as any).data.google_sheets_data.data;
        const geojson = {
            type: 'FeatureCollection',
            features: rawGoogleData.map((row: any) => {
                return {
                    type: 'Feature',
                    geometry: {
                        type: 'Point',
                        coordinates: [+row.lng, +row.lat]
                    },
                    properties: row
                }
            })
        }
        return geojson;
    }
}