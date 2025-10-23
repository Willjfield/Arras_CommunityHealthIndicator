import type { Icon, IndicatorConfig } from '../types/IndicatorConfig'
import type { Map } from 'maplibre-gl'
export class DataToMap {
    private readonly data: IndicatorConfig;
    private readonly map: Map;
    constructor(_data: IndicatorConfig, _map: Map) {
        this.data = _data;
        this.map = _map;
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

    removeOldEvents(){}
    addNewEvents(){}
    async setPaintAndLayoutProperties(){
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
