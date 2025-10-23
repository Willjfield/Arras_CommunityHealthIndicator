import type { IndicatorConfig } from '../types/IndicatorConfig'
import type { Map } from 'maplibre-gl'
export class DataToMap {
    private readonly data: IndicatorConfig;
    private readonly map: Map;
    constructor(_data: IndicatorConfig, _map: Map) {
        this.data = _data;
        this.map = _map;
    }

    setupIndicator(){
       
    }
    generateGeojson(){}

    setPaintAndLayoutProperties() {}

    removeOldEvents() {}

    addNewEvents() {}

}