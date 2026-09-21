/**
 * Mirrors Platform.Shared.Kernel.Authorization.Permissions.
 *
 * The project-scoped access token carries one `permission` claim per granted
 * permission, so the UI gates on these exactly the way the API's
 * [RequirePermission] attributes do. There is no "admin role" any more.
 */
export const Permissions = {
  ViewProjects: 'projects.view',
  ManageProjects: 'projects.manage',

  ViewUsersBasic: 'users.view.basic',
  ViewUsersConfidential: 'users.view.confidential',
  ManageUsers: 'users.manage',

  ManageRoles: 'roles.manage',

  ManageDevices: 'devices.manage',

  ManageArticles: 'articles.manage',
  ManageArticleCategories: 'articles.categories.manage',
  ManageArticleTranslations: 'articles.translations.manage',

  ReviewFilteredRecordings: 'filtered.review',

  ModerateRecordings: 'recordings.moderate',
  DeleteRecordings: 'recordings.delete',
  DownloadRecordings: 'recordings.download',

  SendNotifications: 'notifications.send',

  ManageAchievements: 'achievements.manage',

  ManageDocuments: 'documents.manage'
} as const;

export type Permission = (typeof Permissions)[keyof typeof Permissions];

/** Every permission that unlocks at least one screen under /sprava. */
export const ADMINISTRATIVE_PERMISSIONS: Permission[] = [
  Permissions.ViewUsersBasic,
  Permissions.ViewUsersConfidential,
  Permissions.ManageUsers,
  Permissions.ManageRoles,
  Permissions.ManageArticles,
  Permissions.ManageArticleCategories,
  Permissions.ManageArticleTranslations,
  Permissions.ReviewFilteredRecordings,
  Permissions.ModerateRecordings,
  Permissions.DeleteRecordings,
  Permissions.DownloadRecordings,
  Permissions.SendNotifications,
  Permissions.ManageAchievements,
  Permissions.ManageDocuments
];

/**
 * A repeated claim arrives as an array, a single one as a bare string, and an
 * absent one as undefined - normalise all three.
 */
export const readClaimValues = (claim: unknown): string[] => {
  if (typeof claim === 'string') return [claim];
  if (Array.isArray(claim))
    return claim.filter((value): value is string => typeof value === 'string');
  return [];
};
