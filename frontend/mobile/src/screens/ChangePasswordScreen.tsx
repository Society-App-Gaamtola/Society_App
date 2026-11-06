import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import * as authApi from '../api/auth';
import { common } from '../styles/common';
import { useFormErrors } from '../hooks/useFormErrors';
import { showToast } from '../utils/toast';
import { MIN_PASSWORD_LENGTH } from '../utils/validation';
import { AppHeader, FormField, InputField, KeyboardAvoid, PrimaryButton } from '../components';

type Field = 'current' | 'next' | 'confirm';

const API_FIELDS: Record<string, Field> = { old_password: 'current', new_password: 'next', confirm_password: 'confirm' };

export default function ChangePasswordScreen() {
  const navigation = useNavigation();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [saving, setSaving] = useState(false);
  const { errors, setErrors, fieldProps, handleApiError } = useFormErrors<Field>();

  const onSave = async () => {
    const found: typeof errors = {};
    if (!current) found.current = 'Please enter your current password.';
    if (next.length < MIN_PASSWORD_LENGTH) found.next = `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
    else if (next === current) found.next = 'New password must be different from the current one.';
    if (confirm !== next) found.confirm = 'Passwords do not match.';
    setErrors(found);
    if (Object.keys(found).length) return;

    setSaving(true);
    try {
      const { message } = await authApi.changePassword({ old_password: current, new_password: next, confirm_password: confirm });
      showToast(message);
      navigation.goBack();
    } catch (error) {
      handleApiError(error, API_FIELDS, 'Could not change password');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={common.screen}>
      <AppHeader leftType="back" rightIcons={[]} />
      <KeyboardAvoid>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <Text style={common.heading}>Change Password</Text>
          <Text style={[common.subtext, styles.subtext]}>Other devices will be logged out after you change it.</Text>

          <FormField label="Current Password" error={errors.current}>
            <InputField
              icon="lock-closed-outline"
              placeholder="Enter your current password"
              secureTextEntry
              autoCapitalize="none"
              value={current}
              {...fieldProps('current', setCurrent)}
            />
          </FormField>

          <FormField label="New Password" error={errors.next}>
            <InputField
              icon="lock-closed-outline"
              placeholder="Create a new password"
              secureTextEntry
              autoCapitalize="none"
              maxLength={64}
              value={next}
              {...fieldProps('next', setNext)}
            />
          </FormField>

          <FormField label="Confirm New Password" error={errors.confirm}>
            <InputField
              icon="lock-closed-outline"
              placeholder="Enter the new password again"
              secureTextEntry
              autoCapitalize="none"
              maxLength={64}
              value={confirm}
              {...fieldProps('confirm', setConfirm)}
            />
          </FormField>

          <PrimaryButton title="Change Password" onPress={onSave} loading={saving} style={styles.button} />
        </ScrollView>
      </KeyboardAvoid>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: 16, paddingBottom: 32 },
  subtext: { marginBottom: 16 },
  button: { marginTop: 4 },
});
