
export interface IndicatorConfig {
    title: string;
    field: string;
    short_name: string;
    geolevel: string;
    default: 'left' | 'right' | false;
    timeseries: boolean;
    google_sheets_url: string;
    google_sheets_data: any;
    source_name: string;
    layers: {
        main: string;
        outline: string;
    };
    style: {
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
    icons: {
        main: {
            name: string;
            filename: string;
        };
    };
}
