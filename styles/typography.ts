import { StyleSheet, TextStyle } from 'react-native';
import { FONT_BLACK, FONT_DISPLAY, FONT_EXTRABOLD, FONT_SEMIBOLD } from '../constants/fonts';

export const typography = StyleSheet.create({
  score: {
    fontFamily: FONT_BLACK,
    fontVariant: ['tabular-nums'],
    letterSpacing: -0.5,
  } as TextStyle,
  heroText: {
    fontFamily: FONT_EXTRABOLD,
    fontVariant: ['tabular-nums'],
  } as TextStyle,
  displayLabel: {
    fontFamily: FONT_SEMIBOLD,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  } as TextStyle,
});
