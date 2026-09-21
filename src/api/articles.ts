import axios from 'axios';
import { fileToBase64NoPrefix } from '@/utils/base64';
import {
  genericGet,
  authorizedPost,
  authorizedPatch,
  authorizedDelete
} from './utils';
import { type Numeric } from '@/types/basic';

/** Tenant `ArticleAttachment`. */
export interface ArticleAttachment {
  id: number;
  articleId: number | null;
  fileName: string;
}

/** Tenant `ArticleTranslation`. */
export interface ArticleTranslation {
  id: number;
  articleId: number;
  languageCode: string;
  nameValue: string;
  descriptionValue: string;
}

/** Tenant `ArticleCategoryTranslation`. */
export interface ArticleCategoryTranslation {
  id: number;
  articleCategoryId: number;
  languageCode: string;
  nameValue: string;
  descriptionValue: string;
}

/** Tenant `Article`. Navigation collections come back empty unless included. */
export interface Article {
  id: number;
  name: string;
  description: string | null;
  articleAttachments?: ArticleAttachment[];
  articleTranslations?: ArticleTranslation[];
}

/** Tenant `ArticleSummaryResponse`. */
export interface ArticleSummary {
  id: number;
  name: string;
  description: string | null;
}

/** Tenant `ArticleCategoryResponse`. */
export interface ArticleCategory {
  id: number;
  label: string | null;
  name: string;
  order: number | null;
  /** Null unless the listing was asked to include articles. */
  articles: ArticleSummary[] | null;
}

export interface ArticleUploadRequest {
  name: string;
  description: string;
}

export interface ArticleUpdateRequest {
  name?: string | null;
  description?: string | null;
}

export interface ArticleCategoryUploadRequest {
  label: string;
  name: string;
}

export interface TranslationUpdateRequest {
  languageCode?: string | null;
  nameValue?: string | null;
  descriptionValue?: string | null;
}

export interface AssignArticleToCategoryRequest {
  articleId: number;
  order: number;
}

export const getArticle = async (id: Numeric) =>
  genericGet<Article>(`/articles/${id}`);

export const getArticles = async () => genericGet<Article[]>('/articles');

/** Categories, optionally with the articles assigned to each, in order. */
export const getArticleCategories = async (includeArticles = false) =>
  genericGet<ArticleCategory[]>(
    `/articles/categories?articles=${includeArticles}`
  );

export const getArticleByCategory = async (category: string) =>
  genericGet<Article[]>(`/articles/${encodeURIComponent(category)}`);

/** Requires `articles.manage`. Returns the new article's id. */
export const postArticle = async (
  token: string,
  article: ArticleUploadRequest
) =>
  authorizedPost<number, ArticleUploadRequest>('/articles', token, article);

export const patchArticle = async (
  token: string,
  articleID: Numeric,
  updatedArticle: ArticleUpdateRequest
) =>
  authorizedPatch<void, ArticleUpdateRequest>(
    `/articles/${articleID}`,
    token,
    updatedArticle
  );

export const deleteArticle = async (token: string, articleID: Numeric) =>
  authorizedDelete<void>(`/articles/${articleID}`, token);

/** Attachment bytes. Markdown bodies are stored as `<language>.md` attachments. */
export const getArticleFile = async (id: Numeric, filename: string) =>
  genericGet<string>(`/articles/${id}/${encodeURIComponent(filename)}`);

export const getArticleFileBytes = async (
  id: Numeric,
  filename: string
): Promise<ArrayBuffer> => {
  const response = await axios.get<ArrayBuffer>(
    `/articles/${id}/${encodeURIComponent(filename)}`,
    { responseType: 'arraybuffer' }
  );
  return response.data;
};

/** The API takes a bare JSON string holding the base64 payload. */
const base64Body = async (file: File) =>
  JSON.stringify(await fileToBase64NoPrefix(file));

export const postArticleFile = async (
  token: string,
  articleID: Numeric,
  file: File
) =>
  authorizedPost<void, string>(
    `/articles/${articleID}/${encodeURIComponent(file.name)}`,
    token,
    await base64Body(file),
    { headers: { 'Content-Type': 'application/json' } }
  );

export const patchArticleFile = async (
  token: string,
  articleID: Numeric,
  filename: string,
  file: File
) =>
  authorizedPatch<void, string>(
    `/articles/${articleID}/${encodeURIComponent(filename)}`,
    token,
    await base64Body(file),
    { 'Content-Type': 'application/json' }
  );

export const deleteArticleFile = async (
  token: string,
  articleID: Numeric,
  filename: string
) =>
  authorizedDelete<void>(
    `/articles/${articleID}/${encodeURIComponent(filename)}`,
    token
  );

/** Requires `articles.categories.manage`. Returns the new category's id. */
export const postArticleCategory = async (
  token: string,
  category: ArticleCategoryUploadRequest
) =>
  authorizedPost<number, ArticleCategoryUploadRequest>(
    '/articles/categories',
    token,
    category
  );

export const deleteArticleCategory = async (
  token: string,
  categoryName: string
) =>
  authorizedDelete<void>(
    `/articles/categories/${encodeURIComponent(categoryName)}`,
    token
  );

export const patchAssignArticleCategory = async (
  token: string,
  categoryName: string,
  assignment: AssignArticleToCategoryRequest
) =>
  authorizedPatch<void, AssignArticleToCategoryRequest>(
    `/articles/${encodeURIComponent(categoryName)}`,
    token,
    assignment
  );

export const deleteArticleFromCategory = async (
  token: string,
  categoryName: string,
  articleID: Numeric
) =>
  authorizedDelete<void>(
    `/articles/${encodeURIComponent(categoryName)}/${articleID}`,
    token
  );

// Translations. All mutations require `articles.translations.manage`.

export const getArticleTranslation = async (id: Numeric) =>
  genericGet<ArticleTranslation>(`/articles/translations/${id}`);

export const patchArticleTranslation = async (
  token: string,
  id: Numeric,
  update: TranslationUpdateRequest
) =>
  authorizedPatch<void, TranslationUpdateRequest>(
    `/articles/translations/${id}`,
    token,
    update
  );

export const deleteArticleTranslation = async (token: string, id: Numeric) =>
  authorizedDelete<void>(`/articles/translations/${id}`, token);

export const getArticleCategoryTranslation = async (id: Numeric) =>
  genericGet<ArticleCategoryTranslation>(
    `/articles/categories/translations/${id}`
  );

export const patchArticleCategoryTranslation = async (
  token: string,
  id: Numeric,
  update: TranslationUpdateRequest
) =>
  authorizedPatch<void, TranslationUpdateRequest>(
    `/articles/categories/translations/${id}`,
    token,
    update
  );

export const deleteArticleCategoryTranslation = async (
  token: string,
  id: Numeric
) =>
  authorizedDelete<void>(`/articles/categories/translations/${id}`, token);
