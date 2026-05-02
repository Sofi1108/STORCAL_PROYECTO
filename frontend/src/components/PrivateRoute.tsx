import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useUser } from "../context/UserContext";

interface Props {
  children: ReactNode;
  roles?: string[];
}

export default function PrivateRoute({ children, roles }: Props) {
  const { customer, loading } = useUser();

  // Si aún se está verificando la sesión, no redirigir
  if (loading) {
    return null;
  }

  // Si no hay usuario autenticado, redirigir a login
  if (!customer) {
    return <Navigate to="/login" replace />;
  }

  // Si se especificaron roles, verificar que el usuario tenga uno de ellos
  if (roles && !roles.includes(customer.role)) {
    return <Navigate to="/" replace />;
  }

  // Si todo va bien, renderizar el contenido
  return <>{children}</>;
}
