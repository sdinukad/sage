import 'dart:convert';

typedef Category = String;

class Expense {
  final String id;
  final double amount;
  final Category category;
  final String note;
  final DateTime date;
  final String userId;

  Expense({
    required this.id,
    required this.amount,
    required this.category,
    required this.note,
    required this.date,
    required this.userId,
  });

  factory Expense.fromJson(Map<String, dynamic> json) {
    return Expense(
      id: json['id'] as String,
      amount: (json['amount'] as num).toDouble(),
      category: json['category'] as String,
      note: json['note'] as String? ?? '',
      date: DateTime.parse(json['date'] as String),
      userId: json['user_id'] as String,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'amount': amount,
      'category': category,
      'note': note,
      'date': date.toIso8601String().split('T')[0], // YYYY-MM-DD
      'user_id': userId,
    };
  }

  static List<String> categories = [
    'Food',
    'Transport',
    'Bills',
    'Entertainment',
    'Health',
    'Shopping',
    'Other'
  ];
}
