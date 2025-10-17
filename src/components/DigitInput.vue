<template>
  <div class="digit-input">
    <input
      v-for="(digit, index) in digitsArray"
      :key="index"
      ref="inputs"
      maxlength="1"
      type="text"
      inputmode="numeric"
      autocomplete="one-time-code"
      class="digit-input__field"
      v-model="digitsArray[index]"
      @input="onInput($event, index)"
      @keydown="onKeydown($event, index)"
      @paste="onPaste"
    />
  </div>
</template>

<script setup>
import { ref, watch, nextTick } from 'vue'

const props = defineProps({
  modelValue: { type: String, default: '' },
  digits: { type: Number, default: 6 },
})

const emit = defineEmits(['update:modelValue', 'complete'])
const digitsArray = ref(Array(props.digits).fill(''))
const inputs = ref([])

watch(() => props.modelValue, (val) => {
  const chars = val.split('').slice(0, props.digits)
  for (let i = 0; i < props.digits; i++) {
    digitsArray.value[i] = chars[i] || ''
  }
})

watch(
  digitsArray,
  (arr) => {
    const joined = arr.join('')
    emit('update:modelValue', joined)
    if (arr.every((d) => d !== '')) {
      emit('complete', joined)
    }
  },
  { deep: true }
)

function focusInput(i) {
  nextTick(() => {
    inputs.value[i]?.focus()
    inputs.value[i]?.select()
  })
}

function onInput(e, i) {
  const val = e.target.value.replace(/\D/g, '')
  digitsArray.value[i] = val
  if (val && i < props.digits - 1) focusInput(i + 1)
}

function onKeydown(e, i) {
  if (e.key === 'Backspace' && !digitsArray.value[i] && i > 0) {
    digitsArray.value[i - 1] = ''
    focusInput(i - 1)
    e.preventDefault()
  }
  if (e.key === 'ArrowLeft' && i > 0) {
    focusInput(i - 1)
    e.preventDefault()
  }
  if (e.key === 'ArrowRight' && i < props.digits - 1) {
    focusInput(i + 1)
    e.preventDefault()
  }
}

function onPaste(e) {
  e.preventDefault()
  const paste = (e.clipboardData.getData('text') || '').replace(/\D/g, '')
  paste.split('').forEach((c, idx) => {
    if (idx < props.digits) digitsArray.value[idx] = c
  })
  const nextEmpty = digitsArray.value.findIndex((d) => !d)
  if (nextEmpty !== -1) focusInput(nextEmpty)
}
</script>

<style scoped>
.digit-input {
  display: flex;
  gap: 0.5rem;
  width: 100%;
}
.digit-input__field {
  width: 2rem;
  height: 2rem;
  text-align: center;
  font-size: 1.5rem;
  border-radius: 0.25rem;
}
</style>
