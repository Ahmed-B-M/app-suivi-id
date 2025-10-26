
export type Role = 'admin' | 'RD' | 'Dispatch' | 'RH' | 'Qualité' | 'viewer';

export const ALL_PAGES = [
  "/",
  "/summary",
  "/forecast",
  "/deviation-analysis",
  "/details",
  "/assignment",
  "/billing",
  "/quality",
  "/driver-feedback",
  "/comment-management",
  "/nps-analysis",
  "/verbatim-treatment",
  "/verbatims",
  "/verbatim-analysis",
  "/settings",
];

export const ROLE_PERMISSIONS: Record<Role, string[]> = {
  admin: ALL_PAGES,
  RD: [
    "/",
    "/summary",
    "/forecast",
    "/deviation-analysis",
    "/assignment",
    "/quality",
    "/driver-feedback",
    "/verbatim-analysis",
    "/settings",
  ],
  Dispatch: [
    "/",
    "/details",
    "/quality",
    "/settings",
  ],
  RH: [
    "/forecast",
    "/billing",
    "/assignment",
  ],
  Qualité: [
    "/",
    "/summary",
    "/deviation-analysis",
    "/quality",
    "/driver-feedback",
    "/comment-management",
    "/nps-analysis",
    "/verbatim-treatment",
    "/verbatim-analysis",
    "/settings",
  ],
  viewer: ["/"]
};

export function hasAccess(role: Role, path: string): boolean {
  if (role === 'admin') {
    return true;
  }
  return ROLE_PERMISSIONS[role]?.includes(path) ?? false;
}
