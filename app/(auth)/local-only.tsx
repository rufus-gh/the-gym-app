import { View, Text, Pressable, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDatabase } from '@nozbe/watermelondb/hooks';
import { colors } from '@/constants/colors';
import { spacing, radius } from '@/constants/spacing';

export default function LocalOnlyScreen() {
  const database = useDatabase();

  async function handleStartTraining() {
    await database.write(async () => {
      const users = await database.get('users').query().fetch();
      if (users.length > 0) {
        const user = users[0] as { update: (fn: (u: { isLocalOnly: boolean }) => void) => Promise<void> };
        await user.update((u) => {
          u.isLocalOnly = true;
        });
      }
    });
    router.replace('/(tabs)/');
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Text style={styles.icon}>📱</Text>
        </View>

        <Text style={styles.title}>You're good to go — locally!</Text>

        <Text style={styles.body}>
          Your workouts, progress, and settings are stored only on this device. Nothing is sent to
          any server.
        </Text>

        <View style={styles.warningCard}>
          <Text style={styles.warningTitle}>Important: no backup</Text>
          <Text style={styles.warningBody}>
            If you delete the app or lose your device, your data cannot be recovered. You can create
            a free account at any time from Profile to enable cloud sync.
          </Text>
        </View>

        <View style={styles.featureList}>
          <FeatureRow icon="✓" text="Full workout logging" available />
          <FeatureRow icon="✓" text="PR detection and history" available />
          <FeatureRow icon="✓" text="Templates and programs" available />
          <FeatureRow icon="✓" text="Plate and 1RM calculators" available />
          <FeatureRow icon="✗" text="AI assistant (requires account)" available={false} />
          <FeatureRow icon="✗" text="Cross-device sync (requires account)" available={false} />
        </View>
      </View>

      <View style={styles.footer}>
        <Pressable style={styles.primaryBtn} onPress={handleStartTraining}>
          <Text style={styles.primaryBtnText}>Start Training</Text>
        </Pressable>
        <Pressable
          style={styles.ghostBtn}
          onPress={() => router.push('/(auth)/sign-in')}
        >
          <Text style={styles.ghostBtnText}>Create a free account instead</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

interface FeatureRowProps {
  icon: string;
  text: string;
  available: boolean;
}

function FeatureRow({ icon, text, available }: FeatureRowProps) {
  return (
    <View style={featureStyles.row}>
      <Text style={[featureStyles.icon, available ? featureStyles.available : featureStyles.unavailable]}>
        {icon}
      </Text>
      <Text style={[featureStyles.text, !available && featureStyles.textUnavailable]}>{text}</Text>
    </View>
  );
}

const featureStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
  },
  icon: {
    fontSize: 15,
    fontWeight: '700',
    width: 24,
    marginRight: spacing.sm,
  },
  available: {
    color: colors.semantic.success,
  },
  unavailable: {
    color: colors.label.tertiary.dark,
  },
  text: {
    fontSize: 15,
    color: colors.label.primary.dark,
  },
  textUnavailable: {
    color: colors.label.secondary.dark,
  },
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary.dark,
    paddingHorizontal: spacing.lg,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  icon: {
    fontSize: 64,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.label.primary.dark,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  body: {
    fontSize: 15,
    color: colors.label.secondary.dark,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: spacing.xl,
  },
  warningCard: {
    backgroundColor: colors.background.secondary.dark,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderLeftWidth: 3,
    borderLeftColor: colors.semantic.warning,
    marginBottom: spacing.xl,
  },
  warningTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.semantic.warning,
    marginBottom: spacing.xs,
  },
  warningBody: {
    fontSize: 13,
    color: colors.label.secondary.dark,
    lineHeight: 20,
  },
  featureList: {
    backgroundColor: colors.background.secondary.dark,
    borderRadius: radius.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  footer: {
    paddingBottom: spacing.xl,
    gap: spacing.sm,
  },
  primaryBtn: {
    backgroundColor: colors.system.blue,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '600',
  },
  ghostBtn: {
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  ghostBtnText: {
    color: colors.system.blue,
    fontSize: 15,
  },
});
