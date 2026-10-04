import { useMemo } from "react";
import { useThemeContext } from "./theme-provider";
import { SchemeColors } from "@/constants/theme";

export const palettes = {
  light: { ...SchemeColors.light, elevated: "#EAEADE", onPrimary: "#FFFFFF", danger: SchemeColors.light.error },
  dark: { ...SchemeColors.dark, elevated: "#202713", onPrimary: "#172108", danger: SchemeColors.dark.error },
};
export function usePalette() { return palettes[useThemeContext().colorScheme]; }
export function useThemedStyles<T>(styles: T): T {
  const palette = usePalette();
  return useMemo(() => {
    const mappings: Record<string, string> = {
      "#11150B": palette.background, "#12160B": palette.background, "#191E0F": palette.surface, "#1D2212": palette.surface,
      "#202713": palette.elevated, "#F4F2E8": palette.foreground, "#C9F72D": palette.primary,
      "#172108": palette.onPrimary, "#343A25": palette.border, "#3A4227": palette.border, "#485632": palette.border,
      "#A8AD98": palette.muted, "#89917A": palette.muted, "#727A62": palette.muted, "#C5CBB8": palette.muted,
      "#1A73E8": palette.primary, "#E8F0FE": palette.elevated, "#FFFFFF": palette.surface,
      "#202124": palette.foreground, "#3C4043": palette.foreground, "#5F6368": palette.muted,
      "#DADCE0": palette.border, "#F1F3F4": palette.background, "#F8F9FA": palette.background,
      "#FF9B8C": palette.danger, "#FFCF9B": palette.warning,
      "#1967D2": palette.primary, "#AECBFA": palette.border, "#E8EAED": palette.border,
      "#F8FBFF": palette.elevated, "#162007": palette.onPrimary, "#171C0E": palette.surface,
      "#FEF7E0": palette.elevated, "#7A4700": palette.warning, "#66521F": palette.muted,
      "#8A5200": palette.warning, "#188038": palette.primary,
      "#28301B": palette.elevated, "#2A3020": palette.elevated,
      "#C9D0B8": palette.muted,
      "#1D2411": palette.elevated, "#3B3519": palette.elevated, "#2A3511": palette.elevated,
      "#2B2519": palette.elevated, "#3D3520": palette.elevated,
      "#887330": palette.border, "#D2E3FC": palette.border,
      "#C8CEBC": palette.muted, "#D7DBC9": palette.muted, "#174EA6": palette.primary,
    };
    // Legacy white text sits on accents that are remapped to palette.primary, so it must follow onPrimary.
    // Text on unmapped accent colors (service badges, member avatars) uses the literal "white" instead.
    const transform = (value: unknown, key?: string): unknown => {
      if (typeof value === "string") {
        const hex = value.toUpperCase();
        if (key === "color" && hex === "#FFFFFF") return palette.onPrimary;
        return mappings[hex] ?? value;
      }
      if (Array.isArray(value)) return value.map((child) => transform(child));
      if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([childKey, child]) => [childKey, transform(child, childKey)]));
      return value;
    };
    return transform(styles) as T;
  }, [styles, palette]);
}
