import type { Icon, IndicatorConfig } from '../types/IndicatorConfig'
import type { Map } from 'maplibre-gl'
import type { Emitter } from 'mitt'

export class DataToMap {
    private readonly data: IndicatorConfig;
    private readonly map: Map;
    protected readonly emitter?: Emitter<any>;
    events: { click: any; mousemove: any; mouseleave: any; };
    year: number | null;
    side: 'left' | 'right' | null;
    constructor(_data: IndicatorConfig, _map: Map, side: 'left' | 'right' | null = null, _emitter?: Emitter<any>) {
        this.data = _data;
        this.map = _map;
        this.emitter = _emitter;
        this.events = {
            "click":null,
            "mousemove":null,
            "mouseleave":null,
        }
        this.year = null;
        this.side = side;
    }

    async setupIndicator(year: number | null): Promise<boolean> {
        this.year = year || this.year || null;
        return true;
    }

    generateGeojson() { }

    async addIconsToMap() {
        const icons: Icon[] = this.data.icons;
        //If, in the future, we want to add more than one icon, we need to change this to a loop. For now we assume there is one and it is used as the "main" one
        if (icons && icons.length === 1) {
                const img = await this.map.loadImage(icons[0].filename as string)
                
                    if (!this.map.hasImage(icons[0].name)) {
                      this.map.addImage(icons[0].name, img.data, { sdf: true });
                    }
                    this.map.setLayoutProperty(this.data.layers.main, 'icon-image', icons[0].name as string);
                    return true;
        }
        return false;
    }

    hideLayers(){
        if(this.data.layers.main){
            this.map.setLayoutProperty(this.data.layers.main, 'visibility', 'none');
        }
        if(this.data.layers.outline){
            this.map.setLayoutProperty(this.data.layers.outline, 'visibility', 'none');
        }
    }

    //This may be getting called too much but not a huge problem. Better than not enough.
    removeOldEvents(){
        if(this.events.click){
            this.map.off('click', this.events.click);
        }
        if(this.events.mousemove){
            this.map.off('mousemove', this.events.mousemove);
        }
        if(this.events.mouseleave){
            this.map.off('mouseleave', this.events.mouseleave);
        }
    }
    addNewEvents(){}
    async setPaintAndLayoutProperties(year:number | null){
        this.year = year || this.year || null;
        try {
            await this.addIconsToMap(); //Add the icon to the map
        } catch (error) {
            console.error(error);
        } finally {
            this.map.setLayoutProperty(this.data.layers.main, 'visibility', 'visible'); 
            if(this.data.layers.outline){
                this.map.setLayoutProperty(this.data.layers.outline, 'visibility', 'visible');
            }
            return true;
        }
    }
}
