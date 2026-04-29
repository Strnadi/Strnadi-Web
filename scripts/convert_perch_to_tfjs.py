"""
Convert Perch v2 SavedModel from TensorFlow Hub to TensorFlow.js format.

Usage:
  python scripts/convert_perch_to_tfjs.py

Prerequisites (run in a Python venv with TensorFlow):
  pip install tensorflow tensorflow-hub tensorflowjs

The script will:
  1. Load the Perch v2 model from TensorFlow Hub
  2. Strip the classification head, keeping the embedding extractor
  3. Convert to TF.js format (model.json + weights.bin)
  4. Save to public/models/perch_v2_js/

Note: If you already have a local SavedModel directory, set PERCH_LOCAL_PATH.

TF Hub model: https://tfhub.dev/google/bird-vocalization-classifier/4
"""

import os
import sys
import shutil

# TF Hub URL for Perch v2 (bird vocalization classifier)
TFHUB_MODEL_URL = "https://www.kaggle.com/models/google/bird-vocalization-classifier/tensorFlow2/perch_v2/2"


def load_from_tfhub(model_url: str):
    """Load the Perch model directly from TensorFlow Hub."""
    try:
        import tensorflow_hub as hub
    except ImportError:
        print("tensorflow-hub is not installed. Install with:")
        print("  pip install tensorflow-hub")
        sys.exit(1)

    print(f"Loading model from TF Hub: {model_url}")
    print("(This may take a while on first run — the model will be cached locally.)")

    # hub.load returns a SavedModel-like object; cache dir honours TFHUB_CACHE_DIR
    model = hub.load(model_url)
    return model


def inspect_signatures(model) -> dict:
    """Print and return the serving signatures of a loaded TF Hub model."""
    import tensorflow as tf

    signatures = list(model.signatures.keys())
    print(f"\nAvailable signatures: {signatures}")

    for sig_name in signatures:
        fn = model.signatures[sig_name]
        print(f"\n  [{sig_name}]")
        print(f"    Inputs : {fn.structured_input_signature}")
        print(f"    Outputs: {list(fn.structured_outputs.keys())}")

    return {k: model.signatures[k] for k in signatures}


def resolve_embedding_key(serving_fn) -> str:
    """Pick the output key that carries the embedding vector."""
    outputs = serving_fn.structured_outputs
    # Prefer any key that contains 'embedding'
    for key in outputs:
        if "embedding" in key.lower():
            return key
    # Fallback: first output
    fallback = list(outputs.keys())[0]
    print(f"No 'embedding' key found; falling back to first output: '{fallback}'")
    return fallback


def create_embedding_model(hub_model):
    """
    Wrap the TF Hub model in a Keras subclass that outputs only the
    embedding tensor (dropping the logits / classification head).
    """
    import tensorflow as tf

    serving_fn = hub_model.signatures.get("serving_default")
    if serving_fn is None:
        sigs = list(hub_model.signatures.keys())
        if not sigs:
            raise RuntimeError("The loaded model has no serving signatures.")
        serving_fn = hub_model.signatures[sigs[0]]
        print(f"'serving_default' not found; using '{sigs[0]}'")

    embedding_key = resolve_embedding_key(serving_fn)
    print(f"\nUsing embedding output key: '{embedding_key}'")

    class EmbeddingExtractor(tf.keras.Model):
        """Keras wrapper that exposes only the embedding output of Perch."""

        def __init__(self, hub_model, embedding_key: str):
            super().__init__()
            self._hub_model = hub_model
            self._serving_fn = hub_model.signatures["serving_default"]
            self._embedding_key = embedding_key

        @tf.function(input_signature=[
            tf.TensorSpec(shape=[None, 160_000], dtype=tf.float32, name="audio_input")
        ])
        def call(self, inputs):
            # Perch v2 expects a named keyword argument 'audio_input'
            outputs = self._serving_fn(inputs)
            return outputs[self._embedding_key]

    extractor = EmbeddingExtractor(hub_model, embedding_key)

    # Warm-up inference to materialise shapes
    test_input = tf.zeros([1, 160_000], dtype=tf.float32)
    test_output = extractor(test_input)
    print(f"Embedding output shape : {test_output.shape}")
    print(f"Embedding output dtype : {test_output.dtype}")

    return extractor


def convert_to_tfjs(keras_model, output_dir: str):
    """Save the Keras model as a SavedModel, then convert to TF.js format."""
    import tensorflow as tf

    print(f"\nConverting model to TF.js format ...")
    print(f"Output directory: {output_dir}")

    # Resolve an absolute path so relative `..` segments work correctly
    output_dir = os.path.abspath(output_dir)
    temp_saved_model_dir = os.path.join(os.path.dirname(output_dir), "_temp_saved_model")

    # Clean slate
    for d in (output_dir, temp_saved_model_dir):
        if os.path.exists(d):
            shutil.rmtree(d)
    os.makedirs(output_dir, exist_ok=True)

    print("  Saving intermediate SavedModel ...")
    tf.saved_model.save(keras_model, temp_saved_model_dir)

    print("  Running TF.js converter ...")
    try:
        import tensorflowjs as tfjs
        tfjs.converters.save_saved_model(temp_saved_model_dir, output_dir)
    except ImportError:
        # Fall back to the CLI converter
        print("  tensorflowjs Python module not found; trying CLI ...")
        ret = os.system(
            f"tensorflowjs_converter "
            f"--input_format=tf_saved_model "
            f"--output_format=tfjs_graph_model "
            f"{temp_saved_model_dir} {output_dir}"
        )
        if ret != 0:
            print("\nERROR: tensorflowjs_converter CLI failed.")
            print("Install with:  pip install tensorflowjs")
            sys.exit(1)

    # Remove temp directory
    shutil.rmtree(temp_saved_model_dir, ignore_errors=True)

    # Report output files
    print(f"\nModel saved to: {output_dir}")
    total_size = 0
    for fname in sorted(os.listdir(output_dir)):
        fpath = os.path.join(output_dir, fname)
        size = os.path.getsize(fpath)
        total_size += size
        print(f"  {fname}: {size / 1024 / 1024:.2f} MB")
    print(f"  Total: {total_size / 1024 / 1024:.2f} MB")


def main():
    """Main conversion pipeline."""
    local_path = os.environ.get("PERCH_LOCAL_PATH")
    model_url = os.environ.get("PERCH_TFHUB_URL", TFHUB_MODEL_URL)

    output_dir = os.path.join("public", "models", "perch_v2_js")

    # ------------------------------------------------------------------
    # Step 1: obtain the raw TF Hub / local model
    # ------------------------------------------------------------------
    print("=== Step 1: Load model ===")
    if local_path and os.path.exists(local_path):
        import tensorflow as tf
        print(f"Using local SavedModel: {local_path}")
        hub_model = tf.saved_model.load(local_path)
    else:
        hub_model = load_from_tfhub(model_url)

    inspect_signatures(hub_model)

    # ------------------------------------------------------------------
    # Step 2: build embedding-only Keras model
    # ------------------------------------------------------------------
    print("\n=== Step 2: Create embedding extractor ===")
    embedding_model = create_embedding_model(hub_model)

    # ------------------------------------------------------------------
    # Step 3: convert to TF.js
    # ------------------------------------------------------------------
    print("\n=== Step 3: Convert to TF.js ===")
    convert_to_tfjs(embedding_model, output_dir)

    # ------------------------------------------------------------------
    # Done
    # ------------------------------------------------------------------
    print("\n=== Conversion complete! ===")
    print(f"Model files are in: {output_dir}")
    print("\nNext steps:")
    print("  1. The model will be served at /models/perch_v2_js/model.json")
    print("  2. Commit or deploy the files alongside your web app")
    print("  3. The web app can load the backbone via tf.loadGraphModel()")


if __name__ == "__main__":
    main()