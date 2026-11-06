import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform } from 'react-native';
import { common } from '../../styles/common';

/** Keeps inputs above the keyboard; Android already resizes the window on its own. */
export default function KeyboardAvoid({ children }: { children: ReactNode }) {
  return (
    <KeyboardAvoidingView style={common.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {children}
    </KeyboardAvoidingView>
  );
}
