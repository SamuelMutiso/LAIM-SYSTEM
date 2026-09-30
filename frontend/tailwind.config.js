export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {

        altar: {
          50: '#EEF0FB',
          100: '#DCDFF6',
          200: '#B7BCEC',
          300: '#8B92DE',
          400: '#5F67CC',
          500: '#3B40B0',
          600: '#2D3191',
          700: '#252877',
          800: '#1C1F5C',
          900: '#141642',
          950: '#0C0D2B',
        },
        flame: {
          50: '#FEF9E6',
          100: '#FDF0BF',
          200: '#FAE17F',
          300: '#F6D33F',
          400: '#F2C811',
          500: '#E0A812',
          600: '#C78A10',
          700: '#9E6A0C',
          800: '#744C09',
        },
        scripture: {
          50: '#FAEEF2',
          100: '#F3D7E0',
          200: '#E4AABD',
          400: '#B85A7B',
          500: '#A5446A',
          600: '#963C58',
          700: '#7A2F47',
          800: '#5C2335',
        },
        ink: {
          DEFAULT: '#3E403E',
          900: '#1F2120',
          700: '#3E403E',
          500: '#6B6E6B',
          400: '#8E918D',
          300: '#B9BBB6',
          200: '#DEDFDA',
          100: '#EEEEEA',
        },
        linen: '#F7F5F0',
      },
      fontFamily: {
        display: ['Sora', 'system-ui', 'sans-serif'],
        sans: ['Manrope', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(20,22,66,.04), 0 4px 16px -4px rgba(20,22,66,.08)',
        lift: '0 12px 32px -8px rgba(20,22,66,.22)',
      },
      backgroundImage: {
        'flame-glow': 'radial-gradient(ellipse at 50% 100%, rgba(242,200,17,.35), transparent 60%)',
      },
    },
  },
  plugins: [],
}
