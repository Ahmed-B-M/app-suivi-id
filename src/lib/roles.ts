
export type Role = 'admin' | 'RD' | 'Dispatch' | 'RH' | 'Qualité' | 'viewer';

export const ALL_PAGES = [
  "/",
  "/summary",
  "/forecast",
  "/notifications",
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
    "/notifications",
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
    "/notifications",
  ],
  viewer: ["/", "/notifications"]
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
