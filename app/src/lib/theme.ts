// Visual tokens — kept in sync with Savage Deck
// (https://fumbletable.github.io/savage-deck/ → jsx-runtime-*.css).
// Changing these is how we adjust the whole look without chasing inline styles.

export const theme = {
  // Surfaces
  bg: "#1a1a1d",            // page background, canvas clear colour
  surface: "#232327",       // raised panels (result chips, inputs)
  surfaceHi: "#2e2e33",     // thin borders, badges
  button: "#3a3a42",        // default button fill
  buttonHover: "#4a4a52",

  // Text
  text: "#e8e8ea",
  textMuted: "#b8b8bd",
  textDim: "#8a8a90",
  textDimmer: "#6a6a72",

  // Accents
  primary: "#6b4ba8",       // purple — primary CTAs, highlights
  primaryHi: "#9b7ad8",     // active/hover purple
  primaryBorder: "#4a3a6a",

  // SWADE-flavour
  benny: "#c9a800",         // gold — for highlights that want a SWADE feel
  wounded: "#e07060",
  shaken: "#c0392b",
  trait: "#e8a050",         // orange — trait stats / trait rolls
  wild: "#c94b4b",          // red — wild die
  damage: "#c8c8d4",        // neutral grey — damage rolls

  // Radii / spacing
  radius: 4,
  radiusSm: 2,
} as const;
