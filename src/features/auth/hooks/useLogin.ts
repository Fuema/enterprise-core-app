import { useMutation } from '@tanstack/react-query';
import { changePassword, login, logout, register } from '../services/authService';

export function useLogin() {
  return useMutation({ mutationFn: login });
}

export function useSignup() {
  return useMutation({ mutationFn: register });
}

export function useChangePassword() {
  return useMutation({ mutationFn: changePassword });
}

export function useLogout() {
  return useMutation({ mutationFn: logout });
}
