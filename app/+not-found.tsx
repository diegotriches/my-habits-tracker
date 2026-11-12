// app/+not-found.tsx
import { Link } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { Icon } from '@/components/ui/Icon';
import { useTheme } from '@/contexts/ThemeContext';

/** Rota inexistente (ex.: deep link antigo ou digitado errado). */
export default function NotFoundScreen() {
  const { colors } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Icon name="search" size={40} color={colors.textTertiary} />
      <Text style={[styles.title, { color: colors.textPrimary }]}>Página não encontrada</Text>
      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
        O link que você abriu não existe mais ou está incorreto.
      </Text>
      <Link href="/" style={[styles.link, { color: colors.primary }]}>
        Voltar para o início
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 8,
  },
  title: { fontSize: 20, fontWeight: '700', marginTop: 8 },
  subtitle: { fontSize: 14, textAlign: 'center' },
  link: { marginTop: 16, paddingVertical: 12, fontSize: 15, fontWeight: '600' },
});
