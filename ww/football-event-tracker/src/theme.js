import { createTheme } from '@mui/material/styles';

const fieldGreen = '#1f6a3a';
const amberAccent = '#f59f2f';

export const appTheme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: fieldGreen,
      light: '#3a8f57',
      dark: '#124524',
      contrastText: '#f6fbf3',
    },
    secondary: {
      main: amberAccent,
      light: '#ffc86b',
      dark: '#b67116',
      contrastText: '#1b1205',
    },
    success: {
      main: '#248a47',
    },
    error: {
      main: '#bf3b35',
    },
    background: {
      default: '#eef4e8',
      paper: '#fbfdf8',
    },
    text: {
      primary: '#162015',
      secondary: '#4f624f',
    },
    divider: '#d2dfcb',
  },
  shape: {
    borderRadius: 14,
  },
  spacing: 6,
  typography: {
    fontSize: 11.5,
    fontFamily: '"Archivo", "Trebuchet MS", sans-serif',
    h4: {
      fontFamily: '"Bebas Neue", "Archivo", sans-serif',
      letterSpacing: '0.06em',
      lineHeight: 1,
    },
    h5: {
      fontFamily: '"Bebas Neue", "Archivo", sans-serif',
      letterSpacing: '0.05em',
      lineHeight: 1,
    },
    h6: {
      fontFamily: '"Bebas Neue", "Archivo", sans-serif',
      letterSpacing: '0.04em',
      lineHeight: 1,
    },
    button: {
      fontWeight: 600,
      letterSpacing: '0.02em',
      textTransform: 'none',
    },
    subtitle2: {
      textTransform: 'uppercase',
      letterSpacing: '0.08em',
      fontWeight: 700,
    },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          background:
            'radial-gradient(circle at 16% 12%, rgba(190, 219, 182, 0.9) 0%, rgba(238, 244, 232, 0) 36%), radial-gradient(circle at 84% 16%, rgba(241, 203, 140, 0.5) 0%, rgba(238, 244, 232, 0) 32%), linear-gradient(180deg, #f4f8ee 0%, #eaf1e2 100%)',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          border: '1px solid #d3e0cd',
          boxShadow: '0 10px 20px rgba(16, 42, 24, 0.07)',
        },
      },
    },
    MuiButton: {
      defaultProps: {
        disableElevation: true,
      },
      styleOverrides: {
        root: {
          borderRadius: 12,
          minHeight: 28,
          paddingInline: 9,
          paddingBlock: 3,
          fontSize: '0.74rem',
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          height: 22,
          fontSize: '0.7rem',
        },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          minHeight: 34,
          paddingInline: 10,
          paddingBlock: 4,
          fontWeight: 700,
          fontSize: '0.74rem',
        },
      },
    },
    MuiTabs: {
      styleOverrides: {
        root: {
          minHeight: 34,
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 14,
        },
      },
    },
  },
});

