<template>
    <div class="mt-2 popup-content">
        <h3>{{ properties.name }} </h3>
        <div class="mb-2 popup-content-inner">
            {{ decodeURIComponent(properties.address) }}
        </div>
        <div class="mb-2">

            <b>{{ currentIndicator?.title }}</b>
            <v-divider></v-divider>
            <div v-if="currentIndicator?.has_pct">
                <div class="capacity-container" v-for="pct in pcts" :key="pct.key">
                    {{ pct.key }} : {{ pct.value }}{{ pct.value > 0 ? '%' : '(no data)' }}
                    <br /><br />
                </div>
            </div>
            <div class="capacity-container" v-for="count in counts" :key="count.key">
                <span v-if="count.value > 0 && !currentIndicator?.has_pct">
                    {{ count.key.split('_')[1] }} : {{ count.value }}
                    <br /><br />
                    <span class="dot-container" v-for="(n, c) in Number(count.value)" :key="c">
                        <span class="dot"></span>
                    </span>
                    <v-divider></v-divider>
                </span>
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
}
</style>