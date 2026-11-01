import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
  type ViewProps,
} from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';
import { useColors } from '../lib/theme';

type PageProps = ViewProps & { safeAreaEdges?: Edge[] };

export function Page({ children, safeAreaEdges, ...props }: PageProps) {
  const c = useColors();
  const Container = safeAreaEdges ? SafeAreaView : View;
  return (
    <Container
      {...props}
      {...(safeAreaEdges ? { edges: safeAreaEdges, collapsable: false } : {})}
      style={[styles.page, { backgroundColor: c.bg }, props.style]}>
      {children}
    </Container>
  );
}

export function Card({ children, style, ...props }: ViewProps) {
  const c = useColors();
  return (
    <View {...props} style={[styles.card, { backgroundColor: c.surface, borderColor: c.line }, style]}>
      {children}
    </View>
  );
}

export function Heading({ children, small = false }: { children: React.ReactNode; small?: boolean }) {
  const c = useColors();
  return (
    <Text accessibilityRole="header" style={{ color: c.text, fontSize: small ? 18 : 28, fontWeight: '700', letterSpacing: small ? -0.3 : -0.8 }}>
      {children}
    </Text>
  );
}

export function SectionTitle({ title, detail }: { title: string; detail?: string }) {
  const c = useColors();
  return (
    <View style={styles.sectionTitle}>
      <Text accessibilityRole="header" style={{ color: c.text, fontSize: 19, fontWeight: '700', letterSpacing: -0.35 }}>{title}</Text>
      {detail ? <Text style={{ color: c.muted, fontSize: 13 }}>{detail}</Text> : null}
    </View>
  );
}

export function Label({ children }: { children: React.ReactNode }) {
  const c = useColors();
  return <Text style={{ color: c.muted, fontSize: 13, fontWeight: '600', marginBottom: 7 }}>{children}</Text>;
}

export function Field({ label, style, ...props }: TextInputProps & { label: string }) {
  const c = useColors();
  return (
    <View style={{ gap: 3 }}>
      <Label>{label}</Label>
      <TextInput
        placeholderTextColor={c.muted}
        selectionColor={c.primary}
        {...props}
        style={[styles.input, { color: c.text, backgroundColor: c.surface, borderColor: c.line }, style]}
      />
    </View>
  );
}

export function Button({
  title,
  onPress,
  secondary = false,
  busy = false,
  disabled = false,
  destructive = false,
}: {
  title: string;
  onPress: () => void;
  secondary?: boolean;
  busy?: boolean;
  disabled?: boolean;
  destructive?: boolean;
}) {
  const c = useColors();
  const ink = destructive ? c.red : secondary ? c.primary : '#fff';
  const fill = destructive ? c.surface : secondary ? c.surfaceAlt : c.primary;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: disabled || busy, busy }}
      disabled={disabled || busy}
      onPress={onPress}
      style={({ pressed }) => [styles.button, { backgroundColor: fill, borderColor: destructive ? c.red : 'transparent', borderWidth: destructive ? 1 : 0, opacity: pressed ? 0.8 : disabled ? 0.5 : 1 }]}>
      {busy ? <ActivityIndicator color={ink} /> : <Text style={{ color: ink, fontSize: 15, fontWeight: '700', textAlign: 'center' }}>{title}</Text>}
    </Pressable>
  );
}

export function Chip({ label, selected = false, onPress, accessibilityLabel }: { label: string; selected?: boolean; onPress: () => void; accessibilityLabel?: string }) {
  const c = useColors();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || label}
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [styles.chip, { backgroundColor: selected ? c.primary : c.surface, borderColor: selected ? c.primary : c.line, opacity: pressed ? 0.75 : 1 }]}>
      <Text style={{ color: selected ? '#fff' : c.text, fontWeight: '600', fontSize: 13 }}>{label}</Text>
    </Pressable>
  );
}

export function Notice({ children, danger = false }: { children: React.ReactNode; danger?: boolean }) {
  const c = useColors();
  return <Text accessibilityRole={danger ? 'alert' : 'text'} style={{ color: danger ? c.red : c.green, fontSize: 14, lineHeight: 20 }}>{children}</Text>;
}

export function EmptyState({ title, detail, action }: { title: string; detail?: string; action?: React.ReactNode }) {
  const c = useColors();
  return (
    <Card style={styles.empty}>
      <View style={[styles.emptyMark, { backgroundColor: c.primarySoft }]}><Text style={{ color: c.primary, fontSize: 23, fontWeight: '800' }}>—</Text></View>
      <Text style={{ color: c.text, fontSize: 16, fontWeight: '700', textAlign: 'center' }}>{title}</Text>
      {detail ? <Text style={{ color: c.muted, lineHeight: 20, textAlign: 'center' }}>{detail}</Text> : null}
      {action}
    </Card>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  card: { borderWidth: 1, borderRadius: 22, padding: 18, gap: 12 },
  sectionTitle: { gap: 4 },
  input: { minHeight: 50, borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, fontSize: 16 },
  button: { minHeight: 50, borderRadius: 15, justifyContent: 'center', paddingHorizontal: 16 },
  chip: { minHeight: 38, justifyContent: 'center', paddingVertical: 8, paddingHorizontal: 14, borderWidth: 1, borderRadius: 20 },
  empty: { alignItems: 'center', paddingVertical: 26 },
  emptyMark: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
});
