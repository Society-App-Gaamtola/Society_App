import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRoute, type RouteProp } from '@react-navigation/native';
import type { HomeStackParamList } from '../navigation/types';
import { common, surface } from '../styles/common';
import { colors, fonts, themedStyles } from '../theme';
import { getEvent, getNotice, toNotice, toSocietyEvent } from '../api/user';
import { noticeShareText, shareAnywhere, shareOnWhatsApp } from '../services/share';
import { noticeNo, noticePdf } from '../services/contentPdf';
import { shareFile } from '../services/receipt';
import { Ionicons } from '../icons';
import type { Notice, SocietyEvent } from '../types';
import { AppHeader, IconCircle, LotusFooter, StatusBadge } from '../components';
import { useLanguage, useT } from '../i18n';

export default function NoticeDetailsScreen() {
  const t = useT();
  const { params } = useRoute<RouteProp<HomeStackParamList, 'NoticeDetails'>>();
  // A list that opened this screen passes the notice, so it shows at once; the API copy replaces it.
  const [notice, setNotice] = useState<Notice | null>(params.notice ?? null);
  const [error, setError] = useState<string | null>(null);
  // Reloaded in the new language when the user switches it (category names, dates and server messages)
  const language = useLanguage();
  // The notice as a PDF in the receipt design, shared through the phone's share sheet
  const [makingPdf, setMakingPdf] = useState(false);
  const sharePdf = async (item: Notice) => {
    setMakingPdf(true);
    try {
      await shareFile(await noticePdf(item, item.tag), 'PDF', noticeNo(item.id));
    } catch (e) {
      Alert.alert(t('Could not create the PDF'), e instanceof Error ? e.message : t('Please try again.'));
    } finally {
      setMakingPdf(false);
    }
  };

  useEffect(() => {
    let active = true;
    getNotice(params.noticeId)
      .then(({ data }) => active && setNotice(toNotice(data.notice)))
      .catch((e) => active && setError(e instanceof Error ? e.message : 'Could not load the notice.'));
    return () => {
      active = false;
    };
  }, [params.noticeId, language]);

  // A notice about an event shares that event's venue and map link too
  const [event, setEvent] = useState<SocietyEvent | null>(null);
  const eventId = notice?.eventId;
  useEffect(() => {
    if (!eventId) return;
    let active = true;
    getEvent(eventId)
      .then(({ data }) => active && setEvent(toSocietyEvent(data.event)))
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [eventId, language]);

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
            {event ? (
              <View style={styles.eventRow}>
                <Ionicons name="location-outline" size={14} color={colors.primary} />
                <Text style={styles.eventText}>{`${event.title} · ${event.venueName ?? event.venue}`}</Text>
              </View>
            ) : null}
          </View>
          <View style={styles.shareRow}>
            <Pressable
              style={({ pressed }) => [styles.whatsapp, pressed && styles.pressed]}
              onPress={() => shareOnWhatsApp(noticeShareText(notice, event))}
              accessibilityRole="button"
            >
              <Ionicons name="logo-whatsapp" size={18} color={colors.white} />
              <Text style={styles.whatsappText}>{t('Share on WhatsApp')}</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [styles.shareMore, pressed && styles.pressed]}
              onPress={() => shareAnywhere(noticeShareText(notice, event))}
              accessibilityRole="button"
              accessibilityLabel={t('Share')}
            >
              <Ionicons name="share-social-outline" size={20} color={colors.primary} />
            </Pressable>
            <Pressable
              style={({ pressed }) => [styles.shareMore, (pressed || makingPdf) && styles.pressed]}
              onPress={() => sharePdf(notice)}
              disabled={makingPdf}
              accessibilityRole="button"
              accessibilityLabel={t('Download PDF')}
            >
              {makingPdf ? <ActivityIndicator size="small" color={colors.primary} /> : <Ionicons name="document-text-outline" size={20} color={colors.primary} />}
            </Pressable>
          </View>
          <LotusFooter style={styles.footer} />
        </ScrollView>
      ) : error ? (
        <Text style={styles.missing}>{t(error)}</Text>
      ) : (
        <ActivityIndicator color={colors.primary} style={styles.loading} />
      )}
    </View>
  );
}

const styles = themedStyles(() => ({
  content: { padding: 16, flexGrow: 1 },
  card: { ...surface, padding: 16 },
  top: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  title: { fontFamily: fonts.bold, fontSize: 18, lineHeight: 26, color: colors.textDark, marginTop: 12 },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  date: { fontFamily: fonts.regular, fontSize: 12, color: colors.textMuted },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: 14 },
  desc: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 22, color: colors.textDark },
  footer: { marginTop: 'auto' },
  eventRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12 },
  eventText: { flex: 1, fontFamily: fonts.medium, fontSize: 13, color: colors.primary },
  shareRow: { flexDirection: 'row', gap: 10, marginTop: 14 },
  whatsapp: { flex: 1, height: 46, borderRadius: 10, backgroundColor: colors.whatsapp, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  whatsappText: { fontFamily: fonts.semiBold, fontSize: 14, color: colors.white },
  shareMore: { width: 46, height: 46, borderRadius: 10, borderWidth: 1.5, borderColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  pressed: { opacity: 0.8 },
  missing: { fontFamily: fonts.regular, fontSize: 14, color: colors.textMuted, textAlign: 'center', marginTop: 40 },
  loading: { marginTop: 40 },
}));
