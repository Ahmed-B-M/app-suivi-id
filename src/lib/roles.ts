
export type Role = 'admin' | 'RD' | 'Dispatch' | 'RH' | 'Qualité' | 'viewer';

export const ALL_PAGES = [
  "/",
  "/summary",
  "/forecast",
  "/notifications",
  "/messaging",
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
  "/user-management",
  "/settings",
];

export const ROLE_PERMISSIONS: Record<Role, string[]> = {
  admin: ALL_PAGES,
  RD: [
    "/",
    "/summary",
    "/forecast",
    "/notifications",
    "/messaging",
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
    "/notifications",
    "/messaging",
    "/quality",
    "/settings",
  ],
  RH: [
    "/forecast",
    "/billing",
    "/assignment",
    "/messaging",
    "/user-management"
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
    "/notifications",
    "/messaging",
  ],
  viewer: ["/", "/notifications", "/messaging"]
};

export function hasAccess(role: Role, path: string): boolean {
  if (role === 'admin') {
    return true;
  }
   if (path === '/dashboard') return true; 
  // Allow access to dynamic task pages for roles that can see details
  if (path.startsWith('/task/')) {
      return ROLE_PERMISSIONS[role]?.includes('/details');
  }
  return ROLE_PERMISSIONS[role]?.includes(path) ?? false;
}
