import { StyleSheet, View, type ViewStyle } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { colors } from '../../theme';

type CornerPosition = 'topLeft' | 'topRight' | 'bottomLeft' | 'bottomRight';

const cornerTransforms: Record<CornerPosition, ViewStyle['transform']> = {
  topLeft: [],
  topRight: [{ scaleX: -1 }],
  bottomLeft: [{ scaleY: -1 }],
  bottomRight: [{ scaleX: -1 }, { scaleY: -1 }],
};

/** Filigree corner drawn for the top-left; other corners are mirrored. */
export function CornerOrnament({ position, size = 96 }: { position: CornerPosition; size?: number }) {
  return (
    <View
      pointerEvents="none"
      style={[styles.corner, cornerStyles[position], { width: size, height: size, transform: cornerTransforms[position] }]}
    >
      <Svg width={size} height={size} viewBox="0 0 100 100" opacity={0.6}>
        {/* Double border lines */}
        <Path d="M8 96 V8 H96" stroke={colors.gold} strokeWidth={1.4} fill="none" />
        <Path d="M14 80 V14 H80" stroke={colors.gold} strokeWidth={0.8} fill="none" />
        {/* Corner scroll */}
        <Path
          d="M14 14 C30 14 38 22 38 34 C38 44 30 48 24 44 C18 40 21 32 27 33"
          stroke={colors.gold}
          strokeWidth={1.2}
          fill="none"
        />
        {/* Leaf curls along each edge */}
        <Path d="M38 14 C46 22 56 22 62 14 C56 18 46 18 38 14 Z" fill={colors.gold} />
        <Path d="M14 38 C22 46 22 56 14 62 C18 56 18 46 14 38 Z" fill={colors.gold} />
        <Path d="M66 14 C70 20 76 20 80 14" stroke={colors.gold} strokeWidth={1} fill="none" />
        <Path d="M14 66 C20 70 20 76 14 80" stroke={colors.gold} strokeWidth={1} fill="none" />
        <Circle cx={8} cy={8} r={3} fill={colors.gold} />
        <Circle cx={88} cy={14} r={1.6} fill={colors.gold} />
        <Circle cx={14} cy={88} r={1.6} fill={colors.gold} />
      </Svg>
    </View>
  );
}

/** Small motif centred on the top edge. */
export function TopOrnament({ width = 120 }: { width?: number }) {
  return (
    <Svg width={width} height={width * 0.3} viewBox="0 0 120 36" opacity={0.6}>
      <Path d="M4 8 H44" stroke={colors.gold} strokeWidth={1} />
      <Path d="M76 8 H116" stroke={colors.gold} strokeWidth={1} />
      <Path d="M44 8 C50 8 52 18 60 26 C68 18 70 8 76 8" stroke={colors.gold} strokeWidth={1.2} fill="none" />
      <Path d="M60 4 L66 12 L60 20 L54 12 Z" fill={colors.gold} />
      <Path d="M48 12 C44 18 38 18 34 14" stroke={colors.gold} strokeWidth={1} fill="none" />
      <Path d="M72 12 C76 18 82 18 86 14" stroke={colors.gold} strokeWidth={1} fill="none" />
      <Circle cx={60} cy={30} r={2.2} fill={colors.gold} />
    </Svg>
  );
}

/** Thin lines with a diamond in the middle. */
export function GoldDivider({ width = 180 }: { width?: number }) {
  return (
    <Svg width={width} height={16} viewBox="0 0 180 16">
      <Path d="M0 8 H72" stroke={colors.gold} strokeWidth={1} />
      <Path d="M108 8 H180" stroke={colors.gold} strokeWidth={1} />
      <Path d="M90 1 L97 8 L90 15 L83 8 Z" fill={colors.gold} />
      <Circle cx={78} cy={8} r={1.8} fill={colors.gold} />
      <Circle cx={102} cy={8} r={1.8} fill={colors.gold} />
    </Svg>
  );
}

export function Lotus({ width = 80 }: { width?: number }) {
  return (
    <Svg width={width} height={width * 0.6} viewBox="0 0 100 60">
      <Path d="M50 4 C60 18 60 38 50 52 C40 38 40 18 50 4 Z" fill={colors.lightGold} />
      <Path d="M48 52 C34 46 26 30 28 14 C40 22 48 36 48 52 Z" fill={colors.lightGold} />
      <Path d="M52 52 C66 46 74 30 72 14 C60 22 52 36 52 52 Z" fill={colors.lightGold} />
      <Path d="M46 54 C30 54 14 44 8 30 C24 30 40 40 46 54 Z" fill={colors.lightGold} opacity={0.8} />
      <Path d="M54 54 C70 54 86 44 92 30 C76 30 60 40 54 54 Z" fill={colors.lightGold} opacity={0.8} />
      <Path d="M14 58 H86" stroke={colors.lightGold} strokeWidth={1.5} />
    </Svg>
  );
}

const styles = StyleSheet.create({
  corner: { position: 'absolute' },
});

const cornerStyles: Record<CornerPosition, ViewStyle> = {
  topLeft: { top: 0, left: 0 },
  topRight: { top: 0, right: 0 },
  bottomLeft: { bottom: 0, left: 0 },
  bottomRight: { bottom: 0, right: 0 },
};
