import React from 'react';
import { ActivityIndicator, Platform, View } from 'react-native';
import { NativeTabs } from 'expo-router/native-tabs';
import { Redirect } from 'expo-router';
import { useAuth } from '../../lib/AuthContext';
import { useColors } from '../../lib/theme';
export default function TabLayout() {
  const { user, loading } = useAuth(); const c = useColors();
  if (loading) return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: c.bg }}><ActivityIndicator color={c.primary} size="large" /></View>;
  if (!user) return <Redirect href="/auth" />;
  return <NativeTabs disableTransparentOnScrollEdge tintColor={c.primary}>
    <NativeTabs.Trigger name="index" disableAutomaticContentInsets={Platform.OS === 'ios'}><NativeTabs.Trigger.Label>Agenda</NativeTabs.Trigger.Label><NativeTabs.Trigger.Icon sf={{ default: 'calendar', selected: 'calendar' }} md="calendar_month" /></NativeTabs.Trigger>
    <NativeTabs.Trigger name="classes" disableAutomaticContentInsets={Platform.OS === 'ios'}><NativeTabs.Trigger.Label>Turmas</NativeTabs.Trigger.Label><NativeTabs.Trigger.Icon sf={{ default: 'person.3', selected: 'person.3.fill' }} md="groups" /></NativeTabs.Trigger>
    <NativeTabs.Trigger name="create" disableAutomaticContentInsets={Platform.OS === 'ios'}><NativeTabs.Trigger.Label>Novo evento</NativeTabs.Trigger.Label><NativeTabs.Trigger.Icon sf={{ default: 'plus.circle', selected: 'plus.circle.fill' }} md="add_circle" /></NativeTabs.Trigger>
    {user?.role === 'admin' && <NativeTabs.Trigger name="users" disableAutomaticContentInsets={Platform.OS === 'ios'}><NativeTabs.Trigger.Label>Utilizadores</NativeTabs.Trigger.Label><NativeTabs.Trigger.Icon sf={{ default: 'person.crop.circle', selected: 'person.crop.circle.fill' }} md="manage_accounts" /></NativeTabs.Trigger>}
  </NativeTabs>;
}
