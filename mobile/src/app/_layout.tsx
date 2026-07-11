import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { colors } from "@/constants/theme";

SplashScreen.preventAutoHideAsync();
SplashScreen.hideAsync();

/**
 * KadCompare is a linear wizard app (landing → recommend/evaluate), not a
 * tabbed app — a plain Stack navigator with a consistent header matches the
 * product better than the default tabs template.
 */
export default function RootLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.white },
        headerTintColor: colors.brandDark,
        headerTitleStyle: { color: colors.slate900, fontWeight: "700" },
        contentStyle: { backgroundColor: colors.bg },
      }}
    >
      <Stack.Screen name="index" options={{ title: "KadCompare" }} />
      <Stack.Screen name="recommend" options={{ title: "Find my card" }} />
      <Stack.Screen name="evaluate" options={{ title: "Evaluate my cards" }} />
    </Stack>
  );
}
