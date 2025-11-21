import { reactive } from 'vue';
import {
  type RecordingUploadReq,
  type RecordingPartUploadParams,
  postRecording
} from '@/api/recordings';
import { postPhoto } from '@/api/photos';
import axios from 'axios';
// import { useQueryClient } from '@tanstack/vue-query';

// const queryClient = useQueryClient();

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
}

export const uploadQueueStore = reactive({
  tasks: [] as UploadTask[],
  isProcessing: false,

  addTask(
    recording: RecordingUploadReq,
    parts: RecordingPartUploadParams[],
    photos: File[] | undefined,
    token: string
  ): string {
    const taskId = `upload-${Date.now()}-${Math.random()}`;

    this.tasks.push({
      id: taskId,
      recording,
      parts,
      photos,
      token,
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
    const totalSteps = 1 + task.parts.length + (task.photos?.length || 0);
    let completedSteps = 0;

    const updateProgress = () => {
      task.progress = Math.round((completedSteps / totalSteps) * 100);
    };

    // Helper function to get audio duration
    const getAudioDuration = (file: File): Promise<number> => {
      return new Promise((resolve, reject) => {
        const audio = new Audio();
        audio.preload = 'metadata';

        audio.onloadedmetadata = () => {
          URL.revokeObjectURL(audio.src);
          resolve(audio.duration);
        };

        audio.onerror = () => {
          URL.revokeObjectURL(audio.src);
          reject(new Error('Failed to load audio metadata'));
        };

        audio.src = URL.createObjectURL(file);
      });
    };

    let lastEndDate: Date | undefined;
    const modifiedParts = await Promise.all(
      task.parts.map(async (part) => {
        // Calculate end date based on audio duration
        let endDate = part.endDate;
        try {
          const duration = await getAudioDuration(part.data);
          const startDate = new Date(
            new Date(part.startDate).getTime() + (lastEndDate?.getTime() ?? 0)
          ).toISOString();
          const calculatedEndDate = new Date(
            new Date(startDate).getTime() + duration * 1000
          );
          endDate = calculatedEndDate.toISOString();
          lastEndDate = calculatedEndDate;
        } catch (error) {
          console.warn(
            'Failed to get audio duration, using original endDate',
            error
          );
        }

        return {
          ...part,
          endDate: endDate
        };
      })
    );

    await postRecording(task.token, task.recording, modifiedParts, task.photos);
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
