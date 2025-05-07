import { fileToBase64NoPrefix } from "@/utils/base64";
import { genericGet, authorizedPost, authorizedPatch, authorizedDelete } from "./utils";

export interface ArticleFile {
  id: number;
  articleId: number;
  filename: string | null;
};

export interface Article {
  id?: number;
  name: string;
  description: string;
  files?: ArticleFile[];
};

export interface ArticleCategory {
  label: string;
  name: string;
  articles?: Article[] | null;
};

export const getArticle  = async (id: number) => genericGet<Article>(`/articles/${id}`);
export const getArticles = async () => genericGet<Article[]>("/articles");

export const getArticleCategories = async () => genericGet<ArticleCategory[]>("/articles/categories");
export const getArticleByCategory = async (category: string) =>
  genericGet<Article[]>(`/articles/category/${category}`);

export const postArticle = async (token: string, article: Article) =>
  authorizedPost<string, Article>("/articles", token, article);

export const patchArticle = async (token: string, articleID: string, updatedArticle: Partial<Article>) =>
  authorizedPatch<string, Partial<Article>>(`/articles/${articleID}`, token, updatedArticle);

export const deleteArticle = async (token: string, articleID: string) =>
  authorizedDelete(`/articles/${articleID}`, token);


export const getArticleFile = async (id: number, filename: string) =>
  genericGet<any>(`/articles/${id}/${filename}`);

export const postArticleFile = async (token: string, articleID: string, file: File) =>
  authorizedPost(`/articles/${articleID}/${file.name}`, token, `"${await fileToBase64NoPrefix(file)}"`, {
    headers: {
      "Content-Type": "application/json"
    }
  });

export const patchArticleFile = async (token: string, articleID: string, filename: string) =>
  authorizedPatch(`/article/${articleID}/${filename}`, token)

export const deleteArticleFile = async (token: string, articleID: string, filename: string) =>
  authorizedDelete(`/article/${articleID}/${filename}`, token)

export const postArticleCategory = async (token: string, category: Partial<ArticleCategory>) =>
  authorizedPost<string, Partial<ArticleCategory>>("/articles/categories", token, category);

export const patchArticleCategory = async (token: string, categoryName: string, updatedCategory: Partial<ArticleCategory>) =>
  authorizedPatch<string, Partial<ArticleCategory>>(`/articles/categories/${categoryName}`, token, updatedCategory);

export const deleteArticleCategory = async (token: string, categoryName: string) =>
  authorizedDelete(`/articles/${categoryName}`, token);

export const deleteArticleFromCategory = async (token: string, categoryName: string, articleID: string) =>
  authorizedDelete(`/articles/${categoryName}/${articleID}`, token);
