/** Design tokens — match the Cloud Design handoff pixel-for-pixel. Do not invent new values here. */

export const colors = {
  background: "#f6f1ed",
  surface: "#fdfbf9",
  surfaceDark: "#2f2d2b",
  border: "#ece6df",
  borderStrong: "#e7e0d8",
  textPrimary: "#2f2f2f",
  textSecondary: "#9b9a97",
  textTertiary: "#b3aaa0",
  textFaint: "#c5bdb5",
  accentRed: "#b23a2e",
  overdueRed: "#cf4030",
  success: "#16a34a",
  chevron: "#cfc7be",
  scrim: "rgba(40,36,33,0.52)",
  chipBg: "#ede8e2",
  chipText: "#6a6560",
  chipDashed: "#c8c0b6",
  navBg: "rgba(246,241,237,0.92)",
  navBorder: "#e7e0d8",
  inputBorder: "#e7e0d8",
} as const;

export const fonts = {
  serif: "Newsreader_500Medium",
  serifRegular: "Newsreader_400Regular",
  sans: "Geist_400Regular",
  sansMedium: "Geist_500Medium",
  sansSemiBold: "Geist_600SemiBold",
  mono: "GeistMono_400Regular",
  monoMedium: "GeistMono_500Medium",
  monoSemiBold: "GeistMono_600SemiBold",
  monoBold: "GeistMono_700Bold",
  jetbrains: "JetBrainsMono_400Regular",
  jetbrainsBold: "JetBrainsMono_700Bold",
} as const;

export const type = {
  h1: { fontFamily: fonts.serif, fontSize: 30, lineHeight: 32, letterSpacing: -0.3 },
  sectionTitle: { fontFamily: fonts.serif, fontSize: 22, lineHeight: 26 },
  body: { fontFamily: fonts.sans, fontSize: 15, lineHeight: 22 },
  label: { fontFamily: fonts.monoMedium, fontSize: 11, lineHeight: 11, letterSpacing: 1.5 },
  smallLabel: { fontFamily: fonts.mono, fontSize: 10.5, lineHeight: 16, letterSpacing: 0.7 },
  healthNumber: { fontFamily: fonts.serif, fontSize: 22, lineHeight: 22 },
  noteEditor: { fontFamily: fonts.serifRegular, fontSize: 16, lineHeight: 28 },
} as const;

export const spacing = {
  screenPadding: 20,
  sectionGap: 28,
  rowPadding: 11,
};

export const radius = {
  card: 18,
  chip: 7,
  input: 11,
  fab: 25,
  tag: 5,
};

export const shadow = {
  fab: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.22,
    shadowRadius: 16,
    elevation: 8,
  },
  modal: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.35,
    shadowRadius: 50,
    elevation: 16,
  },
} as const;
