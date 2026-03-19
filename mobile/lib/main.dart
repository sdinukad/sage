import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:provider/provider.dart';
import 'screens/login_screen.dart';
import 'screens/dashboard_screen.dart';
import 'services/supabase_service.dart';
import 'services/gemini_service.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Load config
  final configString = await rootBundle.loadString('assets/config.json');
  final config = jsonDecode(configString);

  await Supabase.initialize(
    url: config['supabase_url'],
    anonKey: config['supabase_anon_key'],
  );

  runApp(
    MultiProvider(
      providers: [
        Provider<SupabaseService>(create: (_) => SupabaseService()),
        Provider<GeminiService>(
          create: (_) => GeminiService(apiKey: config['gemini_api_key']),
        ),
      ],
      child: const SageApp(),
    ),
  );
}

class SageApp extends StatelessWidget {
  const SageApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Sage',
      theme: ThemeData(
        brightness: Brightness.dark,
        primarySwatch: Colors.teal,
        useMaterial3: true,
        scaffoldBackgroundColor: const Color(0xFF0F172A), // Slate-900
        cardTheme: CardTheme(
          color: const Color(0xFF1E293B), // Slate-800
          elevation: 0,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        ),
      ),
      home: const AuthWrapper(),
    );
  }
}

class AuthWrapper extends StatelessWidget {
  const AuthWrapper({super.key});

  @override
  Widget build(BuildContext context) {
    final supabase = Provider.of<SupabaseService>(context, listen: false);
    return StreamBuilder<AuthState>(
      stream: supabase.client.auth.onAuthStateChange,
      builder: (context, snapshot) {
        if (supabase.currentUser != null) {
          return const DashboardScreen();
        }
        return const LoginScreen();
      },
    );
  }
}
