export type Preference<T> = {
    title: string;
    description: string;
    key: string;
    defaultValue: T;
    value?: T;
};

export const ACTIVE_EXPERIMENTS: Preference<any>[] = [
    {
        title: 'Homepage V2',
        description: 'Homepage redesign to highlight Stripe specific features',
        key: 'homepage_v2',
        defaultValue: false,
    },
    {
        title: 'Historical Timeliness Tab V2',
        description: 'User Defined Report Historical Timeliness View to use SLAs set on DPIs',
        key: 'historical_timeliness_tab_v2',
        defaultValue: false,
    },
];
