import type { IndicatorConfig } from "../types/IndicatorConfig";
import { DataToMap } from "./dataToMap";
import { type Map } from "maplibre-gl";
import type { Emitter } from 'mitt'

export class PointDataToMap extends DataToMap {
    private clusterIconMultiplier: number;
    private circleRadius: number;
    constructor(data: IndicatorConfig, map: Map, side: 'left' | 'right' | null = null, emitter?: Emitter<any>) {
        super(data, map, side, emitter);
        this.circleRadius = 8;
        this.clusterIconMultiplier = (this as any).data.style.selected['icon-size'] / (this as any).data.style.unselected['icon-size'];
  
    }

    async setupIndicator(year: number | null): Promise<boolean> {
        await super.setupIndicator?.(year);
        this.removeOldEvents();
        const geojson = this.generateGeojson();
        const map: Map = (this as any).map;
        const data: IndicatorConfig = (this as any).data;
        const source: any = await map.getSource(data.source_name);
      
        //console.log(geojson);
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
        const circleLayer = (this as any).data.layers.circle;

        if (!map) return

        // Create popup once
        //this.createPopupIfNeeded();

        this.events.mousemove = (event: any) => {
            if (this.frozenPopup) return;
            this.createPopupIfNeeded();
            const features = map.queryRenderedFeatures(event.point, {
                layers: [mainLayer]
            })

            if (features.length === 0) {
                map.setLayoutProperty(mainLayer, 'icon-size', ['case',
                    ['==', ['get', 'cluster'], true],
                    ['literal', (this as any).data.style.unselected['icon-size'] * this.clusterIconMultiplier],
                    ['literal', (this as any).data.style.unselected['icon-size']]
                ])
                map.setPaintProperty(mainLayer, 'icon-color', '#888')
                if (circleLayer) {
                    map.setPaintProperty(circleLayer, 'circle-radius', ['case',
                        ['==', ['get', 'cluster'], true],
                        ['literal', this.circleRadius * this.clusterIconMultiplier],
                        ['literal', this.circleRadius]
                    ])
                    map.setPaintProperty(circleLayer, 'circle-color', '#fff')
                }
                this.removePopup();

                this.emitter?.emit(`feature-${this.side || 'left'}-hovered`, null)
                return
            } else if (features[0].properties.cluster) {
                console.log(features[0].properties);
                map.setLayoutProperty(mainLayer, 'icon-size', ['case',
                    ['==', ['get', 'cluster'], true],
                    ['literal', (this as any).data.style.unselected['icon-size'] * this.clusterIconMultiplier],
                    ['literal', (this as any).data.style.unselected['icon-size']]
                ])
                map.setPaintProperty(mainLayer, 'icon-color', ['case',
                    ['==', ['get', 'cluster_id'], features[0].properties.cluster_id || 0],
                    ['literal', (this as any).data.style.selected.color],
                    ['literal', (this as any).data.style.unselected.color]
                ])
                if (circleLayer) {
                    map.setPaintProperty(circleLayer, 'circle-radius', ['case',
                        ['==', ['get', 'cluster'], true],
                        ['literal', this.circleRadius * this.clusterIconMultiplier],
                        ['literal', this.circleRadius]
                    ])
                    map.setPaintProperty(circleLayer, 'circle-color', '#fff')
                }
                this.removePopup();

                this.showPopup(event.lngLat, features[0].properties, this.side as 'left' | 'right');
            } else {
                map.setLayoutProperty(mainLayer, 'icon-size', ['case',
                    ['==', ['get', 'cluster'], true],
                    ['literal', (this as any).data.style.unselected['icon-size'] * this.clusterIconMultiplier],
                    ['literal', (this as any).data.style.unselected['icon-size']]
                ])
                map.setPaintProperty(mainLayer, 'icon-color', ['case',
                    ['==', ['get', 'geoid'], features[0].properties.geoid],
                    ['literal', (this as any).data.style.selected.color],
                    ['literal', (this as any).data.style.unselected.color]
                ])
                if (circleLayer) {
                    map.setPaintProperty(circleLayer, 'circle-radius', ['case',
                        ['==', ['get', 'cluster'], true],
                        ['literal', this.circleRadius * this.clusterIconMultiplier],
                        ['literal', this.circleRadius]
                    ])
                    map.setPaintProperty(circleLayer, 'circle-color', '#fff')
                }

                // Show popup with Vue component
                this.showPopup(event.lngLat, features[0].properties, this.side as 'left' | 'right');

                this.emitter?.emit(`feature-${this.side || 'left'}-hovered`, features[0].properties.geoid)
            }
        }
        map.on('mousemove', this.events.mousemove);
        this.events.click = (_event: any) => {
            this.frozenPopup = !this.frozenPopup;
        }
        map.on('click', this.events.click);
    }

    async setPaintAndLayoutProperties(year: number | null) {
        await super.setPaintAndLayoutProperties(year);
        const map = (this as any).map;
        if (!map) return false;

        map.setLayoutProperty((this as any).data.layers.main, 'visibility', 'visible');
        // const iconSize = ['*',['to-number', ['get', year || 0]],0.001]

        //map.setLayoutProperty((this as any).data.layers.main, 'icon-size', iconSize);
        map.setLayoutProperty((this as any).data.layers.main, 'icon-size', ['case',
            ['==', ['get', 'cluster'], true],
            ['literal', (this as any).data.style.unselected['icon-size'] * this.clusterIconMultiplier],
            ['literal', (this as any).data.style.unselected['icon-size']]
        ])
        let circleLayer = (this as any).data.layers.circle;
        if (circleLayer) {
            map.setLayoutProperty(circleLayer, 'visibility', 'visible');
            map.setPaintProperty(circleLayer, 'circle-radius', ['case',
                ['==', ['get', 'cluster'], true],
                ['literal', this.circleRadius * this.clusterIconMultiplier],
                ['literal', this.circleRadius]
            ])
        }
        if (!circleLayer) {
            map.setLayoutProperty(circleLayer, 'visibility', 'none');
        }
        return true;
    }

    generateGeojson() {
        super.generateGeojson();
        // Fix: Access private 'data' property through 'as any'
        const rawGoogleData = (this as any).data.google_sheets_data.data;
        //console.log(rawGoogleData);
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