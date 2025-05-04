import { fileToBase64NoPrefix } from "@/utils/base64";
import { genericGet, authorizedPost, authorizedPatch, authorizedDelete } from "./utils";

export interface ArticleCategory {
  label: string
};

export interface Article {

};

export const getArticle  = async (id: number) => genericGet<Article[]>(`/articles/${id}`);
export const getArticles = async () => genericGet<Article[]>("/articles");

export const getArticleCategories = async () => genericGet<Article[]>("/articles/categories");
export const getArticleByCategory = async (category: string) =>
  genericGet<Article[]>(`/articles/category/${category}`);

export const postArticle = async (token: string) => authorizedPost<string>("/articles", token);
export const postArticleFile = async (token: string, articleID: string, file: File) =>
  authorizedPost(`/article/${articleID}/${file.name}`, token, fileToBase64NoPrefix(file))

export const patchArticle = async (token: string, articleID: string, updatedArticle: Partial<Article>) =>
  authorizedPatch<string>(`/articles/${articleID}`, token, updatedArticle);

export const patchArticleFile = async (token: string, articleID: string, filename: string) =>
  authorizedPatch(`/article/${articleID}/${filename}`, token)

export const deleteArticle = async (token: string, articleID: string) =>
  authorizedDelete(`/articles/${articleID}`, token);

export const deleteArticleFile = async (token: string, articleID: string, filename: string) =>
  authorizedDelete(`/article/${articleID}/${filename}`, token)
