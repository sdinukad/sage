import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:fl_chart/fl_chart.dart';
import 'package:intl/intl.dart';
import '../services/supabase_service.dart';
import '../models/expense.dart';
import 'history_screen.dart';
import 'chat_screen.dart';
import 'add_expense_sheet.dart';

class DashboardScreen extends StatefulWidget {
  const DashboardScreen({super.key});

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  int _currentIndex = 0;

  @override
  Widget build(BuildContext context) {
    final screens = [
      const DashboardHome(),
      const HistoryScreen(),
      const ChatScreen(),
    ];

    return Scaffold(
      body: IndexedStack(
        index: _currentIndex,
        children: screens,
      ),
      bottomNavigationBar: BottomNavigationBar(
        currentIndex: _currentIndex,
        onTap: (index) => setState(() => _currentIndex = index),
        items: const [
          BottomNavigationBarItem(icon: Icon(Icons.dashboard), label: 'Dashboard'),
          BottomNavigationBarItem(icon: Icon(Icons.history), label: 'History'),
          BottomNavigationBarItem(icon: Icon(Icons.auto_awesome), label: 'AI Chat'),
        ],
      ),
    );
  }
}

class DashboardHome extends StatefulWidget {
  const DashboardHome({super.key});

  @override
  State<DashboardHome> createState() => _DashboardHomeState();
}

class _DashboardHomeState extends State<DashboardHome> {
  late Future<double> _monthlyTotal;
  late Future<List<Expense>> _recentExpenses;
  late Future<Map<String, double>> _categoryTotals;

  @override
  void initState() {
    super.initState();
    _refresh();
  }

  void _refresh() {
    final supabase = Provider.of<SupabaseService>(context, listen: false);
    setState(() {
      _monthlyTotal = supabase.getMonthlyTotal();
      _recentExpenses = supabase.getRecentExpenses();
      _categoryTotals = supabase.getTotalsByCategory();
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Sage'),
        actions: [
          IconButton(
            icon: const Icon(Icons.logout),
            onPressed: () => Provider.of<SupabaseService>(context, listen: false).signOut(),
          )
        ],
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: () async {
          await showModalBottomSheet(
            context: context,
            isScrollControlled: true,
            builder: (_) => const AddExpenseSheet(),
          );
          _refresh();
        },
        child: const Icon(Icons.add),
      ),
      body: RefreshIndicator(
        onRefresh: () async => _refresh(),
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              _buildMonthlyTotalCard(),
              const SizedBox(height: 24),
              const Text('Spending Breakdown', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
              const SizedBox(height: 16),
              _buildPieChart(),
              const SizedBox(height: 24),
              const Text('Recent Expenses', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
              const SizedBox(height: 16),
              _buildRecentList(),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildMonthlyTotalCard() {
    return FutureBuilder<double>(
      future: _monthlyTotal,
      builder: (context, snapshot) {
        final total = snapshot.data ?? 0.0;
        return Card(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              children: [
                const Text('This Month', style: TextStyle(color: Colors.white70)),
                const SizedBox(height: 8),
                Text(
                  NumberFormat.simpleCurrency().format(total),
                  style: const TextStyle(fontSize: 32, fontWeight: FontWeight.bold),
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _buildPieChart() {
    return FutureBuilder<Map<String, double>>(
      future: _categoryTotals,
      builder: (context, snapshot) {
        if (!snapshot.hasData || snapshot.data!.isEmpty) {
          return const Center(child: Text('No data for chart'));
        }
        final data = snapshot.data!;
        return SizedBox(
          height: 200,
          child: PieChart(
            PieChartData(
              sections: data.entries.map((e) {
                return PieChartSectionData(
                  value: e.value,
                  title: e.key,
                  radius: 50,
                  titleStyle: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold),
                  color: _getCategoryColor(e.key),
                );
              }).toList(),
            ),
          ),
        );
      },
    );
  }

  Widget _buildRecentList() {
    return FutureBuilder<List<Expense>>(
      future: _recentExpenses,
      builder: (context, snapshot) {
        if (!snapshot.hasData) return const CircularProgressIndicator();
        final expenses = snapshot.data!;
        return ListView.builder(
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          itemCount: expenses.length,
          itemBuilder: (context, index) {
            final e = expenses[index];
            return ListTile(
              leading: CircleAvatar(
                backgroundColor: _getCategoryColor(e.category).withOpacity(0.2),
                child: Icon(_getCategoryIcon(e.category), color: _getCategoryColor(e.category)),
              ),
              title: Text(e.note.isEmpty ? e.category : e.note),
              subtitle: Text(DateFormat.yMMMd().format(e.date)),
              trailing: Text(
                NumberFormat.simpleCurrency().format(e.amount),
                style: const TextStyle(fontWeight: FontWeight.bold),
              ),
            );
          },
        );
      },
    );
  }

  Color _getCategoryColor(String category) {
    switch (category) {
      case 'Food': return Colors.orange;
      case 'Transport': return Colors.blue;
      case 'Bills': return Colors.red;
      case 'Entertainment': return Colors.purple;
      case 'Health': return Colors.green;
      case 'Shopping': return Colors.pink;
      default: return Colors.grey;
    }
  }

  IconData _getCategoryIcon(String category) {
    switch (category) {
      case 'Food': return Icons.restaurant;
      case 'Transport': return Icons.directions_car;
      case 'Bills': return Icons.receipt;
      case 'Entertainment': return Icons.movie;
      case 'Health': return Icons.medical_services;
      case 'Shopping': return Icons.shopping_bag;
      default: return Icons.more_horiz;
    }
  }
}
