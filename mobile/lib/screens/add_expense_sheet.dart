import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import 'package:uuid/uuid.dart';
import '../services/supabase_service.dart';
import '../services/gemini_service.dart';
import '../models/expense.dart';

class AddExpenseSheet extends StatefulWidget {
  const AddExpenseSheet({super.key});

  @override
  State<AddExpenseSheet> createState() => _AddExpenseSheetState();
}

class _AddExpenseSheetState extends State<AddExpenseSheet> {
  final _amountController = TextEditingController();
  final _noteController = TextEditingController();
  String _selectedCategory = 'Other';
  DateTime _selectedDate = DateTime.now();
  String? _aiSuggestion;
  bool _isCategorising = false;

  void _onNoteFocusLost() async {
    if (_noteController.text.isEmpty) return;
    setState(() => _isCategorising = true);
    final gemini = Provider.of<GeminiService>(context, listen: false);
    final suggestion = await gemini.categoriseExpense(_noteController.text);
    if (mounted) {
      setState(() {
        _aiSuggestion = suggestion;
        _isCategorising = false;
      });
    }
  }

  void _save() async {
    final amount = double.tryParse(_amountController.text);
    if (amount == null) return;

    final supabase = Provider.of<SupabaseService>(context, listen: false);
    final expense = Expense(
      id: const Uuid().v4(),
      amount: amount,
      category: _selectedCategory,
      note: _noteController.text,
      date: _selectedDate,
      userId: supabase.currentUser!.id,
    );

    await supabase.addExpense(expense);
    if (mounted) Navigator.pop(context);
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.only(
        bottom: MediaQuery.of(context).viewInsets.bottom,
        left: 24,
        right: 24,
        top: 24,
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const Text('Add Expense', style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
          const SizedBox(height: 16),
          Focus(
            onFocusChange: (hasFocus) {
              if (!hasFocus) _onNoteFocusLost();
            },
            child: TextField(
              controller: _noteController,
              decoration: const InputDecoration(labelText: 'Note (e.g. Starbucks coffee)'),
            ),
          ),
          if (_isCategorising)
            const LinearProgressIndicator()
          else if (_aiSuggestion != null)
            Padding(
              padding: const EdgeInsets.symmetric(vertical: 8),
              child: ActionChip(
                avatar: const Icon(Icons.auto_awesome, size: 16),
                label: Text('AI: $_aiSuggestion'),
                onPressed: () {
                  setState(() {
                    _selectedCategory = _aiSuggestion!;
                    _aiSuggestion = null;
                  });
                },
                onDeleted: () => setState(() => _aiSuggestion = null),
              ),
            ),
          const SizedBox(height: 16),
          TextField(
            controller: _amountController,
            decoration: const InputDecoration(labelText: 'Amount', prefixText: '\$'),
            keyboardType: TextInputType.number,
          ),
          const SizedBox(height: 16),
          DropdownButtonFormField<String>(
            value: _selectedCategory,
            items: Expense.categories.map((c) => DropdownMenuItem(value: c, child: Text(c))).toList(),
            onChanged: (val) => setState(() => _selectedCategory = val!),
            decoration: const InputDecoration(labelText: 'Category'),
          ),
          const SizedBox(height: 16),
          ListTile(
            title: Text('Date: ${DateFormat.yMMMd().format(_selectedDate)}'),
            trailing: const Icon(Icons.calendar_today),
            onTap: () async {
              final picked = await showDatePicker(
                context: context,
                initialDate: _selectedDate,
                firstDate: DateTime(2000),
                lastDate: DateTime(2100),
              );
              if (picked != null) setState(() => _selectedDate = picked);
            },
          ),
          const SizedBox(height: 24),
          ElevatedButton(onPressed: _save, child: const Text('Save Expense')),
          const SizedBox(height: 24),
        ],
      ),
    );
  }
}
