const MODEL_SUBGRAPHS_FIELD = 2;
const SUBGRAPH_TENSORS_FIELD = 0;
const SUBGRAPH_INPUTS_FIELD = 1;
const SUBGRAPH_OUTPUTS_FIELD = 2;
const TENSOR_SHAPE_FIELD = 0;
const TENSOR_SHAPE_SIGNATURE_FIELD = 7;

interface FlatBufferVector {
  dataStart: number;
  length: number;
}

function assertReadable(
  view: DataView,
  offset: number,
  byteLength: number,
  description: string
) {
  if (
    !Number.isInteger(offset) ||
    offset < 0 ||
    byteLength < 0 ||
    offset + byteLength > view.byteLength
  ) {
    throw new Error(`Invalid TFLite model: ${description} is out of bounds.`);
  }
}

function tableField(
  view: DataView,
  tableOffset: number,
  fieldIndex: number
): number | null {
  assertReadable(view, tableOffset, 4, 'table');
  const vtableOffset = tableOffset - view.getInt32(tableOffset, true);
  assertReadable(view, vtableOffset, 4, 'vtable');

  const vtableLength = view.getUint16(vtableOffset, true);
  const entryOffset = vtableOffset + 4 + fieldIndex * 2;
  if (entryOffset + 2 > vtableOffset + vtableLength) return null;

  assertReadable(view, entryOffset, 2, 'vtable field');
  const relativeOffset = view.getUint16(entryOffset, true);
  if (relativeOffset === 0) return null;

  const fieldOffset = tableOffset + relativeOffset;
  assertReadable(view, fieldOffset, 4, 'table field');
  return fieldOffset;
}

function vectorField(
  view: DataView,
  tableOffset: number,
  fieldIndex: number
): FlatBufferVector | null {
  const fieldOffset = tableField(view, tableOffset, fieldIndex);
  if (fieldOffset === null) return null;

  const vectorOffset = fieldOffset + view.getUint32(fieldOffset, true);
  assertReadable(view, vectorOffset, 4, 'vector');
  const length = view.getUint32(vectorOffset, true);
  return { dataStart: vectorOffset + 4, length };
}

function tableVectorItem(
  view: DataView,
  vector: FlatBufferVector,
  index: number
): number {
  const itemOffset = vector.dataStart + index * 4;
  assertReadable(view, itemOffset, 4, 'table vector item');
  const tableOffset = itemOffset + view.getUint32(itemOffset, true);
  assertReadable(view, tableOffset, 4, 'nested table');
  return tableOffset;
}

function intVectorItem(
  view: DataView,
  vector: FlatBufferVector,
  index: number
): number {
  const itemOffset = vector.dataStart + index * 4;
  assertReadable(view, itemOffset, 4, 'integer vector item');
  return view.getInt32(itemOffset, true);
}

function patchTensorShapeSignature(
  view: DataView,
  tensors: FlatBufferVector,
  tensorIndex: number
): number {
  if (tensorIndex < 0 || tensorIndex >= tensors.length) {
    throw new Error(
      `Invalid TFLite model: tensor ${tensorIndex} does not exist.`
    );
  }

  const tensor = tableVectorItem(view, tensors, tensorIndex);
  const shape = vectorField(view, tensor, TENSOR_SHAPE_FIELD);
  const shapeSignature = vectorField(
    view,
    tensor,
    TENSOR_SHAPE_SIGNATURE_FIELD
  );

  if (!shapeSignature) return 0;
  if (!shape || shape.length !== shapeSignature.length) {
    throw new Error(
      `Invalid TFLite model: tensor ${tensorIndex} has incompatible shape metadata.`
    );
  }

  let patchedDimensions = 0;
  for (let i = 0; i < shapeSignature.length; i++) {
    const signatureOffset = shapeSignature.dataStart + i * 4;
    assertReadable(view, signatureOffset, 4, 'shape signature');
    if (view.getInt32(signatureOffset, true) !== -1) continue;

    const concreteDimension = intVectorItem(view, shape, i);
    if (concreteDimension <= 0) {
      throw new Error(
        `Model tensor ${tensorIndex} has an unresolved dynamic dimension. ` +
          'Export the model with a concrete input shape before using it in the browser.'
      );
    }
    view.setInt32(signatureOffset, concreteDimension, true);
    patchedDimensions++;
  }

  return patchedDimensions;
}

/**
 * LiteRT.js currently compares compiled-model tensor dimensions literally, so
 * a TFLite shape signature such as [-1, 160000] rejects every concrete TFJS
 * tensor. Keep the model's declared concrete default shapes and replace only
 * dynamic dimensions on public inputs/outputs before compiling it.
 *
 * The supplied byte array is modified in place to avoid another large model
 * allocation in the browser.
 */
export function concretizeTfliteIoShapes(modelBytes: Uint8Array): number {
  const view = new DataView(
    modelBytes.buffer,
    modelBytes.byteOffset,
    modelBytes.byteLength
  );
  assertReadable(view, 0, 8, 'file header');

  const model = view.getUint32(0, true);
  assertReadable(view, model, 4, 'root model table');
  const subgraphs = vectorField(view, model, MODEL_SUBGRAPHS_FIELD);
  if (!subgraphs || subgraphs.length === 0) {
    throw new Error('Invalid TFLite model: no subgraphs were found.');
  }

  let patchedDimensions = 0;
  for (let i = 0; i < subgraphs.length; i++) {
    const subgraph = tableVectorItem(view, subgraphs, i);
    const tensors = vectorField(view, subgraph, SUBGRAPH_TENSORS_FIELD);
    if (!tensors) {
      throw new Error(`Invalid TFLite model: subgraph ${i} has no tensors.`);
    }

    const publicTensorIndices = new Set<number>();
    for (const field of [SUBGRAPH_INPUTS_FIELD, SUBGRAPH_OUTPUTS_FIELD]) {
      const indices = vectorField(view, subgraph, field);
      if (!indices) continue;
      for (let j = 0; j < indices.length; j++) {
        const tensorIndex = intVectorItem(view, indices, j);
        if (tensorIndex >= 0) publicTensorIndices.add(tensorIndex);
      }
    }

    for (const tensorIndex of publicTensorIndices) {
      patchedDimensions += patchTensorShapeSignature(
        view,
        tensors,
        tensorIndex
      );
    }
  }

  return patchedDimensions;
}
