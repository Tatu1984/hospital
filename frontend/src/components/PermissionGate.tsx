import React from 'react';
import { useAuth } from '../contexts/AuthContext';

interface PermissionGateProps {
  children: React.ReactNode;
  permission?: string;
  permissions?: string[];
  requireAll?: boolean; // If true, requires ALL permissions; if false, requires ANY
  fallback?: React.ReactNode;
  hideOnDenied?: boolean; // If true, hides children; if false, shows fallback
}

/**
 * PermissionGate - Conditionally renders children based on user permissions
 *
 * Usage:
 * <PermissionGate permission="patients:create">
 *   <Button>Add Patient</Button>
 * </PermissionGate>
 *
 * <PermissionGate permissions={['billing:create', 'billing:edit']} requireAll={false}>
 *   <Button>Manage Billing</Button>
 * </PermissionGate>
 */
export const PermissionGate: React.FC<PermissionGateProps> = ({
  children,
  permission,
  permissions = [],
  requireAll = false,
  fallback = null,
  hideOnDenied = true,
}) => {
  const { hasPermission, user } = useAuth();

  // Admin always has access
  if (user?.roleIds?.includes('ADMIN')) {
    return <>{children}</>;
  }

  // Build list of permissions to check
  const permissionsToCheck = permission ? [permission] : permissions;

  if (permissionsToCheck.length === 0) {
    return <>{children}</>;
  }

  // Check permissions
  let hasAccess: boolean;
  if (requireAll) {
    hasAccess = permissionsToCheck.every((p) => hasPermission(p));
  } else {
    hasAccess = permissionsToCheck.some((p) => hasPermission(p));
  }

  if (hasAccess) {
    return <>{children}</>;
  }

  if (hideOnDenied) {
    return null;
  }

  return <>{fallback}</>;
};

/**
 * Hook to check if user can perform an action
 */
export const usePermission = (permission: string): boolean => {
  const { hasPermission, user } = useAuth();

  if (user?.roleIds?.includes('ADMIN')) {
    return true;
  }

  return hasPermission(permission);
};

/**
 * Hook to check multiple permissions
 */
export const usePermissions = (permissions: string[], requireAll = false): boolean => {
  const { hasPermission, user } = useAuth();

  if (user?.roleIds?.includes('ADMIN')) {
    return true;
  }

  if (requireAll) {
    return permissions.every((p) => hasPermission(p));
  }

  return permissions.some((p) => hasPermission(p));
};

/**
 * Higher-order component for permission-based rendering
 */
export function withPermission<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  permission: string
): React.FC<P> {
  return function WithPermissionComponent(props: P) {
    const { hasPermission, user } = useAuth();

    if (user?.roleIds?.includes('ADMIN') || hasPermission(permission)) {
      return <WrappedComponent {...props} />;
    }

    return null;
  };
}

/**
 * Permission-aware button component
 */
interface PermissionButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  permission: string;
  children: React.ReactNode;
}

export const PermissionButton: React.FC<PermissionButtonProps> = ({
  permission,
  children,
  disabled,
  ...props
}) => {
  const canAccess = usePermission(permission);

  if (!canAccess) {
    return null;
  }

  return (
    <button disabled={disabled} {...props}>
      {children}
    </button>
  );
};

export default PermissionGate;
