import { Alert, Platform, ToastAndroid } from 'react-native';

/** Short native toast on Android; falls back to an alert on iOS. */
export const showToast = (message: string) => {
  if (Platform.OS === 'android') ToastAndroid.show(message, ToastAndroid.SHORT);
  else Alert.alert(message);
};
