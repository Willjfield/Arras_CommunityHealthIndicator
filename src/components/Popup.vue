<template>
    <div class="mt-2 popup-content">

        <div v-if="properties.cluster">
            <h4>There are {{ properties.point_count }} features here. <br />
                <v-icon icon="mdi-magnify-plus-outline"></v-icon> Zoom in to select one.
            </h4>
        </div>
        <div v-else>
            <h3 v-if="properties.name">{{ properties.name }} </h3>
            <h3 v-else-if="properties.geoid">{{ properties.geoid }} </h3>
            <div v-if="properties.address" class="mb-2 popup-content-inner">
                {{ decodeURIComponent(properties.address) }}
            </div>
            <div class="mb-2">

                <b>{{ currentIndicator?.title }}</b>
                <v-divider></v-divider>     
                <div v-if="currentIndicator?.has_pct" v-for="stat in stats" :key="stat.key">
                    <div v-if="!stat.key.startsWith('Count_')">{{ stat.key }} : {{ stat.value }}%<span v-if="props.properties[`Count_${stat.key}`]">, ({{ props.properties[`Count_${stat.key}`] }} total)</span></div>
                </div>
                <div v-else-if="currentIndicator?.has_count">
                    <div v-for="stat in stats" :key="stat.key">
                        <div v-if="stat.key.startsWith('Count_') && stat.value > 0">{{ stat.key.split('_')[1] }} : {{ stat.value }} total</div>
                        <div v-else-if="stat.key.startsWith('Count_') && (stat.value == 0 || !stat.value)">{{ stat.key.split('_')[1] }} : No data</div>
                    </div>
                </div>
            </div>
            <v-expansion-panels v-if="moreInfo.length > 0" density="compact">
                <v-expansion-panel variant="flat" density="compact">
                    <v-expansion-panel-title class="py-0" density="compact">
                        <div class="text-small">More Info <br /><span class="text-extra-small">(Click to select)</span>
                        </div>
                    </v-expansion-panel-title>
                    <v-expansion-panel-text class="pa-0" density="compact">
                        <div v-html="moreInfo"></div>
                    </v-expansion-panel-text>
                </v-expansion-panel>
            </v-expansion-panels>
        </div>
    </div>
</template>

<script lang="ts" setup>
import { computed } from 'vue'
import { useIndicatorLevelStore } from '../stores/indicatorLevelStore'

const props = defineProps<{
    properties: any
    side: 'left' | 'right'
}>()

const indicatorStore = useIndicatorLevelStore(props.side)
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

<style scoped>
.maplibregl-popup {
    z-index: 1000;
}

.popup-content {
    line-height: 1.1em;
    text-align: left;
}

.text-small {
    font-size: 12px;
}

.text-extra-small {
    font-size: 10px;
}

.dot-container {
    display: inline-block;
    margin-right: 1px;
    line-height: 4px;
    vertical-align: middle;
}

.dot {
    display: inline-block;
    width: 4px;
    height: 4px;
    border-radius: 50%;
    background-color: #888;
    vertical-align: middle;
}

.capacity-container {
    margin-top: 3px;
    line-height: 5px;
    width: 48%;
    display: inline-block;
    text-align: left;
}

.stat-row {
    /* border-bottom: 1px solid #e0e0e0;
    width: 48%;
    display: inline-block;
    text-align: left;
    vertical-align: middle;
    padding: 0;
    margin: 0;
    line-height: 1.1em;
    font-size: 12px;
    font-weight: 400;
    color: #333;
    background-color: #f0f0f0;
    border-radius: 4px;
    border: 1px solid #e0e0e0;
    padding: 2px;
    margin: 2px; */
}
</style>