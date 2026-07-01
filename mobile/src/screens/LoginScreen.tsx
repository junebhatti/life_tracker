import React, { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { supabase } from "../lib/supabase";
import { colors, fonts } from "../theme";

const SUPABASE_URL = (process.env as Record<string, string | undefined>)["EXPO_PUBLIC_SUPABASE_URL"] ?? "";

type Step = "email" | "otp";

export default function LoginScreen() {
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function sendOtp() {
    if (!email.trim()) return;
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.signInWithOtp({ email: email.trim() });
    setLoading(false);
    if (error) {
      setError(error.message);
    } else {
      setStep("otp");
    }
  }

  async function verifyOtp() {
    if (!otp.trim()) return;
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.verifyOtp({
      email: email.trim(),
      token: otp.trim(),
      type: "email",
    });
    setLoading(false);
    if (error) setError(error.message);
    // On success, supabase.auth.onAuthStateChange fires in App.tsx
  }

  return (
    <KeyboardAvoidingView
      style={styles.wrap}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.card}>
        <Text style={styles.wordmark}>Life Tracker</Text>
        <Text style={styles.sub}>Sign in to continue</Text>

        {step === "email" ? (
          <>
            <TextInput
              style={styles.input}
              placeholder="your@email.com"
              placeholderTextColor={colors.textFaint}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
              value={email}
              onChangeText={setEmail}
              onSubmitEditing={sendOtp}
              returnKeyType="send"
            />
            <Pressable
              style={[styles.btn, loading && styles.btnDisabled]}
              onPress={sendOtp}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.btnText}>Send code</Text>
              )}
            </Pressable>
          </>
        ) : (
          <>
            <Text style={styles.hint}>
              Check <Text style={styles.hintBold}>{email}</Text> for a 6-digit code.
            </Text>
            <TextInput
              style={styles.input}
              placeholder="000000"
              placeholderTextColor={colors.textFaint}
              keyboardType="number-pad"
              value={otp}
              onChangeText={setOtp}
              onSubmitEditing={verifyOtp}
              returnKeyType="done"
              maxLength={6}
            />
            <Pressable
              style={[styles.btn, loading && styles.btnDisabled]}
              onPress={verifyOtp}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.btnText}>Verify</Text>
              )}
            </Pressable>
            <Pressable style={styles.back} onPress={() => { setStep("email"); setError(null); }}>
              <Text style={styles.backText}>← Back</Text>
            </Pressable>
          </>
        )}

        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Text style={styles.debug}>{SUPABASE_URL ? `✓ ${SUPABASE_URL.slice(8, 34)}` : "⚠ SUPABASE_URL not set"}</Text>
      </View>
    </KeyboardAvoidingView>
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
  hint: {
    fontFamily: fonts.sans,
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 16,
    lineHeight: 20,
  },
  hintBold: {
    color: colors.textPrimary,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: fonts.sans,
    fontSize: 16,
    color: colors.textPrimary,
    backgroundColor: colors.surface,
    marginBottom: 12,
  },
  btn: {
    backgroundColor: colors.textPrimary,
    borderRadius: 8,
    paddingVertical: 13,
    alignItems: "center",
  },
  btnDisabled: {
    opacity: 0.5,
  },
  btnText: {
    fontFamily: fonts.sansMedium,
    fontSize: 15,
    color: "#fff",
  },
  back: {
    marginTop: 14,
    alignItems: "center",
  },
  backText: {
    fontFamily: fonts.mono,
    fontSize: 11,
    color: colors.textTertiary,
  },
  error: {
    fontFamily: fonts.sans,
    fontSize: 13,
    color: "#dc2626",
    marginTop: 12,
    textAlign: "center",
  },
  debug: {
    fontFamily: fonts.mono,
    fontSize: 9,
    color: colors.textFaint,
    marginTop: 20,
    textAlign: "center",
  },
});
