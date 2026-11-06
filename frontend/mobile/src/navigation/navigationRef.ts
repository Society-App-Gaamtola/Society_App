import { createNavigationContainerRef } from '@react-navigation/native';
import type { AuthUser } from '../types';
import type { RootStackParamList } from './types';

export const navigationRef = createNavigationContainerRef<RootStackParamList>();

export const resetToLogin = () => {
  if (navigationRef.isReady()) navigationRef.reset({ index: 0, routes: [{ name: 'Login' }] });
};

/** The first screen after logging in. Going back can't return to the login screens. */
export const resetAfterLogin = (user: AuthUser) => {
  if (!navigationRef.isReady()) return;
  navigationRef.reset({
    index: 0,
    routes: [user.profileComplete === false ? { name: 'ProfileSetup', params: { name: user.name } } : { name: 'Main' }],
  });
};
