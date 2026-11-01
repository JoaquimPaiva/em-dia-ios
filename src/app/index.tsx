import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Redirect } from 'expo-router';
import { useAuth } from '../lib/AuthContext';
import { useColors } from '../lib/theme';
export default function Index() { const { user, loading } = useAuth(); const c = useColors(); if (loading) return <View style={{ flex: 1, backgroundColor: c.bg, alignItems: 'center', justifyContent: 'center' }}><ActivityIndicator color={c.primary} size="large" /></View>; return <Redirect href={user ? '/(tabs)' : '/auth'} />; }
