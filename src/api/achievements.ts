import axios from 'axios';
import { authorizedPost } from '@/api/utils';

/** Tenant `AchievementContentResponse` - one localisation of an achievement. */
export interface AchievementContent {
  title: string;
  description: string;
  languageCode: string;
}

/** Tenant `AchievementResponse`. */
export interface Achievement {
  id: number;
  /** Absolute URL of the badge PNG, served by GET /achievements/{id}/photo. */
  imageUrl: string;
  contents: AchievementContent[];
}

export interface AchievementPayload {
  /** SQL rule deciding who earns the badge; evaluated server-side. */
  sql: string;
  contents: AchievementContent[];
  file: File;
}

/**
 * Every achievement, or - when a user id is given - the ones that user has
 * earned. The scoped call also awards any they have newly qualified for.
 */
export const getAchievements = async (
  userId?: string
): Promise<Achievement[]> => {
  const response = await axios.get<Achievement[]>('/achievements', {
    params: userId ? { userId } : undefined
  });
  return response.data;
};

/** Requires the `achievements.manage` permission. Returns the new id. */
export const createAchievement = async (
  token: string,
  payload: AchievementPayload
): Promise<number> => {
  const formData = new FormData();
  formData.append('sql', payload.sql);
  formData.append('contents', JSON.stringify(payload.contents));
  formData.append('file', payload.file);

  return authorizedPost<number, FormData>('/achievements', token, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
};
