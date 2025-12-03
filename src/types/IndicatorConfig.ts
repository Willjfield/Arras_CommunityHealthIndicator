export interface Icon {
    name: string;
    filename?: string;
}
export interface IndicatorConfig {
    ratePer: number;
    title: string;
    field: string;
    short_name: string;
    geolevel: string;
    default: 'left' | 'right' | false;
    timeseries: boolean;
    has_pct: boolean;
    has_count: boolean;
    google_sheets_url: string;
    google_sheets_data: any;
    source_name: string;
    layers: {
        [x: string]: any;
        main: string;
        outline: string;
        circle: string | null;
    };
    style: {
        colors: any;
        min: {
            color: string;
            value: number;
        };
        max: {
            color: string;
            value: number;
        };
    };
    fill_color: string[];
    icons: Icon[];
}
