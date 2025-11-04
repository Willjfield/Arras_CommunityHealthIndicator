import { createApp } from 'vue'
import { createRouter, createWebHistory } from 'vue-router';
import { createPinia } from 'pinia';
import vuetify from './plugins/vuetify.js'
import axios from 'axios';
import App from './App.vue'
import mitt from 'mitt';
import './style.css';
const emitter = mitt();

const app = createApp(App)
const pinia = createPinia()
app.provide('mitt', emitter)

//console.log('process.env.NODE_ENV', process?.env?.NODE_ENV, isProduction);
const isProduction = typeof process !== 'undefined' && typeof process?.env !== 'undefined' && process?.env?.NODE_ENV === 'production';
const historyString = ''//isProduction ? '/Arras_Prototype/' : '';

const mainConfig = (await axios.get('/config/main.json')).data;

const activeCategories = mainConfig.categories
    .filter((category: any) => category.enabled && category.config)

const categoryConfigs: Record<string, any> = {};

await Promise.all(activeCategories.map(async (config: any) => {
    const key = config.query_str as string;
    categoryConfigs[key] = (await axios.get(config.config)).data
}));

app.provide('categoryConfigs', categoryConfigs);
app.provide('mainConfig', mainConfig);

const router = createRouter({
    history: createWebHistory(historyString),
    routes: [
        {
            path: '/',
            name: 'landing',
            component: () => import('./views/Landing.vue'),
            meta: { title: 'Landing' }
        },
        {
            path: '/Map',
            name: 'map',
            component: () => import('./views/MapPage.vue'),
            meta: { title: 'Map' }
        },
        {
            path: '/config-editor',
            name: 'config-editor',
            component: () => import('./views/ConfigEditor.vue'),
            meta: { title: 'Config Editor' }
        }
    ]
})

app.use(pinia).use(vuetify).use(router)

app.mount('#app')
