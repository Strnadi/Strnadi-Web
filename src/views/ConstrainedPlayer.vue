<template>
  <div class="audio-player" role="region" aria-label="Audio player with constrained segment">
    <!-- native audio element (hidden controls) -->
    <audio
      ref="audio"
      :src="src"
      @loadedmetadata="onLoadedMetadata"
      @timeupdate="onTimeUpdate"
      @seeking="onSeeking"
      @ended="onEnded"
      preload="metadata"
    ></audio>

    <!-- simple custom controls -->
    <div class="controls">
      <button @click="togglePlay" :aria-pressed="isPlaying">
        {{ isPlaying ? 'Pause' : 'Play' }}
      </button>

      <button @click="rewind" title="Rewind 5s">« 5s</button>
      <button @click="forward" title="Forward 5s">5s »</button>

      <div class="progress">
        <input
          type="range"
          :min="0"
          :max="segmentDuration"
          step="0.01"
          :value="progress"
          @input="onSeek"
          aria-label="Seek within constrained segment"
        />
        <div class="time">
          {{ formatTime(displayCurrent) }} / {{ formatTime(segmentDuration) }}
        </div>
      </div>

      <label class="small-control">
        <input type="checkbox" v-model="loopSegmentLocal" /> Loop
      </label>

      <label class="small-control">
        Vol
        <input type="range" min="0" max="1" step="0.01" v-model.number="volume" @input="onVolume" />
      </label>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'

/**
 * Props
 * - src: audio source URL
 * - start: artificial start time in seconds (default 0)
 * - end: artificial end time in seconds (default = audio duration)
 * - loopSegment: whether to loop the constrained segment
 */
const props = defineProps({
  src: { type: String, required: true },
  start: { type: Number, default: 0 },
  end: { type: Number, default: null },
  loopSegment: { type: Boolean, default: false }
})

// local refs
const audio = ref(null)
const isPlaying = ref(false)
const duration = ref(0)
const effectiveStart = ref(props.start ?? 0)
const effectiveEnd = ref(props.end ?? null)
const loopSegmentLocal = ref(!!props.loopSegment)
const volume = ref(1)

// flag used to avoid reacting to programmatic currentTime changes
const programmaticSeek = ref(false)

onMounted(() => {
  if (audio.value) audio.value.volume = volume.value
})

watch(volume, (v) => {
  if (audio.value) audio.value.volume = v
})

// When metadata loads, determine effective end and clamp start/end
function onLoadedMetadata () {
  duration.value = audio.value.duration || 0

  // If no end provided or it's beyond duration, clamp to duration
  if (props.end == null || props.end > duration.value || !isFinite(props.end)) {
    effectiveEnd.value = duration.value
  } else {
    effectiveEnd.value = props.end
  }

  // clamp start
  effectiveStart.value = Math.max(0, Math.min(props.start ?? 0, duration.value))

  // make sure start < end (if not, nudge start earlier)
  if (effectiveStart.value >= effectiveEnd.value) {
    effectiveStart.value = Math.max(0, effectiveEnd.value - 0.1)
  }

  // Seek to the constrained start immediately (programmatic)
  programmaticSeek.value = true
  try {
    audio.value.currentTime = effectiveStart.value
  } catch (e) {
    // Some browsers may throw if seeking too early — ignore and rely on next timeupdate
  }
  // small timeout to clear the flag (keeps event handlers simple)
  setTimeout(() => { programmaticSeek.value = false }, 50)
}

const segmentDuration = computed(() => {
  const end = effectiveEnd.value ?? duration.value
  return Math.max(0, end - effectiveStart.value)
})

const progress = computed(() => {
  if (!audio.value) return 0
  return Math.max(0, Math.min(segmentDuration.value, (audio.value.currentTime || 0) - effectiveStart.value))
})

const displayCurrent = computed(() => progress.value)

// Play/pause toggle — ensure we start inside the constrained range
function togglePlay () {
  if (!audio.value) return
  if (audio.value.paused) {
    if (!isInsideSegment(audio.value.currentTime)) {
      audio.value.currentTime = effectiveStart.value
    }
    audio.value.play()
    isPlaying.value = true
  } else {
    audio.value.pause()
    isPlaying.value = false
  }
}

function isInsideSegment (t) {
  if (t == null || !isFinite(t)) return false
  return t >= effectiveStart.value && t <= effectiveEnd.value
}

// Enforce constraints during time updates
function onTimeUpdate () {
  if (programmaticSeek.value) return
  const t = audio.value.currentTime

  // If browser somehow moved before segment, jump to start
  if (t < effectiveStart.value - 0.05) {
    programmaticSeek.value = true
    audio.value.currentTime = effectiveStart.value
    setTimeout(() => { programmaticSeek.value = false }, 50)
    return
  }

  // If we've reached (or passed) the artificial end
  if (t >= effectiveEnd.value - 0.02) {
    if (loopSegmentLocal.value) {
      // loop: jump back to start and continue playing
      programmaticSeek.value = true
      audio.value.currentTime = effectiveStart.value
      // small timeout then clear flag
      setTimeout(() => { programmaticSeek.value = false }, 50)
    } else {
      // stop at end
      audio.value.pause()
      isPlaying.value = false
      // clamp to exact end time to avoid tiny overshoot
      programmaticSeek.value = true
      audio.value.currentTime = effectiveEnd.value
      setTimeout(() => { programmaticSeek.value = false }, 50)
    }
  }
}

// Prevent user seeking outside the segment (e.g., via native UI or JS)
function onSeeking () {
  if (programmaticSeek.value) return
  const t = audio.value.currentTime
  if (t < effectiveStart.value) audio.value.currentTime = effectiveStart.value
  else if (t > effectiveEnd.value) audio.value.currentTime = effectiveEnd.value
}

function onSeek (evt) {
  // range input gives value relative to the segment
  const v = parseFloat(evt.target.value)
  if (!audio.value || Number.isNaN(v)) return
  programmaticSeek.value = true
  audio.value.currentTime = effectiveStart.value + v
  setTimeout(() => { programmaticSeek.value = false }, 50)
}

function onEnded () {
  // native ended means the original media ended — ensure UI reflects that
  isPlaying.value = false
}

function rewind () {
  if (!audio.value) return
  const target = Math.max(effectiveStart.value, (audio.value.currentTime || 0) - 5)
  audio.value.currentTime = target
}

function forward () {
  if (!audio.value) return
  const target = Math.min(effectiveEnd.value, (audio.value.currentTime || 0) + 5)
  audio.value.currentTime = target
}

function onVolume () {
  if (audio.value) audio.value.volume = volume.value
}

function formatTime (s) {
  if (!isFinite(s)) return '0:00'
  const mm = Math.floor(s / 60)
  const ss = Math.floor(s % 60).toString().padStart(2, '0')
  return `${mm}:${ss}`
}
</script>

<style scoped>
.audio-player {
  border: 1px solid #ddd;
  padding: 12px;
  border-radius: 8px;
  max-width: 560px;
}
.controls {
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
}
.progress {
  flex: 1 1 220px;
  display: flex;
  flex-direction: column;
}
.time {
  font-size: 12px;
  color: #444;
  margin-top: 4px;
}
.small-control {
  display: flex;
  align-items: center;
  gap: 6px;
}
button {
  padding: 6px 10px;
  border-radius: 6px;
  border: 1px solid #ccc;
  background: white;
}
input[type=range] { width: 100%; }
</style>

<!--
Usage examples (in parent component/template):

<Vue3AudioPlayer src="/audio/song.mp3" :start="30" :end="60" :loop-segment="true" />

Notes:
- `start` and `end` are in seconds. If `end` is omitted or greater than the file's duration,
  it will be clamped to the duration when metadata loads.
- The component enforces the artificial start/end by:
  * seeking to `start` when metadata loads or user tries to play outside the segment
  * clamping any seeks to [start, end]
  * stopping playback at `end` (or looping back to `start` if loopSegment is true)
- You can expand the component by exposing events (e.g. `@segment-ended`) or adding keyboard
  accessibility, captions, or a visual waveform.
-->
