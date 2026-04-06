export const ROLES = {
  admin: 'admin',
  viewer: 'viewer',
};

const PERMISSIONS = {
  [ROLES.admin]: {
    create_event: true,
    edit_event: true,
    delete_event: true,
    complete_match: true,
  },
  [ROLES.viewer]: {
    create_event: false,
    edit_event: false,
    delete_event: false,
    complete_match: false,
  },
};

export function can(role, action) {
  return Boolean(PERMISSIONS[role]?.[action]);
}
