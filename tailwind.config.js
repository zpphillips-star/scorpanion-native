/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        // Scorpanion Navy backgrounds
        bg:         '#0c1b31',
        surface:    '#142236',
        surface2:   '#1a2d4a',
        surface3:   '#213858',
        // Borders
        border:     '#1e3050',
        'border-d': '#25405c',
        'border-s': '#2e5070',
        // Accent — Burnt Orange
        accent:     '#D95C17',
        'accent-d': '#B54E13',
        // Text — Vintage Cream
        cream:      '#F2E6CF',
        'cream-m':  '#D8C6AA',
        faint:      '#5F6773',
        // Status
        live:       '#FFB400',
        win:        '#2FA84F',
        loss:       '#C43D35',
      },
    },
  },
  plugins: [],
};
