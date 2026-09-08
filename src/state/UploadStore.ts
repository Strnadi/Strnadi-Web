import { reactive } from 'vue';
import {
  type RecordingUploadReq,
  type RecordingPartUploadParams,
  postRecording,
  postFilteredPart,
  updateDetectedDialect,
  postDetectedDialect,
  getFilteredRecording
} from '@/api/recordings';
import type { DraftFilteredPart } from '@/state/UploadDraftStore';
import { getAudioDuration } from '@/utils/audio';

export interface UploadTask {
  id: string;
  recording: RecordingUploadReq;
  parts: RecordingPartUploadParams[];
  photos?: File[];
  token: string;
  status: 'queued' | 'uploading' | 'completed' | 'error';
  progress: number; // 0-100
  currentStep: string;
  error?: string;
  draftFilteredParts?: DraftFilteredPart[];
}

export const uploadQueueStore = reactive({
  tasks: [] as UploadTask[],
  isProcessing: false,

  addTask(
    recording: RecordingUploadReq,
    parts: RecordingPartUploadParams[],
    photos: File[] | undefined,
    token: string,
    draftFilteredParts?: DraftFilteredPart[]
  ): string {
    const taskId = `upload-${Date.now()}-${Math.random()}`;

    this.tasks.push({
      id: taskId,
      recording,
      parts,
      photos,
      token,
      draftFilteredParts,
      status: 'queued',
      progress: 0,
      currentStep: 'V pořadí'
    });

    // Start processing if not already running
    if (!this.isProcessing) {
      this.processQueue();
    }

    return taskId;
  },

  async processQueue() {
    if (this.isProcessing) return;

    this.isProcessing = true;

    while (this.tasks.length > 0) {
      const task = this.tasks.find((t) => t.status === 'queued');
      if (!task) break;

      task.status = 'uploading';

      try {
        await this.uploadTask(task);
        task.status = 'completed';
        task.progress = 100;
        task.currentStep = 'Dokončeno';

        // Remove completed task after 3 seconds
        setTimeout(() => {
          this.removeTask(task.id);
        }, 3000);
      } catch (error) {
        task.status = 'error';
        task.error = error instanceof Error ? error.message : 'Neznámá chyba';
        task.currentStep = 'Chyba';
      }
    }

    this.isProcessing = false;
  },

  async uploadTask(task: UploadTask) {
    let cursor = new Date(task.recording.createdAt);
    if (Number.isNaN(cursor.getTime())) {
      throw new Error('Neplatné datum nahrávky');
    }

    const modifiedParts: RecordingPartUploadParams[] = [];
    for (const part of task.parts) {
      const duration = await getAudioDuration(part.data);
      const startDate = cursor.toISOString();
      cursor = new Date(cursor.getTime() + duration * 1000);
      modifiedParts.push({
        ...part,
        startDate,
        endDate: cursor.toISOString()
      });
    }

    const recordingId = await postRecording(
      task.token,
      task.recording,
      modifiedParts,
      task.photos,
      (completed, total, step) => {
        // Reserve the last 10% for optional dialect finalization.
        task.progress = Math.min(90, Math.round((completed / total) * 90));
        task.currentStep = step;
      }
    );

    if (task.draftFilteredParts?.length) {
      task.currentStep = 'Ukládání dialektů';
      await this.uploadDraftDialects(task, recordingId);
    }
    task.progress = 99;
  },

  async uploadDraftDialects(task: UploadTask, recordingId: number) {
    for (const draft of task.draftFilteredParts ?? []) {
      if (!draft.dialectCode) continue;
      await postFilteredPart(task.token, {
        recordingId,
        startDate: draft.startDate,
        endDate: draft.endDate,
        dialectCode: draft.dialectCode
      });
    }

    const serverParts = await getFilteredRecording(recordingId);

    const findMatchingPart = (draft: DraftFilteredPart) => {
      const targetStart = Date.parse(draft.startDate);
      const targetEnd = Date.parse(draft.endDate);
      return serverParts.find((part) => {
        const startDiff = Math.abs(Date.parse(part.startDate) - targetStart);
        const endDiff = Math.abs(Date.parse(part.endDate) - targetEnd);
        return startDiff < 1000 && endDiff < 1000;
      });
    };

    for (const draft of task.draftFilteredParts ?? []) {
      const serverPart = findMatchingPart(draft);
      if (!serverPart) continue;

      const draftDetections = draft.detectedDialects ?? [];
      const existingDetections = serverPart.detectedDialects ?? [];
      for (const [index, source] of draftDetections.entries()) {
        const target = existingDetections[index];
        if (target) {
          await updateDetectedDialect(task.token, {
            id: target.id,
            userGuessDialectId:
              source.userGuessDialectId ?? target.userGuessDialectId ?? null,
            predictedDialectId:
              source.predictedDialectId ?? target.predictedDialectId ?? null,
            confirmedDialectId:
              source.confirmedDialectId ?? target.confirmedDialectId ?? null
          });
        } else {
          await postDetectedDialect(task.token, {
            filteredPartId: serverPart.id,
            userGuessDialectId: source.userGuessDialectId ?? null,
            predictedDialectId: source.predictedDialectId ?? null,
            confirmedDialectId: source.confirmedDialectId ?? null
          });
        }
      }
    }
  },

  removeTask(taskId: string) {
    const index = this.tasks.findIndex((t) => t.id === taskId);
    if (index !== -1) {
      this.tasks.splice(index, 1);
    }
  },

  getActiveTasks() {
    return this.tasks.filter(
      (t) => t.status === 'queued' || t.status === 'uploading'
    );
  },

  getTotalProgress() {
    const activeTasks = this.getActiveTasks();
    if (activeTasks.length === 0) return 0;

    const totalProgress = activeTasks.reduce(
      (sum, task) => sum + task.progress,
      0
    );
    return totalProgress / activeTasks.length;
  }
});
