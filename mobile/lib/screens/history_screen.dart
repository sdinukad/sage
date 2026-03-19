import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import '../services/supabase_service.dart';
import '../models/expense.dart';

class HistoryScreen extends StatefulWidget {
  const HistoryScreen({super.key});

  @override
  State<HistoryScreen> createState() => _HistoryScreenState();
}

class _HistoryScreenState extends State<HistoryScreen> {
  String? _selectedCategory;
  int _selectedMonth = DateTime.now().month;
  int _selectedYear = DateTime.now().year;

  List<Expense> _allExpenses = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _fetchExpenses();
  }

  void _fetchExpenses() async {
    setState(() => _isLoading = true);
    final supabase = Provider.of<SupabaseService>(context, listen: false);
    final expenses = await supabase.getExpenses();
    if (mounted) {
      setState(() {
        _allExpenses = expenses;
        _isLoading = false;
      });
    }
  }

  List<Expense> get _filteredExpenses {
    return _allExpenses.where((e) {
      final matchCategory = _selectedCategory == null || e.category == _selectedCategory;
      final matchMonth = e.date.month == _selectedMonth && e.date.year == _selectedYear;
      return matchCategory && matchMonth;
    }).toList();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('History')),
      body: Column(
        children: [
          _buildFilters(),
          Expanded(
            child: _isLoading
                ? const Center(child: CircularProgressIndicator())
                : _filteredExpenses.isEmpty
                    ? const Center(child: Text('No expenses found'))
                    : ListView.builder(
                        itemCount: _filteredExpenses.length,
                        itemBuilder: (context, index) {
                          final e = _filteredExpenses[index];
                          return Dismissible(
                            key: Key(e.id),
                            direction: DismissDirection.endToStart,
                            background: Container(
                              color: Colors.red,
                              alignment: Alignment.centerRight,
                              padding: const EdgeInsets.only(right: 20),
                              child: const Icon(Icons.delete, color: Colors.white),
                            ),
                            onDismissed: (_) async {
                              final supabase = Provider.of<SupabaseService>(context, listen: false);
                              await supabase.deleteExpense(e.id);
                              ScaffoldMessenger.of(context).showSnackBar(
                                SnackBar(
                                  content: const Text('Expense deleted'),
                                  action: SnackBarAction(
                                    label: 'Undo',
                                    onPressed: () async => await supabase.addExpense(e),
                                  ),
                                ),
                              );
                              _fetchExpenses();
                            },
                            child: ListTile(
                              title: Text(e.note.isEmpty ? e.category : e.note),
                              subtitle: Text(DateFormat.yMMMd().format(e.date)),
                              trailing: Text(
                                NumberFormat.simpleCurrency().format(e.amount),
                                style: const TextStyle(fontWeight: FontWeight.bold),
                              ),
                            ),
                          );
                        },
                      ),
          ),
        ],
      ),
    );
  }

  Widget _buildFilters() {
    return Padding(
      padding: const EdgeInsets.all(16.0),
      child: Column(
        children: [
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: Row(
              children: [
                FilterChip(
                  label: const Text('All'),
                  selected: _selectedCategory == null,
                  onSelected: (_) => setState(() => _selectedCategory = null),
                ),
                ...Expense.categories.map((c) => Padding(
                      padding: const EdgeInsets.only(left: 8),
                      child: FilterChip(
                        label: Text(c),
                        selected: _selectedCategory == c,
                        onSelected: (_) => setState(() => _selectedCategory = c),
                      ),
                    )),
              ],
            ),
          ),
          const SizedBox(height: 8),
          Row(
            children: [
              Expanded(
                child: DropdownButton<int>(
                  value: _selectedMonth,
                  items: List.generate(12, (i) => i + 1)
                      .map((m) => DropdownMenuItem(
                            value: m,
                            child: Text(DateFormat('MMMM').format(DateTime(2024, m))),
                          ))
                      .toList(),
                  onChanged: (val) => setState(() => _selectedMonth = val!),
                ),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: DropdownButton<int>(
                  value: _selectedYear,
                  items: [2024, 2025, 2026]
                      .map((y) => DropdownMenuItem(value: y, child: Text(y.toString())))
                      .toList(),
                  onChanged: (val) => setState(() => _selectedYear = val!),
                ),
              ),
            ],
          )
        ],
      ),
    );
  }
}
