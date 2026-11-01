import React, { useState } from 'react';
import { Alert, Linking, Pressable, Text, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { Button, Heading, Page } from '../components/UI';
import { useColors } from '../lib/theme';

function readPairingToken(value: string) {
  let token = value.trim();
  try {
    const url = new URL(token);
    token = url.searchParams.get('tv-pair') || '';
  } catch {
    // The QR may contain the secure pairing token directly.
  }
  return /^[A-Za-z0-9_-]{43}$/.test(token) ? token : null;
}

export default function QrScanner() {
  const c = useColors();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [requesting, setRequesting] = useState(false);

  const request = async () => {
    setRequesting(true);
    try {
      const result = await requestPermission();
      if (!result.granted && !result.canAskAgain) Alert.alert('Permissão necessária', 'Ativa o acesso à câmara nas definições do iPhone para ler o código da TV.', [{ text: 'Cancelar', style: 'cancel' }, { text: 'Abrir definições', onPress: () => void Linking.openSettings() }]);
    } finally { setRequesting(false); }
  };

  if (!permission?.granted) return (
    <Page safeAreaEdges={['top', 'bottom', 'left', 'right']}>
      <View style={{ flex: 1, justifyContent: 'center', padding: 24, gap: 16 }}>
        <View style={{ width: 54, height: 54, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: c.primarySoft }}><SymbolView name={{ ios: 'qrcode.viewfinder', android: 'qr_code_scanner', web: 'qr_code_scanner' }} size={24} tintColor={c.primary} /></View>
        <Heading>Permitir acesso à câmara</Heading>
        <Text style={{ color: c.muted, fontSize: 15, lineHeight: 23 }}>A câmara só é usada para ler o código seguro apresentado no ecrã da TV.</Text>
        <Button title="Permitir câmara" onPress={() => void request()} busy={requesting} />
        <Pressable accessibilityRole="button" onPress={() => router.back()}><Text style={{ color: c.primary, textAlign: 'center', padding: 8, fontWeight: '700' }}>Agora não</Text></Pressable>
      </View>
    </Page>
  );

  return (
    <Page safeAreaEdges={['top', 'bottom', 'left', 'right']}>
      <View style={{ flex: 1, padding: 20, gap: 12 }}>
        <View style={{ gap: 5 }}><Text style={{ color: c.primary, fontSize: 11, fontWeight: '800', letterSpacing: 1.5 }}>LIGAÇÃO SEGURA</Text><Heading>Ligar à TV</Heading><Text style={{ color: c.muted, lineHeight: 21 }}>Aponta a câmara ao QR apresentado na TV. O código expira ao fim de alguns minutos.</Text></View>
        <View style={{ flex: 1, minHeight: 240, overflow: 'hidden', borderRadius: 26, backgroundColor: '#11141C' }}>
          <CameraView
            style={{ flex: 1 }}
            facing="back"
            barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
            onBarcodeScanned={scanned ? undefined : ({ data }) => {
              setScanned(true);
              const token = readPairingToken(data);
              if (!token) {
                Alert.alert('Código inválido', 'Este QR não parece ser um código de ligação da TV.', [{ text: 'Tentar novamente', onPress: () => setScanned(false) }]);
                return;
              }
              router.replace({ pathname: '/pairing', params: { token } });
            }}
          />
          <View pointerEvents="none" style={{ position: 'absolute', top: '50%', left: '50%', width: 214, height: 214, marginLeft: -107, marginTop: -107, borderWidth: 3, borderColor: '#FFFFFF', borderRadius: 26 }}>
            <View style={{ position: 'absolute', top: -3, left: 36, right: 36, height: 3, backgroundColor: c.primary }} />
          </View>
        </View>
        <View style={{ alignItems: 'center', gap: 8, paddingBottom: 4 }}><Text style={{ color: c.muted, textAlign: 'center' }}>Mantém o QR dentro da moldura e aguarda a leitura.</Text><Pressable accessibilityRole="button" onPress={() => router.back()}><Text style={{ color: c.primary, fontWeight: '700', padding: 8 }}>Cancelar</Text></Pressable></View>
      </View>
    </Page>
  );
}
