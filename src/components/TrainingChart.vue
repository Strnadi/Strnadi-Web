<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from 'vue';
import type { EpochLog } from '@/services/tfjs/training';

const props = defineProps<{
  history: EpochLog[];
  width?: number;
  height?: number;
}>();

const canvasRef = ref<HTMLCanvasElement | null>(null);

function draw() {
  const canvas = canvasRef.value;
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const dpr = window.devicePixelRatio || 1;
  const width = props.width ?? canvas.clientWidth;
  const height = props.height ?? canvas.clientHeight;

  canvas.width = width * dpr;
  canvas.height = height * dpr;
  ctx.scale(dpr, dpr);

  ctx.clearRect(0, 0, width, height);

  const data = props.history;
  if (data.length === 0) {
    ctx.fillStyle = '#9ca3af';
    ctx.font = '14px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Čekání na první epochu…', width / 2, height / 2);
    return;
  }

  const padding = { top: 10, right: 10, bottom: 24, left: 40 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  const allLoss = data.map((d) => d.loss).filter(Number.isFinite);
  const allValLoss = data.map((d) => d.valLoss).filter(Number.isFinite);
  const allAcc = data.map((d) => d.acc).filter(Number.isFinite);
  const allValAcc = data.map((d) => d.valAcc).filter(Number.isFinite);

  const minLoss = Math.min(...allLoss, ...allValLoss);
  const maxLoss = Math.max(...allLoss, ...allValLoss);
  const minAcc = Math.min(...allAcc, ...allValAcc);
  const maxAcc = Math.max(...allAcc, ...allValAcc);

  const lossRange = maxLoss - minLoss || 1;
  const accRange = maxAcc - minAcc || 1;

  ctx.strokeStyle = '#e5e7eb';
  ctx.lineWidth = 1;
  for (let i = 0; i <= 4; i++) {
    const y = padding.top + (chartH / 4) * i;
    ctx.beginPath();
    ctx.moveTo(padding.left, y);
    ctx.lineTo(padding.left + chartW, y);
    ctx.stroke();
  }

  ctx.strokeStyle = '#d1d5db';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(padding.left, padding.top);
  ctx.lineTo(padding.left, padding.top + chartH);
  ctx.lineTo(padding.left + chartW, padding.top + chartH);
  ctx.stroke();

  const xFor = (epoch: number) =>
    padding.left + (epoch / Math.max(data.length - 1, 1)) * chartW;

  const yForLoss = (v: number) =>
    padding.top + chartH - ((v - minLoss) / lossRange) * chartH;

  const yForAcc = (v: number) =>
    padding.top + chartH - ((v - minAcc) / accRange) * chartH;

  function drawLine(values: number[], color: string, yFn: (v: number) => number) {
    if (!ctx) return;
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    let started = false;
    for (let i = 0; i < values.length; i++) {
      const v = values[i];
      if (!Number.isFinite(v)) continue;
      const x = xFor(i);
      const y = yFn(v);
      if (!started) {
        ctx.moveTo(x, y);
        started = true;
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.stroke();
  }

  drawLine(data.map((d) => d.loss), '#ef4444', yForLoss);
  drawLine(data.map((d) => d.valLoss), '#f97316', yForLoss);
  drawLine(data.map((d) => d.acc), '#3b82f6', yForAcc);
  drawLine(data.map((d) => d.valAcc), '#22c55e', yForAcc);

  const legendItems = [
    { label: 'loss', color: '#ef4444' },
    { label: 'val_loss', color: '#f97316' },
    { label: 'acc', color: '#3b82f6' },
    { label: 'val_acc', color: '#22c55e' },
  ];

  let lx = padding.left;
  const ly = padding.top + chartH + 16;
  ctx.font = '12px sans-serif';
  for (const item of legendItems) {
    ctx.fillStyle = item.color;
    ctx.fillRect(lx, ly - 8, 12, 8);
    ctx.fillStyle = '#374151';
    ctx.fillText(item.label, lx + 16, ly);
    lx += ctx.measureText(item.label).width + 32;
  }
}

let observer: ResizeObserver | null = null;

function onResize() {
  draw();
}

onMounted(() => {
  draw();
  window.addEventListener('resize', onResize);
  if (canvasRef.value) {
    observer = new ResizeObserver(() => draw());
    observer.observe(canvasRef.value);
  }
});

onUnmounted(() => {
  window.removeEventListener('resize', onResize);
  observer?.disconnect();
});

watch(() => props.history, draw, { deep: true });

defineExpose({ draw });
</script>

<template>
  <canvas
    ref="canvasRef"
    class="w-full h-full"
    :style="{ minHeight: '200px' }"
  />
</template>

<style scoped>
@reference "../styles/main.css";
</style>
