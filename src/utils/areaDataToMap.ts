import type { IndicatorConfig } from "../types/IndicatorConfig";
import { DataToMap } from "./dataToMap";
import type { Map } from "maplibre-gl";
    
export class AreaDataToMap extends DataToMap {
    constructor(data: IndicatorConfig, map: Map) {
        super(data, map);
    }

    setupIndicator(){
        super.setupIndicator();
        this.removeOldEvents();
        const geojson = this.generateGeojson();
        const map: Map = (this as any).map;
        const data: IndicatorConfig = (this as any).data;
        const source: any = map.getSource(data.source_name);
    }

    removeOldEvents(){
        super.removeOldEvents();
    }

    addNewEvents(){
        super.addNewEvents();
    }
    
    setPaintAndLayoutProperties(){
        super.setPaintAndLayoutProperties();
    }

    generateGeojson(){
        super.generateGeojson();
        console.log((this as any).data);
    }
}