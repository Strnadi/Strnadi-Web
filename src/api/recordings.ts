import axios from 'axios';
import { projectStore } from '@/state/ProjectStore';
import {
  fileToUploadRequest,
  postRecordingPhoto,
  type RecordingPhoto
} from './photos';
import {
  authorizedGet,
  authorizedPatch,
  authorizedDelete,
  authorizedPost
} from './utils';
import { md5Hex } from '@/utils/md5';
import type { Numeric } from '@/types/basic';

/** Tenant `RecordingPartResponse`. Audio is fetched separately, per part. */
export interface RecordingPartResponse {
  id: number;
  startDate: string | null;
  endDate: string | null;
  gpsLatitudeStart: number | null;
  gpsLongitudeStart: number | null;
  gpsLatitudeEnd: number | null;
  gpsLongitudeEnd: number | null;
  /** Duration in seconds, as stored by the API. */
  length: number | null;
}

/** Tenant `RecordingResponse`. */
export interface RecordingResponse {
  id: number;
  createdAt: string;
  estimatedBirdsCount: number | null;
  byApp: boolean;
  name: string | null;
  note: string | null;
  notePost: string | null;
  device: string | null;
  userId: string | null;
  /** How many parts the uploader promised; null for legacy rows. */
  expectedPartsCount: number | null;
  /** True once complete-upload verified every part against the client's hash. */
  uploadConfirmed: boolean;
  parts: RecordingPartResponse[] | null;
}

/** Tenant `DetectedDialectResponse`. */
export interface DetectedDialect {
  id: number;
  filteredRecordingPartId: number;
  userGuessDialect: string | null;
  confirmedDialect: string | null;
  predictedDialect: string | null;
}

/** Tenant `FilteredRecordingPartState`. */
export enum FilteredRecordingPartState {
  AwaitingProcession = 1,
  ConfirmedWithCorrectGuess = 2,
  ConfirmedWithWrongGuess = 3,
  UnableToConfirm = 4,
  ConfirmedManually = 5,
  DetectedByAi = 6,
  DetectedByAiAndConfirmed = 7
}

/** Tenant `FilteredRecordingPartResponse`. */
export interface FilteredPartModel {
  id: number;
  startDate: string;
  endDate: string;
  state: FilteredRecordingPartState | null;
  representantFlag: boolean | null;
  recordingId: number;
  recording: RecordingResponse;
  detectedDialects: DetectedDialect[];
}

export interface RecordingMapBounds {
  north: number;
  south: number;
  west: number;
  east: number;
}

/** Tenant `OwnerScope`. */
export enum RecordingMapOwnerScope {
  All = 0,
  Mine = 1,
  Others = 2
}

/** Tenant `DialectMode`. */
export enum RecordingMapDialectMode {
  All = 0,
  AiAdmin = 1,
  AdminOnly = 2
}

export type RecordingMapSource = 'confirmed' | 'ai' | 'user' | 'unknown';

export interface RecordingMapDialect {
  id: number;
  dialectCode: string;
  color: string;
  hintOrder: number;
  isDialect: boolean;
  contributionCount: number;
  percentage: number;
}

export interface RecordingMapClusterItem {
  recordingId: number;
  representativePartId: number | null;
  locationPartId: number;
  locationSource: 'representative' | 'latestPart';
  name: string | null;
  createdAt: string;
  position: {
    latitude: number;
    longitude: number;
  };
  source: RecordingMapSource;
}

export interface RecordingMapRecordingFeature {
  kind: 'recording';
  recordingId: number;
  representativePartId: number | null;
  locationPartId: number;
  locationSource: 'representative' | 'latestPart';
  latitude: number;
  longitude: number;
  name: string | null;
  createdAt: string;
  dialects: RecordingMapDialect[];
  source: RecordingMapSource;
}

export interface RecordingMapClusterFeature {
  kind: 'cluster';
  id: string;
  latitude: number;
  longitude: number;
  bounds: RecordingMapBounds;
  count: number;
  dialects: RecordingMapDialect[];
  source: RecordingMapSource | 'mixed';
  /** Preview only - the API caps it at 5 and pages the rest via nextItemsCursor. */
  items: RecordingMapClusterItem[];
  hasMoreItems: boolean;
  nextItemsCursor: string | null;
}

export type RecordingMapFeature =
  | RecordingMapRecordingFeature
  | RecordingMapClusterFeature;

export interface RecordingMapClustersResult {
  bounds: RecordingMapBounds;
  clustered: boolean;
  clusterDistanceMeters: number | null;
  visibleRecordingCount: number;
  features: RecordingMapFeature[];
}

interface RecordingMapFilters {
  clustered?: boolean;
  mixDialects?: boolean;
  mixSources?: boolean;
  clusterDistanceMeters?: number;
  ownerScope?: RecordingMapOwnerScope;
  userId?: string;
  /** Date-only, `YYYY-MM-DD`. */
  createdFrom?: string;
  createdTo?: string;
  onlyMeaningfulDialects?: boolean;
  hideOthersWithoutMeaningfulDialect?: boolean;
  dialectMode?: RecordingMapDialectMode;
}

/** Explicit-bounds variant: the API needs all four edges together. */
export interface RecordingMapBoundsQuery
  extends RecordingMapBounds,
    RecordingMapFilters {
  /** Required when clustering unless clusterDistanceMeters is given instead. */
  zoom?: number;
}

/**
 * Center/viewport variant: the API derives the bounds itself, which keeps the
 * cluster radius consistent with what the user actually sees on screen.
 */
export interface RecordingMapViewportQuery extends RecordingMapFilters {
  centerLat: number;
  centerLng: number;
  zoom: number;
  viewportWidthPx: number;
  viewportHeightPx: number;
  devicePixelRatio?: number;
}

export type RecordingMapClustersQuery =
  | RecordingMapBoundsQuery
  | RecordingMapViewportQuery;

export interface RecordingMapClusterItemsPage {
  clusterId: string;
  count: number;
  items: RecordingMapClusterItem[];
  hasMoreItems: boolean;
  nextItemsCursor: string | null;
}

/** Tenant `Dialect`. */
export interface DialectDefinition {
  id: number;
  dialectCode: string;
  color: string;
  hintOrder: number;
  isDialect: boolean;
}

export interface UpdateDetectedDialectRequest {
  id: number;
  userGuessDialectId?: number | null;
  confirmedDialectId?: number | null;
  predictedDialectId?: number | null;
}

export interface DetectedDialectUploadRequest {
  filteredPartId: number;
  userGuessDialectId?: number | null;
  confirmedDialectId?: number | null;
  predictedDialectId?: number | null;
}

/** Tenant `RecordingUploadRequest`. */
export interface RecordingUploadRequest {
  createdAt: string;
  estimatedBirdsCount: number;
  device: string;
  deviceId?: string | null;
  byApp: boolean;
  note?: string | null;
  name?: string | null;
  expectedPartsCount?: number | null;
}

/** Tenant `UpdateRecordingRequest` - every field is optional. */
export interface UpdateRecordingRequest {
  name?: string | null;
  estimatedBirdsCount?: number | null;
  note?: string | null;
  notePost?: string | null;
  device?: string | null;
}

/** Tenant `FilteredRecordingPartUploadRequest`. */
export interface FilteredPartUploadRequest {
  recordingId: number;
  startDate: string;
  endDate: string;
  dialectCode: string;
}

/** Tenant `FilteredRecordingPartUpdateRequest`. */
export interface FilteredPartUpdateRequest {
  recordingId?: number | null;
  parentId?: number | null;
  startDate?: string | null;
  endDate?: string | null;
  state?: FilteredRecordingPartState | null;
  representant?: boolean | null;
}

/** Tenant `PostConfirmedDialectRequest`. */
export interface PostConfirmedDialectRequest {
  recordingId: number;
  startDate: string;
  endDate: string;
  dialectCode: string;
  representant: boolean;
}

/** Tenant `UpdateConfirmedDialectRequest`. */
export interface UpdateConfirmedDialectRequest {
  filteredPartId: number;
  startDate?: string | null;
  endDate?: string | null;
  confirmedDialectCode?: string | null;
  representant?: boolean | null;
}

export interface RecordingPartUploadParams {
  startDate: string;
  endDate: string;
  gpsLatitudeStart: number;
  gpsLatitudeEnd: number;
  gpsLongitudeStart: number;
  gpsLongitudeEnd: number;
  data: File;
}

/**
 * `DateTime.ToString("O")` shape, which is what the API's completion hash is
 * built from. JavaScript only carries milliseconds, so the remaining four
 * digits of the .NET tick fraction are always zero.
 */
export const toRoundtripUtc = (value: string | Date): string => {
  const date = value instanceof Date ? value : new Date(value);
  return `${date.toISOString().slice(0, -1)}0000Z`;
};

const toBase64 = (content: ArrayBuffer): string => {
  const bytes = new Uint8Array(content);
  let binary = '';
  for (let index = 0; index < bytes.length; index += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(index, index + 0x8000));
  }
  return btoa(binary);
};

/**
 * Reproduces the digest CompleteUploadAsync computes server-side: parts ordered
 * by start date, each contributing its round-trip timestamps, invariant-culture
 * coordinates and base64 audio.
 */
export const computeUploadHash = async (
  parts: RecordingPartUploadParams[]
): Promise<string> => {
  const ordered = [...parts].sort(
    (a, b) => Date.parse(a.startDate) - Date.parse(b.startDate)
  );

  let content = '';
  for (const part of ordered) {
    content += toRoundtripUtc(part.startDate);
    content += toRoundtripUtc(part.endDate);
    content += String(part.gpsLatitudeStart);
    content += String(part.gpsLongitudeStart);
    content += String(part.gpsLatitudeEnd);
    content += String(part.gpsLongitudeEnd);
    content += toBase64(await part.data.arrayBuffer());
  }

  return md5Hex(content);
};

export const postRecording = async (
  token: string,
  recording: RecordingUploadRequest,
  recordingParts: RecordingPartUploadParams[],
  photos?: File[],
  onProgress?: (completed: number, total: number, step: string) => void
): Promise<number> => {
  const total = 2 + recordingParts.length + (photos?.length ?? 0);
  let completed = 0;

  const recordingId = await authorizedPost<number, RecordingUploadRequest>(
    '/recordings',
    token,
    { ...recording, expectedPartsCount: recordingParts.length }
  );
  onProgress?.(++completed, total, 'Nahrávání údajů');

  for (const [index, part] of recordingParts.entries()) {
    const formData = new FormData();
    formData.append('recordingId', recordingId.toString());
    formData.append('startDate', toRoundtripUtc(part.startDate));
    formData.append('endDate', toRoundtripUtc(part.endDate));
    formData.append('gpsLatitudeStart', String(part.gpsLatitudeStart));
    formData.append('gpsLatitudeEnd', String(part.gpsLatitudeEnd));
    formData.append('gpsLongitudeStart', String(part.gpsLongitudeStart));
    formData.append('gpsLongitudeEnd', String(part.gpsLongitudeEnd));
    formData.append('file', part.data);

    await authorizedPost<number, FormData>(
      '/recordings/part-new',
      token,
      formData
    );
    onProgress?.(
      ++completed,
      total,
      `Nahrávání zvuku ${index + 1}/${recordingParts.length}`
    );
  }

  for (const [index, photo] of (photos ?? []).entries()) {
    await postRecordingPhoto(
      token,
      recordingId,
      await fileToUploadRequest(photo)
    );
    onProgress?.(
      ++completed,
      total,
      `Nahrávání fotografie ${index + 1}/${photos?.length ?? 0}`
    );
  }

  // Confirms every part arrived intact. A mismatch only leaves the recording
  // unconfirmed - it never discards what was already uploaded - so a failure
  // here must not fail the upload.
  try {
    await completeRecordingUpload(
      token,
      recordingId,
      await computeUploadHash(recordingParts)
    );
  } catch {
    // The recording stays listed by GET /recordings/incomplete for a retry.
  }
  onProgress?.(++completed, total, 'Ověřování nahrávky');

  return recordingId;
};

/** Verifies that every part arrived intact; flips `uploadConfirmed` on match. */
export const completeRecordingUpload = async (
  token: string,
  id: Numeric,
  hash: string
): Promise<void> =>
  authorizedPost<void, { hash: string }>(
    `/recordings/${id}/complete-upload`,
    token,
    { hash }
  );

export const getRecording = async (
  id: Numeric,
  parts = true
): Promise<RecordingResponse> => {
  const response = await axios.get<RecordingResponse>(`/recordings/${id}`, {
    params: { parts }
  });
  return response.data;
};

export const getRecordings = async ({
  parts = false,
  userId
}: { parts?: boolean; userId?: string } = {}): Promise<RecordingResponse[]> => {
  const response = await axios.get<RecordingResponse[]>('/recordings', {
    params: userId !== undefined ? { userId, parts } : { parts }
  });
  return response.data;
};

/** The caller's own recordings that are still missing parts. */
export const getIncompleteRecordings = async (
  token: string
): Promise<RecordingResponse[]> =>
  authorizedGet<RecordingResponse[]>('/recordings/incomplete', token);

/** Soft-deleted recordings. Requires `recordings.moderate`. */
export const getDeletedRecordings = async (
  token: string
): Promise<RecordingResponse[]> =>
  authorizedGet<RecordingResponse[]>('/recordings/deleted', token);

export const patchRecording = async (
  token: string,
  id: Numeric,
  update: UpdateRecordingRequest
): Promise<void> => authorizedPatch(`/recordings/${id}`, token, update);

/** Soft delete by default; `final` erases the recording for good. */
export const deleteRecording = async (
  token: string,
  id: Numeric,
  final = false
): Promise<void> =>
  authorizedDelete(`/recordings/${id}?final=${final}`, token);

/** A part's audio. Requires ownership, or `recordings.download` for others'. */
export const getRecordingPartSound = async (
  token: string,
  partId: Numeric,
  signal?: AbortSignal
): Promise<{ data: ArrayBuffer; contentType: string }> => {
  const response = await axios.get<ArrayBuffer>(
    `/recordings/part/${partId}/sound`,
    {
      headers: { Authorization: `Bearer ${token}` },
      responseType: 'arraybuffer',
      signal
    }
  );
  return {
    data: response.data,
    contentType:
      typeof response.headers['content-type'] === 'string'
        ? response.headers['content-type']
        : 'audio/wav'
  };
};

export const getFilteredRecordings = async (options?: {
  recordingId?: Numeric;
  /** Only the parts whose dialect a reviewer has confirmed. */
  verified?: boolean;
}): Promise<FilteredPartModel[]> => {
  const response = await axios.get<FilteredPartModel[]>('/recordings/filtered', {
    params: {
      ...(options?.recordingId !== undefined
        ? { recordingId: options.recordingId }
        : {}),
      verified: options?.verified ?? false
    }
  });
  return response.data;
};

export const getFilteredPart = async (
  id: Numeric
): Promise<FilteredPartModel> => {
  const response = await axios.get<FilteredPartModel>(
    `/recordings/filtered/${id}`
  );
  return response.data;
};

export const postFilteredPart = async (
  token: string,
  filteredPart: FilteredPartUploadRequest
): Promise<number> =>
  authorizedPost<number, FilteredPartUploadRequest>(
    '/recordings/filtered',
    token,
    filteredPart
  );

/** Requires `filtered.review`. */
export const patchFilteredPart = async (
  token: string,
  id: Numeric,
  update: FilteredPartUpdateRequest
): Promise<void> =>
  authorizedPatch(`/recordings/filtered/${id}`, token, update);

/** Requires `filtered.review`. */
export const deleteFilteredPart = async (
  token: string,
  id: Numeric
): Promise<void> => authorizedDelete(`/recordings/filtered/${id}`, token);

/**
 * Confirms a dialect for a stretch of a recording, creating the filtered part
 * and its detected dialect in one call. Requires `filtered.review`.
 */
export const postConfirmedDialect = async (
  token: string,
  request: PostConfirmedDialectRequest
): Promise<number> =>
  authorizedPost<number, PostConfirmedDialectRequest>(
    '/recordings/filtered/post-confirmed-dialect',
    token,
    request
  );

/** Requires `filtered.review`. */
export const updateConfirmedDialect = async (
  token: string,
  request: UpdateConfirmedDialectRequest
): Promise<void> =>
  authorizedPatch(
    '/recordings/filtered/update-confirmed-dialect',
    token,
    request
  );

export const getDialects = async (
  apiUrl = projectStore.current?.apiUrl
): Promise<DialectDefinition[]> => {
  const response = await axios.get<DialectDefinition[]>(
    `${apiUrl}/recordings/dialects`
  );
  return response.data;
};

export const getDialectColors = async (
  apiUrl = projectStore.current?.apiUrl
): Promise<Record<string, string>> => {
  const dialects = await getDialects(apiUrl);
  return dialects.reduce<Record<string, string>>((acc, dialect) => {
    acc[dialect.dialectCode] = dialect.color;
    return acc;
  }, {});
};

export const getDetectedDialects = async (): Promise<DetectedDialect[]> => {
  const response = await axios.get<DetectedDialect[]>(
    '/recordings/filtered/detected'
  );
  return response.data;
};

export const getDetectedDialect = async (
  id: Numeric
): Promise<DetectedDialect> => {
  const response = await axios.get<DetectedDialect>(
    `/recordings/filtered/detected/${id}`
  );
  return response.data;
};

/** Requires `filtered.review`. */
export const updateDetectedDialect = async (
  token: string,
  payload: UpdateDetectedDialectRequest
): Promise<void> =>
  authorizedPatch('/recordings/filtered/detected', token, payload);

/** Requires `filtered.review`. */
export const postDetectedDialect = async (
  token: string,
  payload: DetectedDialectUploadRequest
): Promise<number> =>
  authorizedPost<number, DetectedDialectUploadRequest>(
    '/recordings/filtered/detected',
    token,
    payload
  );

/** Requires `filtered.review`. */
export const deleteDetectedDialect = async (
  token: string,
  id: Numeric
): Promise<void> =>
  authorizedDelete(`/recordings/filtered/detected/${id}`, token);

export const getRecordingMapClusters = async (
  query: RecordingMapClustersQuery,
  signal?: AbortSignal
): Promise<RecordingMapClustersResult> => {
  const response = await axios.get<RecordingMapClustersResult>(
    '/recordings/map-clusters',
    { params: query, signal }
  );
  return response.data;
};

/** Pages a cluster's members beyond the five-item preview. */
export const getRecordingMapClusterItems = async (
  clusterId: string,
  cursor: string,
  pageSize = 50,
  signal?: AbortSignal
): Promise<RecordingMapClusterItemsPage> => {
  const response = await axios.get<RecordingMapClusterItemsPage>(
    `/recordings/map-clusters/${encodeURIComponent(clusterId)}/items`,
    { params: { cursor, pageSize }, signal }
  );
  return response.data;
};

export type { RecordingPhoto };
