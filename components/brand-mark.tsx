import Svg, { Path, Rect } from "react-native-svg";

export function BrandMark({ size = 48 }: { size?: number }) {
  return <Svg width={size} height={size} viewBox="0 0 64 64" accessibilityLabel="SubTrack">
    <Rect x="0" y="0" width="64" height="64" rx="20" fill="#8BEAC7" />
    <Path d="M43 20H29C23 20 20 23 20 27S23 34 29 34H35C41 34 44 37 44 41S41 48 35 48H21" fill="none" stroke="#075C46" strokeWidth="7" strokeLinecap="round" />
    <Path d="M43 16V24M21 44V52" stroke="#075C46" strokeWidth="4" strokeLinecap="round" />
  </Svg>;
}
