import type { IndicatorConfig } from "../types/IndicatorConfig";
import { DataToMap } from "./dataToMap";
import maplibregl, { type Map } from "maplibre-gl";
import type { Emitter } from 'mitt'
import { createApp } from 'vue'
import Popup from '../components/Popup.vue'
import vuetify from '../plugins/vuetify.js'

export class PointDataToMap extends DataToMap {
    private popup: any = null;
    private frozenPopup: boolean = false;
    constructor(data: IndicatorConfig, map: Map, side: 'left' | 'right' | null = null, emitter?: Emitter<any>) {  
        super(data, map, side, emitter);
    }

    async setupIndicator(year: number | null): Promise<boolean> {
        await super.setupIndicator?.(year);
        this.removeOldEvents();
        const geojson = this.generateGeojson();
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
        if (this.popup) {
            this.popup.remove();
        }
    }

    addNewEvents() {
        super.addNewEvents();
        const map = (this as any).map;
        const mainLayer = (this as any).data.layers.main;
        if (!map) return
        
        // Create popup once
        if (!this.popup) {
            this.popup = new maplibregl.Popup({
                closeButton: true,
                closeOnClick: false,
                closeOnMove: false
            });
        }
        
        this.events.mousemove = (event: any) => {
            if (this.frozenPopup) return;
            const features = map.queryRenderedFeatures(event.point, {
                layers: [mainLayer]
            })

            if (features.length === 0) {
                map.setLayoutProperty(mainLayer, 'icon-size', .75)
                map.setPaintProperty(mainLayer, 'icon-color', '#888')
                this.popup.remove();

                this.emitter?.emit(`feature-${this.side || 'left'}-hovered`, null)
                return
            }else{
                map.setLayoutProperty(mainLayer, 'icon-size', [
                    'case',
                    ['==', ['to-number', ['get', 'geoid']], ['to-number', features[0].properties.geoid]],
                    1,
                    0.75
                ])
                map.setPaintProperty(mainLayer, 'icon-color', [
                    'case',
                    ['==', ['to-number', ['get', 'geoid']], ['to-number', features[0].properties.geoid]],
                    ['literal', (this as any).data.style.selected.color],
                    ['literal', (this as any).data.style.unselected.color]
                ])
                
                // Show popup with Vue component
                this.showPopup(event.lngLat, features[0].properties);
                
                this.emitter?.emit(`feature-${this.side || 'left'}-hovered`, features[0].properties.geoid)
            }
        }
        map.on('mousemove', this.events.mousemove);
        this.events.click = (event: any) => {
            this.frozenPopup = !this.frozenPopup;
        }
        map.on('click', this.events.click);
    }
    
    private showPopup(lngLat: any, properties: any) {
        const map = (this as any).map;
        this.popup.setLngLat(lngLat).setHTML('<div id="popup-container"></div>').addTo(map);
        const popupContainer = document.getElementById('popup-container');
        if (popupContainer) {
            createApp(Popup, { properties }).use(vuetify).mount(popupContainer);
        }
    }

    async setPaintAndLayoutProperties(year:number | null) {
        await super.setPaintAndLayoutProperties(year);
        const map = (this as any).map;
        if (!map) return false;
        map.setLayoutProperty((this as any).data.layers.main, 'visibility', 'visible');
        return true;
    }

    generateGeojson() {
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