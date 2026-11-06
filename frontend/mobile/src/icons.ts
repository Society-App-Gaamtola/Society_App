import type { ComponentProps } from 'react';
import Ionicons from '@expo/vector-icons/Ionicons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

// Import icons from here only: the '@expo/vector-icons' root adds every icon font to the app.
export { Ionicons, MaterialCommunityIcons };

export type IoniconName = ComponentProps<typeof Ionicons>['name'];
export type McIconName = ComponentProps<typeof MaterialCommunityIcons>['name'];
