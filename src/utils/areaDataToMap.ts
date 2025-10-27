import type { IndicatorConfig } from "../types/IndicatorConfig";
import { DataToMap } from "./dataToMap";
import type { Map } from "maplibre-gl";
import type { Emitter } from "mitt";
//import { toRaw } from "vue";
export class AreaDataToMap extends DataToMap {
    constructor(data: IndicatorConfig, map: Map, side: 'left' | 'right' | null = null, emitter?: Emitter<any>) {
        super(data, map, side, emitter);
    }

    async setupIndicator(year: number | null): Promise<boolean> {
        await super.setupIndicator?.(year);
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
            return false;
        });

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
        if (!map) return
        const data = (this as any).data;
        const layerFillStyle = data.style;
        const year = (this as any).year || -1;
        this.events.mousemove = (event: any) => {
            const features = map.queryRenderedFeatures(event.point, {
                layers: [mainLayer]
            })
            //console.log(mainLayer)
            if (features.length === 0) {
                console.log('no features found')
                this.emitter?.emit(`tract-${this.side || 'left'}-hovered`, null as any)

                //map.setLayoutProperty(mainLayer, 'fill-color', '#888')
                //map.setLayoutProperty(mainLayer, 'visibility', 'visible');
                return;
            }
            const feature = features[0];
            const properties = feature.properties;
            const harmonizedOutlineLayer = (this as any).data.layers.outline;
            if (harmonizedOutlineLayer) {
                map.setPaintProperty(harmonizedOutlineLayer,
                    'line-color',
                    [
                        'case', 
                        ['==', ['get', 'geoid'],
                            ''+properties.geoid
                        ],
                        ['literal', '#000f'],
                        '#0000'])
            }
      
            this.emitter?.emit(`tract-${this.side || 'left'}-hovered`, feature.properties.geoid)
        }
        map.on('mousemove', this.events.mousemove);
    }

    async setPaintAndLayoutProperties(year: number | null) {
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

        data.fill_color[2][1][1] = '' + (this.year || -1);
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