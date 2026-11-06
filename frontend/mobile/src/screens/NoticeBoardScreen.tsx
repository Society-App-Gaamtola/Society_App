import { memo, useCallback, useMemo, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { HomeStackParamList } from '../navigation/types';
import { common, surface } from '../styles/common';
import { colors, fonts } from '../theme';
import { LIST_PERFORMANCE_PROPS } from '../config/list';
import { notices } from '../data/mock';
import { useSimulatedRefresh } from '../hooks/useSimulatedRefresh';
import { Ionicons } from '../icons';
import type { Notice } from '../types';
import { AppHeader, EmptyState, FilterChips, IconCircle, StatusBadge } from '../components';

const FILTERS = ['All', 'Important', 'General', 'Event', 'Other'] as const;
type Filter = (typeof FILTERS)[number];

const Separator = () => <View style={styles.separator} />;

export default function NoticeBoardScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<HomeStackParamList>>();
  const [filter, setFilter] = useState<Filter>('All');
  const { refreshing, onRefresh } = useSimulatedRefresh();

  const data = useMemo(() => (filter === 'All' ? notices : notices.filter((n) => n.tag === filter)), [filter]);

  const openNotice = useCallback((noticeId: string) => navigation.navigate('NoticeDetails', { noticeId }), [navigation]);
  const renderItem = useCallback(
    ({ item }: { item: Notice }) => <NoticeCard notice={item} onOpen={openNotice} />,
    [openNotice],
  );

  return (
    <View style={common.screen}>
      <AppHeader leftType="back" rightIcons={['more']} />
      <FlatList
        {...LIST_PERFORMANCE_PROPS}
        data={data}
        keyExtractor={(n) => n.id}
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={Separator}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} tintColor={colors.primary} />
        }
        ListHeaderComponent={
          <View>
            <Text style={common.heading}>Notice Board</Text>
            <Text style={common.subtextRelaxed}>Stay informed with important notices, updates and announcements.</Text>
            <FilterChips options={FILTERS} selected={filter} onSelect={setFilter} style={styles.chips} />
          </View>
        }
        ListEmptyComponent={
          <EmptyState icon={<Ionicons name="megaphone-outline" size={40} color={colors.lightGold} />} text="No notices found" />
        }
        renderItem={renderItem}
      />
    </View>
  );
}

const NoticeCard = memo(function NoticeCard({ notice, onOpen }: { notice: Notice; onOpen: (id: string) => void }) {
  const important = notice.tag === 'Important';
  return (
    <Pressable style={styles.card} onPress={() => onOpen(notice.id)} accessibilityRole="button">
      <IconCircle size={40}>
        <Ionicons name={notice.icon} size={20} color={colors.primary} />
      </IconCircle>
      <View style={styles.info}>
        <Text style={[styles.title, important && styles.titleImportant]}>{notice.title}</Text>
        <View style={styles.dateRow}>
          <Ionicons name="calendar-outline" size={12} color={colors.mutedIcon} />
          <Text style={styles.date}>{notice.date}</Text>
        </View>
        <Text style={styles.desc} numberOfLines={2} ellipsizeMode="tail">
          {notice.description}
        </Text>
      </View>
      <StatusBadge status={notice.tag} />
    </Pressable>
  );
});

const styles = StyleSheet.create({
  list: { padding: 16, paddingBottom: 32, flexGrow: 1 },
  chips: { marginTop: 14, marginBottom: 14 },
  separator: { height: 10 },
  card: { ...surface, flexDirection: 'row', alignItems: 'flex-start', gap: 10, padding: 12 },
  info: { flex: 1, gap: 3 },
  title: { fontFamily: fonts.semiBold, fontSize: 14, lineHeight: 20, color: colors.textDark },
  titleImportant: { fontFamily: fonts.bold },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  date: { fontFamily: fonts.regular, fontSize: 11, color: colors.textMuted },
  desc: { fontFamily: fonts.regular, fontSize: 12, lineHeight: 18, color: colors.textMuted },
});
