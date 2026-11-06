<script setup>
import { onMounted, onUnmounted, ref, watch } from 'vue';
import { usePreferences } from '@vben/preferences';
import { init, use } from 'echarts/core';
import { LineChart } from 'echarts/charts';
import { GridComponent, TooltipComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
use([LineChart, GridComponent, TooltipComponent, CanvasRenderer]);
const props = defineProps({ period: String });
const el = ref(); const { isDark } = usePreferences(); let chart; let observer;
function render() { chart?.setOption({ tooltip: { trigger: 'axis' }, grid: { left: 42, right: 18, top: 12, bottom: 28 }, xAxis: { type: 'category', data: props.period === '7' ? ['10/30','10/31','11/01','11/02','11/03','11/04','11/05'] : ['10/23','10/25','10/27','10/29','10/31','11/02','11/05'], axisLine: { show: false }, axisTick: { show: false }, axisLabel: { color: isDark.value ? '#94a3b8' : '#64748b' } }, yAxis: { type: 'value', splitLine: { lineStyle: { color: isDark.value ? '#334155' : '#eef2f6' } }, axisLabel: { color: isDark.value ? '#94a3b8' : '#64748b' } }, series: [{ name: '请求量（示例）', type: 'line', data: props.period === '7' ? [3800,5100,4400,6800,5600,8200,7300] : [6800,9100,7400,10800,9600,12200,9300], smooth: true, symbolSize: 6, lineStyle: { width: 2, color: '#6876ed' }, itemStyle: { color: '#6876ed' }, areaStyle: { color: '#6876ed', opacity: .08 } }] }); }
onMounted(() => { chart = init(el.value); render(); observer = new ResizeObserver(() => chart.resize()); observer.observe(el.value); });
watch([() => props.period, isDark], render);
onUnmounted(() => { observer?.disconnect(); chart?.dispose(); });
</script>
<template><div ref="el" class="h-60 w-full" role="img" aria-label="请求趋势，演示数据" /></template>
