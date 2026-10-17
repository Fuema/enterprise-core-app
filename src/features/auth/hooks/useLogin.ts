import { useMutation } from '@tanstack/react-query';
import { login, logout } from '../services/authService';

export function useLogin() {
  return useMutation({ mutationFn: login });
}

export function useLogout() {
  return useMutation({ mutationFn: logout });
}
