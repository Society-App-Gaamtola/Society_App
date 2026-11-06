import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRoute, type RouteProp } from '@react-navigation/native';
import type { HomeStackParamList } from '../navigation/types';
import { common, surface } from '../styles/common';
import { colors, fonts } from '../theme';
import { notices } from '../data/mock';
import { Ionicons } from '../icons';
import { AppHeader, IconCircle, LotusFooter, StatusBadge } from '../components';

export default function NoticeDetailsScreen() {
  const { params } = useRoute<RouteProp<HomeStackParamList, 'NoticeDetails'>>();
  const notice = notices.find((n) => n.id === params.noticeId);

  return (
    <View style={common.screen}>
      <AppHeader leftType="back" rightIcons={['more']} />
      {notice ? (
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.card}>
            <View style={styles.top}>
              <IconCircle size={48}>
                <Ionicons name={notice.icon} size={24} color={colors.primary} />
              </IconCircle>
              <StatusBadge status={notice.tag} />
            </View>
            <Text style={styles.title}>{notice.title}</Text>
            <View style={styles.dateRow}>
              <Ionicons name="calendar-outline" size={13} color={colors.mutedIcon} />
              <Text style={styles.date}>{notice.date}</Text>
            </View>
            <View style={styles.divider} />
            <Text style={styles.desc}>{notice.description}</Text>
          </View>
          <LotusFooter style={styles.footer} />
        </ScrollView>
      ) : (
        <Text style={styles.missing}>Notice not found.</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, flexGrow: 1 },
  card: { ...surface, padding: 16 },
  top: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  title: { fontFamily: fonts.bold, fontSize: 18, lineHeight: 26, color: colors.textDark, marginTop: 12 },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  date: { fontFamily: fonts.regular, fontSize: 12, color: colors.textMuted },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: 14 },
  desc: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 22, color: colors.textDark },
  footer: { marginTop: 'auto' },
  missing: { fontFamily: fonts.regular, fontSize: 14, color: colors.textMuted, textAlign: 'center', marginTop: 40 },
});
