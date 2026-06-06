import { Stack } from 'expo-router';

export default function OnboardingLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
      <Stack.Screen name="units" />
      <Stack.Screen name="bar-weight" />
      <Stack.Screen name="plates" />
    </Stack>
  );
}
