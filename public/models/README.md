# Perch v2 LiteRT Model

Place the Perch v2 `.tflite` model file here as `perch_v2.tflite`.

This file is git-ignored due to its size. Place it manually.

## Model info

- Format: TFLite flatbuffer (run via LiteRT.js)
- Input: `[batch, 160000]` float32 tensor (5 seconds of audio at 32kHz mono)
- Output: `embedding` tensor with shape `[batch, 1280]` (Perch v2 embedding)
- Runtime: `@litertjs/core` + `@litertjs/tfjs-interop` (XNNPACK / Webassembly backend, with WebGPU support)
- Backbone is frozen (not trainable); only the classification head is trained

## WASM files

LiteRT.js requires WASM runtime files, which are copied to `public/wasm/litert/` on `npm install` via the `postinstall` script. These are git-ignored.

## Obtaining the model

Export the Perch v2 SavedModel to TFLite format using Python:

```python
import tensorflow as tf

converter = tf.lite.TFLiteConverter.from_saved_model("/path/to/perch_v2_saved_model")
converter.target_spec.supported_ops = [tf.lite.OpsSet.TFLITE_BUILTINS]
tflite_model = converter.convert()

with open("public/models/perch_v2.tflite", "wb") as f:
    f.write(tflite_model)
```