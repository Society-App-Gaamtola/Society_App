import { StyleSheet, Text, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { surface } from '../../styles/common';
import { colors, fonts, themedStyles } from '../../theme';
import { LOGO } from '../../config';
import { upiPayUrl, type UpiDetails } from '../../services/upi';
import { formatINR } from '../../utils/format';
import { useT } from '../../i18n';

const SIZE = 200;
// Not a UPI link, so scanning the sample can never start a payment.
const SAMPLE_VALUE = 'SAMPLE QR - the society UPI ID is not set up yet';

/** Scan-to-pay QR with the amount filled in. Shows a marked sample until the admin adds the UPI ID. */
export default function UpiQrCard({ amount, note, upi }: { amount: number; note: string; upi: UpiDetails }) {
  const t = useT();
  const url = upiPayUrl(upi, amount, note);

  return (
    <View style={styles.card}>
      <Text style={styles.amount}>{formatINR(amount)}</Text>
      <View style={styles.qrBox}>
        <QRCode value={url ?? SAMPLE_VALUE} size={SIZE} color={colors.textDark} logo={LOGO} logoSize={44} logoBackgroundColor={colors.white} />
        {!url ? (
          <View style={styles.sample}>
            <Text style={styles.sampleText}>{t('SAMPLE')}</Text>
          </View>
        ) : null}
      </View>
      <Text style={styles.upi}>{url && upi ? `${t('UPI ID')}: ${upi.upi_id}` : t('UPI ID will be added by the admin')}</Text>
      <Text style={styles.help}>{t('Open any UPI app, tap Scan and point it at this code. The amount fills in by itself.')}</Text>
    </View>
  );
}

const styles = themedStyles(() => ({
  card: { ...surface, alignItems: 'center', padding: 16, gap: 10 },
  amount: { fontFamily: fonts.bold, fontSize: 22, color: colors.primary },
  qrBox: { padding: 10, backgroundColor: colors.white, borderRadius: 12, borderWidth: 1, borderColor: colors.border },
  sample: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.55)' },
  sampleText: {
    fontFamily: fonts.bold,
    fontSize: 28,
    letterSpacing: 4,
    color: colors.danger,
    transform: [{ rotate: '-20deg' }],
  },
  upi: { fontFamily: fonts.semiBold, fontSize: 13, color: colors.textDark },
  help: { fontFamily: fonts.regular, fontSize: 12, lineHeight: 18, color: colors.textMuted, textAlign: 'center' },
}));
