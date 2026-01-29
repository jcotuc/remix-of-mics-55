export interface AppSchemasRolRolSchema {
  id: number;
  nombre: string;
  slug: string;
}

export interface AuthenticatedUser {
  id: number;
  email: string;
  nombre: string;
  roles: AppSchemasRolRolSchema[];
}
