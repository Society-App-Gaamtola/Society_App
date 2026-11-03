import { useCallback, useMemo, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { HomeStackParamList } from '../navigation/types';
import { colors, fonts } from '../theme';
import { notices, type Notice } from '../data/mock';
import { AppHeader, FilterChips, StatusBadge } from '../components';

const FILTERS = ['All', 'Important', 'General', 'Event', 'Other'] as const;
type Filter = (typeof FILTERS)[number];

const MUTED_ICON = '#9A8F86';
const PINK = '#F8E9E9';

export default function NoticeBoardScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<HomeStackParamList>>();
  const [filter, setFilter] = useState<Filter>('All');
  const [refreshing, setRefreshing] = useState(false);

  const data = useMemo(() => (filter === 'All' ? notices : notices.filter((n) => n.tag === filter)), [filter]);

  const onRefresh = useCallback(() => {
    // TODO: reload notices from the API.
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 800);
  }, []);

  return (
    <View style={styles.container}>
      <AppHeader leftType="back" rightIcons={['more']} />
      <FlatList
        data={data}
        keyExtractor={(n) => n.id}
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} tintColor={colors.primary} />
        }
        ListHeaderComponent={
          <View>
            <Text style={styles.heading}>Notice Board</Text>
            <Text style={styles.subtext}>Stay informed with important notices, updates and announcements.</Text>
            <FilterChips options={FILTERS} selected={filter} onSelect={setFilter} style={styles.chips} />
          </View>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="megaphone-outline" size={40} color={colors.lightGold} />
            <Text style={styles.emptyText}>No notices found</Text>
          </View>
        }
        renderItem={({ item }) => (
          <NoticeCard notice={item} onPress={() => navigation.navigate('NoticeDetails', { noticeId: item.id })} />
        )}
      />
    </View>
  );
}

function NoticeCard({ notice, onPress }: { notice: Notice; onPress: () => void }) {
  const important = notice.tag === 'Important';
  return (
    <Pressable style={styles.card} onPress={onPress} accessibilityRole="button">
      <View style={styles.icon}>
        <Ionicons name={notice.icon} size={20} color={colors.primary} />
      </View>
      <View style={styles.info}>
        <Text style={[styles.title, important && styles.titleImportant]}>{notice.title}</Text>
        <View style={styles.dateRow}>
          <Ionicons name="calendar-outline" size={12} color={MUTED_ICON} />
          <Text style={styles.date}>{notice.date}</Text>
        </View>
        <Text style={styles.desc} numberOfLines={2} ellipsizeMode="tail">
          {notice.description}
        </Text>
      </View>
      <StatusBadge status={notice.tag} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  list: { padding: 16, paddingBottom: 32, flexGrow: 1 },
  heading: { fontFamily: fonts.bold, fontSize: 18, color: colors.textDark },
  subtext: { fontFamily: fonts.regular, fontSize: 12, lineHeight: 18, color: colors.textMuted, marginTop: 2 },
  chips: { marginTop: 14, marginBottom: 14 },
  separator: { height: 10 },
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 12,
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  icon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: PINK,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: { flex: 1, gap: 3 },
  title: { fontFamily: fonts.semiBold, fontSize: 14, lineHeight: 20, color: colors.textDark },
  titleImportant: { fontFamily: fonts.bold },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  date: { fontFamily: fonts.regular, fontSize: 11, color: colors.textMuted },
  desc: { fontFamily: fonts.regular, fontSize: 12, lineHeight: 18, color: colors.textMuted },
  empty: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60, gap: 10 },
  emptyText: { fontFamily: fonts.medium, fontSize: 14, color: colors.textMuted },
});
