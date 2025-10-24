import type { Icon, IndicatorConfig } from '../types/IndicatorConfig'
import type { Map } from 'maplibre-gl'
export class DataToMap {
    private readonly data: IndicatorConfig;
    private readonly map: Map;
    events: { click: any; mousemove: any; mouseleave: any; };
    constructor(_data: IndicatorConfig, _map: Map) {
        this.data = _data;
        this.map = _map;
        this.events = {
            "click":null,
            "mousemove":null,
            "mouseleave":null,
        }
    }

    setupIndicator() {
       
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
        //TODO get year and save it in object so that it can be used to set fill color

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
