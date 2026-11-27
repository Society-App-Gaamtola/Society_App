import { StyleSheet, Text, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { surface } from '../../styles/common';
import { colors, fonts, themedStyles } from '../../theme';
import { LOGO } from '../../config';
import type { UpiDetails } from '../../services/upi';
import { formatINR } from '../../utils/format';
import { useT } from '../../i18n';

const SIZE = 200;
// Not a UPI link, so scanning the sample can never start a payment.
const SAMPLE_VALUE = 'SAMPLE QR - the society UPI ID is not set up yet';

type Props = {
  amount: number;
  /** The UPI link (upiPayUrl) with this donation's amount and ID; null until the admin adds the UPI ID */
  url: string | null;
  upi: UpiDetails;
  /** The donation's receipt number (DON042), also in the UPI note */
  donationNo?: string;
};

/**
 * Scan-to-pay QR drawn in the app from the UPI link, so it always carries the amount the donor chose and the donation
 * ID (the admin only sets the UPI ID and payee name). Shows a marked sample until the admin adds the UPI ID.
 */
export default function UpiQrCard({ amount, url, upi, donationNo }: Props) {
  const t = useT();

  return (
    <View style={styles.card}>
      <Text style={styles.amount}>{formatINR(amount)}</Text>
      {url && upi ? <Text style={styles.payee}>{upi.payee_name}</Text> : null}
      <View style={styles.qrBox}>
        {/* Black on white in both themes, and high error correction so the logo in the middle doesn't stop scans */}
        <QRCode
          value={url ?? SAMPLE_VALUE}
          size={SIZE}
          color={colors.qrDots}
          backgroundColor={colors.qrBackground}
          ecl="H"
          logo={LOGO}
          logoSize={44}
          logoBackgroundColor={colors.qrBackground}
          logoMargin={2}
        />
        {!url ? (
          <View style={styles.sample}>
            <Text style={styles.sampleText}>{t('SAMPLE')}</Text>
          </View>
        ) : null}
      </View>
      <Text style={styles.upi}>{url && upi ? `${t('UPI ID')}: ${upi.upi_id}` : t('UPI ID will be added by the admin')}</Text>
      {url && donationNo ? <Text style={styles.donationNo}>{t('Donation ID: {no}', { no: donationNo })}</Text> : null}
      <Text style={styles.help}>{t('Open any UPI app, tap Scan and point it at this code. The amount fills in by itself.')}</Text>
    </View>
  );
}

const styles = themedStyles(() => ({
  card: { ...surface, alignItems: 'center', padding: 16, gap: 10 },
  amount: { fontFamily: fonts.bold, fontSize: 22, color: colors.primary },
  payee: { fontFamily: fonts.semiBold, fontSize: 13, color: colors.textDark, textAlign: 'center', marginTop: -6 },
  qrBox: { padding: 12, backgroundColor: colors.qrBackground, borderRadius: 12, borderWidth: 1, borderColor: colors.border },
  sample: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.55)' },
  sampleText: {
    fontFamily: fonts.bold,
    fontSize: 28,
    letterSpacing: 4,
    color: colors.danger,
    transform: [{ rotate: '-20deg' }],
  },
  upi: { fontFamily: fonts.semiBold, fontSize: 13, color: colors.textDark },
  donationNo: { fontFamily: fonts.medium, fontSize: 12, color: colors.textMuted },
  help: { fontFamily: fonts.regular, fontSize: 12, lineHeight: 18, color: colors.textMuted, textAlign: 'center' },
}));
