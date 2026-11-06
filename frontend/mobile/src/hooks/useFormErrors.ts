import { useCallback, useState } from 'react';
import { Alert } from 'react-native';
import { ApiError } from '../api/client';

/** Shows an API failure in an alert, including any per-field messages. */
export const showApiError = (error: unknown, title = 'Something went wrong') => {
  const fieldMessages = error instanceof ApiError ? Object.values(error.fieldErrors) : [];
  const message = error instanceof Error ? error.message : 'Please try again.';
  Alert.alert(title, fieldMessages.length ? fieldMessages.join('\n') : message);
};

/** Per-field error messages for a form. */
export function useFormErrors<Field extends string>() {
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});

  const clearError = useCallback((field: Field) => {
    setErrors((e) => (e[field] ? { ...e, [field]: undefined } : e));
  }, []);

  const setError = useCallback((field: Field, message: string) => {
    setErrors((e) => ({ ...e, [field]: message }));
  }, []);

  /** Props for an InputField: typing updates the value and clears the field's error. */
  const fieldProps = (field: Field, setValue: (value: string) => void) => ({
    onChangeText: (value: string) => {
      setValue(value);
      clearError(field);
    },
    error: !!errors[field],
  });

  /**
   * Puts the backend's validation messages under their fields; `fieldMap` maps API field
   * names to form fields. Anything that doesn't belong to a field is shown in an alert.
   */
  const handleApiError = (error: unknown, fieldMap: Record<string, Field>, title?: string) => {
    const fieldErrors = error instanceof ApiError ? error.fieldErrors : {};
    const apiFields = Object.keys(fieldErrors);
    if (apiFields.length && apiFields.every((f) => fieldMap[f])) {
      setErrors(Object.fromEntries(apiFields.map((f) => [fieldMap[f], fieldErrors[f]])) as Partial<Record<Field, string>>);
      return;
    }
    showApiError(error, title);
  };

  return { errors, setErrors, clearError, setError, fieldProps, handleApiError };
}
