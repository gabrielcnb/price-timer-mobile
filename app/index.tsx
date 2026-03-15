import { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { useWage } from '../hooks/useWage';

export default function Index() {
  const { wage, loaded } = useWage();

  useEffect(() => {
    if (!loaded) return;
    if (wage !== null) {
      router.replace('/camera');
    } else {
      router.replace('/wage');
    }
  }, [loaded, wage]);

  return (
    <View style={styles.container}>
      <ActivityIndicator color="#ffffff" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
