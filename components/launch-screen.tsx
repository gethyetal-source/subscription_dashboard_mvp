import { useEffect, useRef, useState, type PropsWithChildren } from "react";
import { AccessibilityInfo, Animated, Platform, StyleSheet, Text, View } from "react-native";
import * as SplashScreen from "expo-splash-screen";
import Svg, { Circle, Defs, RadialGradient, Stop } from "react-native-svg";
import { BrandMark } from "./brand-mark";
import { SAVINGS_TAGLINE, launchHoldTime } from "@/lib/launch";

export function LaunchScreen({ ready, fontsLoaded = true, fontsReady = fontsLoaded, children }: PropsWithChildren<{ ready: boolean; fontsLoaded?: boolean; fontsReady?: boolean }>) {
  const [visible, setVisible] = useState(true);
  const [reduceMotion, setReduceMotion] = useState<boolean>();
  const [introFinished, setIntroFinished] = useState(false);
  const [laidOut, setLaidOut] = useState(false);
  const [presented, setPresented] = useState(false);
  const opacity = useRef(new Animated.Value(1)).current;
  const entrance = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0)).current;
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    void AccessibilityInfo.isReduceMotionEnabled().catch(() => true).then((enabled) => {
      if (mounted.current) setReduceMotion(enabled);
    });
    return () => { mounted.current = false; };
  }, []);

  useEffect(() => {
    if (!laidOut || reduceMotion === undefined || !fontsReady || presented) return;
    let active = true;
    let firstFrame: number | undefined;
    let secondFrame: number | undefined;
    const reveal = async () => {
      if (Platform.OS !== "web") {
        try { await SplashScreen.hideAsync(); } catch { /* Continue if the system splash is already gone. */ }
      }
      if (!active) return;
      // Let the native splash leave and the overlay paint before starting its clock.
      firstFrame = requestAnimationFrame(() => {
        secondFrame = requestAnimationFrame(() => { if (active) setPresented(true); });
      });
    };
    void reveal();
    return () => {
      active = false;
      if (firstFrame !== undefined) cancelAnimationFrame(firstFrame);
      if (secondFrame !== undefined) cancelAnimationFrame(secondFrame);
    };
  }, [laidOut, reduceMotion, fontsReady, presented]);

  useEffect(() => {
    if (!presented || reduceMotion === undefined) return;
    const timer = setTimeout(() => setIntroFinished(true), launchHoldTime(reduceMotion));
    if (reduceMotion) { entrance.setValue(1); return () => clearTimeout(timer); }
    const enter = Animated.timing(entrance, { toValue: 1, duration: 500, useNativeDriver: Platform.OS !== "web" });
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1, duration: 700, useNativeDriver: Platform.OS !== "web" }),
      Animated.timing(pulse, { toValue: 0, duration: 700, useNativeDriver: Platform.OS !== "web" }),
    ]));
    enter.start(); loop.start();
    return () => { clearTimeout(timer); enter.stop(); loop.stop(); };
  }, [presented, reduceMotion, entrance, pulse]);

  useEffect(() => {
    if (!visible || !ready || !introFinished || !presented || reduceMotion === undefined) return;
    const fade = Animated.timing(opacity, { toValue: 0, duration: reduceMotion ? 0 : 180, useNativeDriver: Platform.OS !== "web" });
    fade.start(({ finished }) => {
      if (!finished || !mounted.current) return;
      setVisible(false);
    });
    return () => fade.stop();
  }, [ready, introFinished, presented, reduceMotion, opacity, visible]);

  return <View style={{ flex: 1 }}>
    <View style={{ flex: 1, display: visible ? "none" : "flex" }} pointerEvents={visible ? "none" : "auto"} accessibilityElementsHidden={visible} importantForAccessibility={visible ? "no-hide-descendants" : "auto"}>
      {children}
    </View>
    {visible ? <Animated.View testID="launch-screen" accessibilityViewIsModal style={[StyleSheet.absoluteFillObject, styles.screen, { opacity }]} onLayout={() => setLaidOut(true)}>
      <Svg pointerEvents="none" width="100%" height="100%" style={StyleSheet.absoluteFillObject}>
        <Defs><RadialGradient id="launch-glow"><Stop offset="0" stopColor="#147E61" stopOpacity="0.5" /><Stop offset="1" stopColor="#073A2E" stopOpacity="0" /></RadialGradient></Defs>
        <Circle cx="80%" cy="15%" r="280" fill="url(#launch-glow)" />
        <Circle cx="10%" cy="95%" r="240" fill="url(#launch-glow)" />
      </Svg>
      <Animated.View style={{ alignItems: "center", opacity: !presented ? 0 : reduceMotion ? 1 : entrance, transform: [{ translateY: reduceMotion ? 0 : entrance.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }] }}>
        <View style={styles.mark}>
          <Animated.View pointerEvents="none" style={[styles.ring, { opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.12, 0.38] }), transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.18] }) }] }]} />
          <BrandMark size={76} />
        </View>
        <Text accessibilityRole="header" style={[styles.name, !fontsLoaded && { fontFamily: undefined }]}>SubTrack</Text>
        <Text style={[styles.tagline, !fontsLoaded && { fontFamily: undefined }]}>{SAVINGS_TAGLINE}</Text>
      </Animated.View>
      <View style={[styles.footer, { opacity: presented ? 1 : 0 }]}>
        <View style={styles.dots}>{[0, 1, 2].map((dot) => <Animated.View key={dot} style={[styles.dot, { opacity: reduceMotion ? 0.7 : pulse.interpolate({ inputRange: [0, 1], outputRange: dot === 1 ? [0.35, 1] : [0.8, 0.35] }) }]} />)}</View>
        <Text style={[styles.footerText, !fontsLoaded && { fontFamily: undefined }]}>Less waste. More of what matters.</Text>
      </View>
    </Animated.View> : null}
  </View>;
}

const styles = StyleSheet.create({
  screen: { zIndex: 1000, backgroundColor: "#073A2E", alignItems: "center", justifyContent: "center", padding: 28 },
  mark: { width: 110, height: 110, alignItems: "center", justifyContent: "center" },
  ring: { position: "absolute", width: 100, height: 100, borderRadius: 34, backgroundColor: "#83E9C1" },
  name: { color: "#FFFFFF", fontFamily: "Poppins-Bold", fontSize: 36, letterSpacing: -1.2, marginTop: 18 },
  tagline: { color: "#C0E9DA", fontFamily: "Poppins-Regular", fontSize: 14, lineHeight: 22, textAlign: "center", maxWidth: 230, marginTop: 9 },
  footer: { position: "absolute", bottom: 56, alignItems: "center", gap: 18 },
  footerText: { color: "#A5D3C2", fontFamily: "Poppins-Regular", fontSize: 11 },
  dots: { flexDirection: "row", gap: 7 },
  dot: { width: 5, height: 5, borderRadius: 3, backgroundColor: "#8BEAC7" },
});
