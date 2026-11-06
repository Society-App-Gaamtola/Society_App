import type { ReactNode } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { colors } from '../../theme';

type Props = {
  size: number;
  /** Corner radius; defaults to a full circle. */
  radius?: number;
  color?: string;
  style?: StyleProp<ViewStyle>;
  children: ReactNode;
};

/** Tinted box or circle with an icon centred inside. */
export default function IconCircle({ size, radius = size / 2, color = colors.tint, style, children }: Props) {
  return (
    <View
      style={[
        { width: size, height: size, borderRadius: radius, backgroundColor: color, alignItems: 'center', justifyContent: 'center' },
        style,
      ]}
    >
      {children}
    </View>
  );
}
