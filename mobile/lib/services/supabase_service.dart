import 'package:supabase_flutter/supabase_flutter.dart';
import '../models/expense.dart';

class SupabaseService {
  final SupabaseClient client = Supabase.instance.client;

  // Auth
  Future<AuthResponse> signIn(String email, String password) async {
    return await client.auth.signInWithPassword(email: email, password: password);
  }

  Future<AuthResponse> signUp(String email, String password) async {
    return await client.auth.signUp(email: email, password: password);
  }

  Future<void> signOut() async {
    await client.auth.signOut();
  }

  User? get currentUser => client.auth.currentUser;

  // Expenses CRUD
  Future<List<Expense>> getExpenses() async {
    final response = await client
        .from('expenses')
        .select()
        .order('date', ascending: false);
    
    return (response as List).map((json) => Expense.fromJson(json)).toList();
  }

  Future<List<Expense>> getRecentExpenses({int limit = 10}) async {
    final response = await client
        .from('expenses')
        .select()
        .order('date', ascending: false)
        .limit(limit);
    
    return (response as List).map((json) => Expense.fromJson(json)).toList();
  }

  Future<void> addExpense(Expense expense) async {
    await client.from('expenses').insert(expense.toJson());
  }

  Future<void> updateExpense(String id, Map<String, dynamic> changes) async {
    await client.from('expenses').update(changes).eq('id', id);
  }

  Future<void> deleteExpense(String id) async {
    await client.from('expenses').delete().eq('id', id);
  }

  Future<double> getMonthlyTotal() async {
    final now = DateTime.now();
    final firstDay = DateTime(now.year, now.month, 1);
    final lastDay = DateTime(now.year, now.month + 1, 0);

    final response = await client
        .from('expenses')
        .select('amount')
        .gte('date', firstDay.toIso8601String().split('T')[0])
        .lte('date', lastDay.toIso8601String().split('T')[0]);

    double total = 0;
    for (var item in (response as List)) {
      total += (item['amount'] as num).toDouble();
    }
    return total;
  }

  Future<Map<String, double>> getTotalsByCategory() async {
    final expenses = await getExpenses(); // Or use a view if available
    final totals = <String, double>{};

    for (var expense in expenses) {
      totals[expense.category] = (totals[expense.category] ?? 0) + expense.amount;
    }
    return totals;
  }
}
