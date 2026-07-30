export type UserRole = 'admin' | 'user';

export interface RolePermissions {
  manageMetaKeys: boolean;
  manageAiSettings: boolean;
  manageWorkspace: boolean;
  manageBilling: boolean;
  manageTeam: boolean;
  deleteFlows: boolean;
  publishFlows: boolean;
  accessInbox: boolean;
  takeoverConversations: boolean;
  accessAdminPanel: boolean;
}

export function parseRole(roleString?: string | null, email?: string | null): UserRole {
  const normEmail = email?.toLowerCase().trim();

  // Admin principal incondicional
  if (normEmail === 'admin@nexachat.com') return 'admin';

  if (!roleString) return 'user';

  const normalized = roleString.toLowerCase().trim();
  if (normalized === 'administrador' || normalized === 'admin' || normalized.includes('admin')) {
    return 'admin';
  }

  return 'user';
}

export function getRolePermissions(role: UserRole): RolePermissions {
  if (role === 'admin') {
    return {
      manageMetaKeys: true,
      manageAiSettings: true,
      manageWorkspace: true,
      manageBilling: true,
      manageTeam: true,
      deleteFlows: true,
      publishFlows: true,
      accessInbox: true,
      takeoverConversations: true,
      accessAdminPanel: true
    };
  }

  // Usuário padrão
  return {
    manageMetaKeys: false,
    manageAiSettings: false,
    manageWorkspace: false,
    manageBilling: false,
    manageTeam: false,
    deleteFlows: false,
    publishFlows: true,
    accessInbox: true,
    takeoverConversations: true,
    accessAdminPanel: false
  };
}
