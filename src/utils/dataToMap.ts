import type { Icon, IndicatorConfig } from '../types/IndicatorConfig'
import type { Map } from 'maplibre-gl'
import type { Emitter } from 'mitt'
import maplibregl from 'maplibre-gl'
import { createApp, type App, reactive } from 'vue'
import Popup from '../components/Popup.vue'
import vuetify from '../plugins/vuetify.js'

export class DataToMap {
    private readonly data: IndicatorConfig;
    private readonly map: Map;
    protected readonly emitter?: Emitter<any>;
    events: { click: any; mousemove: any; mouseleave: any; };
    year: number | null;
    side: 'left' | 'right' | null;
    protected popup: any = null;
    protected frozenPopup: boolean = false;
    protected popupApp: App | null = null;
    protected highlightedGeoid: string | null = null;
    protected lastPopupGeoid: string | null = null;
    protected popupProperties: ReturnType<typeof reactive> | null = null;
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
        this.highlightedGeoid = null;
    }

    async setupIndicator(year: number | null): Promise<boolean> {
        this.year = year || this.year || null;
        console.log(this.year);
        return true;
    }

    generateGeojson() { }

    async addIconsToMap() {
        if(!this.map) return false;
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
        if(!this.map) return;
        if(this.data.layers.main){
            this.map.setLayoutProperty(this.data.layers.main, 'visibility', 'none');
        }
        if(this.data.layers.outline){
            this.map.setLayoutProperty(this.data.layers.outline, 'visibility', 'none');
        }
        if(this.data.layers.circle){
            this.map.setLayoutProperty(this.data.layers.circle, 'visibility', 'none');
        }
    }

    //This may be getting called too much but not a huge problem. Better than not enough.
    removeOldEvents(){
        if(!this.map) {
            // Clean up popup even if map is gone
            if (this.popupApp) {
                this.popupApp.unmount();
                this.popupApp = null;
            }
            if(this.popup){
                this.popup.remove();
                this.popup = null;
            }
            return;
        }
        if(this.events.click){
            this.map.off('click', this.events.click);
        }
        if(this.events.mousemove){
            this.map.off('mousemove', this.events.mousemove);
        }
        if(this.events.mouseleave){
            this.map.off('mouseleave', this.events.mouseleave);
        }
        if (this.popupApp) {
            this.popupApp.unmount();
            this.popupApp = null;
        }
        if(this.popup){
            this.popup.remove();
            this.popup = null;
        }
    }
    addNewEvents(){
        this.events.mouseleave = () => {
            this.removePopup();
        }
        const mainLayer = (this as any).data.layers.main;
        this.map.on('mouseleave', mainLayer,this.events.mouseleave);
    }
    
    protected createPopupIfNeeded() {
        if (!this.popup) {
            this.popup = new maplibregl.Popup({
                closeButton: true,
                closeOnClick: false,
                closeOnMove: false,
               // offset: this.side === 'right' ? [-10, 0] : [10, 0],
               // anchor: this.side as 'left' | 'right' | undefined,
                focusAfterOpen: false,
            });
        }
    }

    protected showPopup(lngLat: any, properties: any, side: 'left' | 'right') {
        if(!this.map) return;
        
        // Get the geoid from properties (could be properties.geoid or properties.id, etc.)
        const currentGeoid = properties?.geoid || properties?.id || null;
        const geoidChanged = currentGeoid !== this.lastPopupGeoid;
        
        // Use unique container ID based on side to avoid conflicts between left and right popups
        const containerId = `popup-container-${side}`;
        this.createPopupIfNeeded();
        
        // Always update popup position
        this.popup.setLngLat(lngLat);
        
        // Only recreate the HTML container if geoid changed or popup doesn't exist
        if (geoidChanged || !this.popupApp) {
            this.popup.setHTML(`<div id="${containerId}"></div>`).addTo(this.map);
        }
        
        const popupContainer = document.getElementById(containerId);
        
        if (popupContainer) {
            if (geoidChanged || !this.popupApp) {
                // Unmount existing app if it exists
                if (this.popupApp) {
                    this.popupApp.unmount();
                    this.popupApp = null;
                }
                
                // Create reactive object for properties
                this.popupProperties = reactive({ ...properties });
                
                // Create and mount new app instance with reactive properties
                this.popupApp = createApp(Popup, { 
                    properties: this.popupProperties, 
                    side 
                }).use(vuetify);
                this.popupApp.mount(popupContainer);
                
                // Update last geoid
                this.lastPopupGeoid = currentGeoid;
            } else {
                // Same geoid - just update the reactive properties by copying new values
                if (this.popupProperties) {
                    Object.assign(this.popupProperties, properties);
                }
            }
        }
    }

    protected removePopup() {
        if (this.popupApp) {
            this.popupApp.unmount();
            this.popupApp = null;
        }
        if (this.popup) {
            this.popup.remove();
            this.popup = null;
        }
        this.lastPopupGeoid = null;
        this.popupProperties = null;
    }

    async setPaintAndLayoutProperties(year:number | null){
        if(!this.map) return false;
        this.year = year || this.year || null;
        try {
            await this.addIconsToMap(); //Add the icon to the map
        } catch (error) {
            console.error(error);
        } finally {
            if(this.map && this.data.layers.main){
                this.map.setLayoutProperty(this.data.layers.main, 'visibility', 'visible'); 
            }
            if(this.map && this.data.layers.outline){
                this.map.setLayoutProperty(this.data.layers.outline, 'visibility', 'visible');
            }
            return true;
        }
    }
}
