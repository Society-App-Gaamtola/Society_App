import { Pressable, StyleSheet, Text, View } from 'react-native';
import { surface } from '../../styles/common';
import { colors, fonts } from '../../theme';
import { Ionicons, MaterialCommunityIcons, type McIconName } from '../../icons';
import type { DonationMethod } from '../../types';
import IconCircle from '../ui/IconCircle';

export const PAYMENT_METHODS: { method: DonationMethod; icon: McIconName; hint: string }[] = [
  { method: 'UPI App', icon: 'cellphone-check', hint: 'Google Pay, PhonePe, Paytm, BHIM' },
  { method: 'QR Code', icon: 'qrcode-scan', hint: 'Scan with any UPI app' },
  { method: 'Card', icon: 'credit-card-outline', hint: 'Visa, Mastercard, RuPay' },
  { method: 'Net Banking', icon: 'bank-outline', hint: 'All major Indian banks' },
  { method: 'Cash', icon: 'cash-multiple', hint: 'Pay at the Mandal office' },
];

type Props = { selected: DonationMethod; onSelect: (method: DonationMethod) => void };

/** Radio list of the ways to pay. */
export default function PaymentMethodList({ selected, onSelect }: Props) {
  return (
    <View style={styles.list} accessibilityRole="radiogroup">
      {PAYMENT_METHODS.map(({ method, icon, hint }) => {
        const active = method === selected;
        return (
          <Pressable
            key={method}
            onPress={() => onSelect(method)}
            style={[styles.row, active && styles.rowActive]}
            accessibilityRole="radio"
            accessibilityState={{ checked: active }}
          >
            <IconCircle size={40} radius={10}>
              <MaterialCommunityIcons name={icon} size={22} color={colors.primary} />
            </IconCircle>
            <View style={styles.text}>
              <Text style={styles.label}>{method === 'Cash' ? 'Cash at Office' : method}</Text>
              <Text style={styles.hint}>{hint}</Text>
            </View>
            <Ionicons name={active ? 'radio-button-on' : 'radio-button-off'} size={22} color={active ? colors.primary : colors.mutedIcon} />
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: 10 },
  row: { ...surface, flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12 },
  rowActive: { borderColor: colors.primary, backgroundColor: colors.softTint },
  text: { flex: 1 },
  label: { fontFamily: fonts.semiBold, fontSize: 14, color: colors.textDark },
  hint: { fontFamily: fonts.regular, fontSize: 11, color: colors.textMuted, marginTop: 1 },
});
