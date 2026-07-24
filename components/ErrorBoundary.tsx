import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface State {
  hasError: boolean;
}

/**
 * Catches render errors in the component tree so the whole app
 * doesn't crash — shows a recovery UI instead.
 */
export default class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ErrorBoundary] Caught render error:', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <View style={styles.container}>
          <Text style={styles.title}>Something went wrong</Text>
          <Text style={styles.sub}>Pull down to refresh or restart the app</Text>
          <TouchableOpacity
            style={styles.btn}
            onPress={() => this.setState({ hasError: false })}
          >
            <Text style={styles.btnText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0c1b31',
    padding: 24,
    gap: 12,
  },
  title:   { color: '#F2E6CF', fontSize: 18, fontWeight: '700', textAlign: 'center' },
  sub:     { color: '#5F6773', fontSize: 14, textAlign: 'center' },
  btn:     { marginTop: 8, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8, backgroundColor: '#D95C17' },
  btnText: { color: '#fff', fontSize: 14, fontWeight: '600' },
});
