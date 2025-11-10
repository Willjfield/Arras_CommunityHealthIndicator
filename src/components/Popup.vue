<template>
    <div ref="popupContainer" class="popup-container">
        <!-- Cluster Message -->
        <div v-if="properties.cluster" class="cluster-message">
            <v-icon icon="mdi-map-marker-multiple" size="32" color="primary" class="mb-2"></v-icon>
            <h4 class="cluster-title">{{ properties.point_count }} Features</h4>
            <p class="cluster-text">
                <v-icon icon="mdi-magnify-plus-outline" size="16" class="mr-1"></v-icon>
                Zoom in to view individual features
            </p>
        </div>

        <!-- Feature Details -->
        <div v-else class="feature-details">
            <!-- Header -->
            <div class="popup-header">
                <v-icon icon="mdi-map-marker" size="24" color="primary" class="header-icon"></v-icon>
                <div class="header-content">
                    <h3 class="feature-name" v-if="properties.name">{{ properties.name }}</h3>
                    <h3 class="feature-name" v-else-if="properties.geoid">ID: {{ properties.geoid }}</h3>
                    <div v-if="properties.address" class="feature-address">
                        <v-icon icon="mdi-map-marker-outline" size="14" class="mr-1"></v-icon>
                        {{ decodeURIComponent(properties.address) }}
                    </div>
                </div>
            </div>

            <!-- Indicator Stats -->
            <div v-if="currentIndicator" class="stats-section">
                <div class="indicator-title">
                    <v-icon icon="mdi-chart-line" size="18" class="mr-2"></v-icon>
                    {{ currentIndicator.title }}
                </div>
                <v-divider class="my-3"></v-divider>
                
                <!-- Percentage Stats -->
                <div v-if="currentIndicator.has_pct" class="stats-grid">
                    <template v-for="(stat, index) in stats" :key="stat.key">
                        <div 
                            v-if="!stat.key.startsWith('Count_')"
                            :class="{ 'stat-item': true, 'stat-item-empty': stat.value == 0 || !stat.value }"
                        >
                            <div class="stat-label">{{ stat.key }}                     
                                <v-icon v-if="index > 0 
                                && index < stats.length
                                && +stat.value > +(stats[index - 1].value)" 
                                icon="mdi-arrow-up-bold" class="ma-0" size="10" color="green"></v-icon>
                                <v-icon v-else-if="index > 0 
                                && +stats[index - 1].value > 0
                                && index < stats.length
                                && +stat.value > 0
                                && +stat.value < +(stats[index - 1].value)"
                                icon="mdi-arrow-down-bold" class="ma-0" size="10" color="red"></v-icon>
                            </div>
                            <div v-if="+stat.value > 0" class="stat-value percentage">
                                {{ stat.value }}%
                                <span v-if="props.properties[`Count_${stat.key}`]" class="stat-total">
                                    ({{ props.properties[`Count_${stat.key}`] }} total)
                                </span>
                            </div>
                        </div>
                    </template>
                </div>

                <!-- Count Stats -->
                <div v-else-if="currentIndicator.has_count" class="stats-grid">
                    <template v-for="stat in stats" :key="stat.key">
                        <div 
                            v-if="stat.key.startsWith('Count_')"
                            class="stat-item"
                            :class="{ 'stat-item-empty': stat.value == 0 || !stat.value }"
                        >
                            <div class="stat-label">{{ stat.key.split('_')[1] }}</div>
                            <div class="stat-value count">
                                <span v-if="stat.value > 0">{{ stat.value }} total</span>
                                <span v-else class="no-data">No data</span>
                            </div>
                        </div>
                    </template>
                </div>
            </div>

            <!-- More Info Expansion Panel -->
            <div v-if="moreInfo.length > 0" class="more-info-section">
                <v-expansion-panels variant="accordion" class="info-panels">
                    <v-expansion-panel>
                        <v-expansion-panel-title class="info-panel-title">
                            <v-icon icon="mdi-information-outline" size="18" class="mr-2"></v-icon>
                            <span>More Information</span>
                            <span class="info-hint">(Click to expand)</span>
                        </v-expansion-panel-title>
                        <v-expansion-panel-text class="info-panel-content">
                            <div v-html="moreInfo" class="info-text"></div>
                        </v-expansion-panel-text>
                    </v-expansion-panel>
                </v-expansion-panels>
            </div>
        </div>
    </div>
</template>

<script lang="ts" setup>
import { computed, onMounted, ref } from 'vue'
import { useIndicatorLevelStore } from '../stores/indicatorLevelStore'

const props = defineProps<{
    properties: any
    side: 'left' | 'right'
}>()

const indicatorStore = useIndicatorLevelStore(props.side)
//const popupContainer = ref<HTMLDivElement | null>(null)
onMounted(() => {
    const popupContainer = document.getElementsByClassName('maplibregl-popup-content') as HTMLCollectionOf<HTMLDivElement>;
    if (popupContainer && popupContainer.length > 0) {
        // The 'zoom' property does not work as expected on many modern browsers for regular elements; 
        // it is non-standard and mostly only works in IE and some Chromium browsers, and not reliably so.
        // Instead, use CSS transform: scale for better cross-browser support:
        for (const container of popupContainer) {
            container.style.transform = `scale(${Math.min(1, window.innerWidth / 1000)})`;
            container.style.transformOrigin = "bottom";
        }
    }
})
const currentIndicator = computed(() => indicatorStore.getCurrentIndicator())
const moreInfo = computed(() => {
    if (!props.properties.more_info) return '';
    const splits = props.properties.more_info.split('\\n');
    return splits.join('<br/>');
})

const counts = computed(() => {
    return Object.keys(props.properties).filter(key => key.startsWith('Count_')).map(key => {
        return {
            key: key,
            value: props.properties[key]
        }
    })
})

const pcts = computed(() => {
    return Object.keys(props.properties).filter(key => !isNaN(+key) && +key > 1900 && +key < 2050).map(key => {
        return {
            key: key,
            value: props.properties[key]
        }
    })
})

const stats = computed(() => {
    return [...pcts.value, ...counts.value]
})
</script>

<style>
.maplibregl-popup{
    max-width: none !important;
    pointer-events: none !important;
   
}

.maplibregl-popup-content{
    box-shadow: #00000052 0px 2px 34px;
    border-radius: 8px;
}
</style>
<style scoped>

.popup-container {
    /* min-width: 280px; */
    max-width: 400px;
    padding: 0;
}

/* Cluster Message */
.cluster-message {
    text-align: center;
    padding: 1.5rem;
    background: linear-gradient(135deg, rgba(37, 99, 235, 0.05) 0%, rgba(59, 130, 246, 0.02) 100%);
    border-radius: 8px;
}

.cluster-title {
    font-size: 1.25rem;
    font-weight: 600;
    color: #1e40af;
    margin: 0.5rem 0;
}

.cluster-text {
    font-size: 0.9rem;
    color: #64748b;
    margin: 0;
    display: flex;
    align-items: center;
    justify-content: center;
}

/* Feature Details */
.feature-details {
    /* padding: 0.5rem; */
}

/* Header */
.popup-header {
    display: flex;
    align-items: flex-start;
    gap: 0.75rem;
    padding: 0.75rem;
    background: linear-gradient(135deg, rgba(37, 99, 235, 0.05) 0%, rgba(59, 130, 246, 0.02) 100%);
    border-radius: 8px;
}

.header-icon {
    flex-shrink: 0;
    margin-top: 0.25rem;
}

.header-content {
    flex: 1;
    min-width: 0;
}

.feature-name {
    font-size: 1.1rem;
    font-weight: 600;
    color: #1e293b;
    margin: 0 0 0.5rem 0;
    line-height: 1.3;
    word-wrap: break-word;
}

.feature-address {
    font-size: 0.85rem;
    color: #64748b;
    display: flex;
    align-items: center;
    line-height: 1.4;
}

/* Stats Section */
.stats-section {
    /* margin-bottom: 1rem; */
}

.indicator-title {
    font-size: 1rem;
    font-weight: 600;
    color: #1e293b;
    display: flex;
    align-items: center;
    margin-bottom: 0.5rem;
}

.stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(0px, 1fr));
    gap: 0.25rem;
}

.stat-item {
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 6px;
    padding: 0.25rem;
    transition: all 0.2s ease;
}

.stat-item:hover {
    background: #f1f5f9;
    border-color: #cbd5e1;
    transform: translateY(-1px);
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.stat-item-empty {
    opacity: 0.6;
    background: #f1f5f9;
}

.stat-label {
    font-size: 0.75rem;
    line-height: 1rem;
    font-weight: 500;
    color: #64748b;
    text-transform: uppercase;
    letter-spacing: 0.5px;
}

.stat-value {
    font-size: .9rem;
    font-weight: 600;
    color: #1e293b;
    line-height: 1.3;
}

.stat-value.percentage {
    color: #2563eb;
}

.stat-value.count {
    color: #059669;
}

.stat-total {
    font-size: 0.85rem;
    font-weight: 400;
    color: #64748b;
    margin-left: 0.25rem;
}

.no-data {
    color: #94a3b8;
    font-style: italic;
    font-weight: 400;
}

/* More Info Section */
.more-info-section {
    /* margin-top: 1rem; */
    padding-top: 1rem;
    border-top: 1px solid #e2e8f0;
}

.info-panels {
    background: transparent;
}

.info-panel-title {
    font-size: 0.9rem;
    font-weight: 500;
    color: #1e293b;
    padding: 0.5rem 0;
}

.info-hint {
    font-size: 0.75rem;
    color: #94a3b8;
    font-weight: 400;
    margin-left: 0.5rem;
}

.info-panel-content {
    padding: 0.75rem 0;
    font-size: 0.9rem;
    line-height: 1.6;
    color: #475569;
}

.info-text {
    color: #475569;
}

.info-text :deep(p) {
    margin: 0.5rem 0;
}

.info-text :deep(strong) {
    color: #1e293b;
    font-weight: 600;
}

/* Responsive */
@media (max-width: 400px) {
    .popup-container {
        /* min-width: 240px; */
    }
    
    .stats-grid {
        grid-template-columns: 1fr;
    }
    
    .feature-name {
        font-size: 1rem;
    }
}
</style>