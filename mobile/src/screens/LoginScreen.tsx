"use client";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { supabase } from "../lib/supabase";
import { colors, fonts } from "../theme";

export default function LoginScreen() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function signInWithGoogle() {
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: typeof window !== "undefined" ? window.location.origin : "",
        skipBrowserRedirect: false,
      },
    });
    setLoading(false);
    if (error) setError(error.message);
  }

  return (
    <View style={styles.wrap}>
      <View style={styles.card}>
        <Text style={styles.wordmark}>Life Tracker</Text>
        <Text style={styles.sub}>Sign in to continue</Text>

        <Pressable
          style={[styles.btn, loading && styles.btnDisabled]}
          onPress={signInWithGoogle}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={colors.textPrimary} />
          ) : (
            <View style={styles.btnInner}>
              <GoogleIcon />
              <Text style={styles.btnText}>Continue with Google</Text>
            </View>
          )}
        </Pressable>

        {error ? <Text style={styles.error}>{error}</Text> : null}
      </View>
    </View>
  );
}

function GoogleIcon() {
  return (
    <Text style={styles.gIcon}>G</Text>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  card: {
    width: "100%",
    maxWidth: 360,
  },
  wordmark: {
    fontFamily: fonts.serif,
    fontSize: 28,
    color: colors.textPrimary,
    marginBottom: 6,
  },
  sub: {
    fontFamily: fonts.mono,
    fontSize: 11,
    letterSpacing: 1,
    textTransform: "uppercase",
    color: colors.textSecondary,
    marginBottom: 32,
  },
  btn: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingVertical: 13,
    alignItems: "center",
    backgroundColor: colors.surface,
  },
  btnDisabled: {
    opacity: 0.5,
  },
  btnInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  gIcon: {
    fontFamily: fonts.sansMedium,
    fontSize: 15,
    color: "#4285F4",
    fontWeight: "700",
  },
  btnText: {
    fontFamily: fonts.sansMedium,
    fontSize: 15,
    color: colors.textPrimary,
  },
  error: {
    fontFamily: fonts.sans,
    fontSize: 13,
    color: "#dc2626",
    marginTop: 12,
    textAlign: "center",
  },
});
