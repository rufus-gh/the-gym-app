import { Tabs } from 'expo-router';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#1C1C1E',
          borderTopColor: '#38383A',
        },
        tabBarActiveTintColor: '#007AFF',
        tabBarInactiveTintColor: 'rgba(235,235,245,0.6)',
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: 'Home', tabBarIcon: () => null }}
      />
      <Tabs.Screen
        name="progress"
        options={{ title: 'Progress', tabBarIcon: () => null }}
      />
      <Tabs.Screen
        name="log"
        options={{ title: 'Log', tabBarIcon: () => null }}
      />
      <Tabs.Screen
        name="library"
        options={{ title: 'Library', tabBarIcon: () => null }}
      />
      <Tabs.Screen
        name="profile"
        options={{ title: 'Profile', tabBarIcon: () => null }}
      />
    </Tabs>
  );
}
