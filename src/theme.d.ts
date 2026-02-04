import '@mui/material/styles';

declare module '@mui/material/styles' {
  interface Palette {
    brown?: PaletteColor;
  }
  interface PaletteOptions {
    brown?: PaletteColorOptions;
  }
}
