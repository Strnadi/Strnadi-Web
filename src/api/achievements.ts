import axios from 'axios';
import { authorizedPatch, authorizedPost } from '@/api/utils';

export interface AchievementContent {
  id: number;
  title: string;
  description: string;
  languageCode: string;
  achievementId: number;
}

export interface Achievement {
  id: number;
  sql: string;
  imageUrl?: string | null;
  contents: AchievementContent[];
}

export interface AchievementContentPayload {
  languageCode: string;
  title: string;
  description: string;
}

export interface AchievementPayload {
  sql: string;
  contents: AchievementContentPayload[];
  file?: File | null;
}

export const getAchievements = async (): Promise<Achievement[]> => {
  const response = await axios.get('/achievements');
  return response.data as Achievement[];
};

export const createAchievement = async (
  token: string,
  payload: AchievementPayload
): Promise<void> => {
  if (!payload.file) {
    throw new Error('Badge image is required when creating an achievement.');
  }
  const formData = new FormData();
  formData.append('sql', payload.sql);
  formData.append('contents', JSON.stringify(payload.contents));
  formData.append('file', payload.file);

  await authorizedPost<void, FormData>('/achievements', token, formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  });
};

export const updateAchievement = async (
  token: string,
  achievementId: number,
  payload: AchievementPayload
): Promise<void> => {
  const formData = new FormData();
  formData.append('sql', payload.sql);
  formData.append('contents', JSON.stringify(payload.contents));
  if (payload.file) {
    formData.append('file', payload.file);
  }

  await authorizedPatch<void, FormData>(
    `/achievements/${achievementId}`,
    token,
    formData,
    {
      'Content-Type': 'multipart/form-data'
    }
  );
};
