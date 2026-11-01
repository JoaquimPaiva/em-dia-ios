import { useColorScheme } from 'react-native';
import { useAuth } from './AuthContext';
export const palette = {
  light: { bg: '#F4F6FA', surface: '#FFFFFF', surfaceAlt: '#EEF2FF', text: '#172033', muted: '#667085', line: '#DCE2EC', primary: '#5B55D9', primarySoft: '#E9E8FF', green: '#14805E', red: '#C83F52', amber: '#A15C00' },
  dark: { bg: '#11141C', surface: '#1B202B', surfaceAlt: '#242A3A', text: '#F3F5FA', muted: '#A6AEC0', line: '#343B4B', primary: '#A8A4FF', primarySoft: '#32304F', green: '#59D5AA', red: '#FF8998', amber: '#FFC66D' },
};
export function useColors() { const { user } = useAuth(); const system = useColorScheme(); return palette[user?.theme || (system === 'dark' ? 'dark' : 'light')]; }
