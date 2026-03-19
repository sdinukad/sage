import 'dart:convert';
import 'package:http/http.dart' as http;
import '../models/expense.dart';

class GeminiService {
  final String apiKey;
  final String model = 'gemini-2.0-flash';

  GeminiService({required this.apiKey});

  String get _baseUrl =>
      'https://generativelanguage.googleapis.com/v1beta/models/$model:generateContent?key=$apiKey';

  Future<dynamic> _callGemini(String prompt, {bool isJson = true}) async {
    try {
      final response = await http.post(
        Uri.parse(_baseUrl),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'contents': [
            {
              'parts': [
                {'text': prompt}
              ]
            }
          ],
          if (isJson)
            'generationConfig': {'response_mime_type': 'application/json'}
        }),
      );

      if (response.statusCode != 200) {
        throw Exception('Gemini API error: ${response.reasonPhrase}');
      }

      final data = jsonDecode(response.body);
      final text = data['candidates'][0]['content']['parts'][0]['text'];
      
      if (isJson) {
        return jsonDecode(text);
      }
      return text;
    } catch (e) {
      print('GeminiService Error: $e');
      return null;
    }
  }

  Future<String> categoriseExpense(String note) async {
    final prompt =
        'Given this expense description, return ONLY one of these categories with no other text: Food, Transport, Bills, Entertainment, Health, Shopping, Other. Description: $note';

    final text = await _callGemini(prompt, isJson: false);
    if (text == null) return 'Other';
    
    final category = text.trim();
    if (Expense.categories.contains(category)) {
      return category;
    }
    return 'Other';
  }

  Future<Map<String, dynamic>> parseNaturalQuery(
      String query, List<Expense> expenses) async {
    final expensesJson = expenses.map((e) => e.toJson()).toList();
    final prompt = '''
You are an expense assistant. Answer the user's question using only the provided expense data. Return ONLY this JSON:
{ "answer": string, "matchedIds": string[] }
Expenses: ${jsonEncode(expensesJson)}
Question: $query
''';

    final result = await _callGemini(prompt);
    if (result == null) {
      return {
        'answer': "Sorry, I couldn't understand that.",
        'matchedIds': []
      };
    }
    return {
      'answer': result['answer'] ?? "Sorry, I couldn't understand that.",
      'matchedIds': result['matchedIds'] ?? []
    };
  }

  Future<Map<String, dynamic>> parseEditIntent(
      String message, List<Expense> expenses) async {
    final expensesJson = expenses.map((e) => e.toJson()).toList();
    final prompt = '''
You are an expense editor. Identify which expense the user wants to edit and what changes to make. Return ONLY this JSON:
{
  "expenseId": string or null,
  "changes": { "amount"?: number, "category"?: string, "date"?: ISO string, "note"?: string } or null,
  "confirmationText": string
}
If unclear, set expenseId and changes to null, ask for clarification in confirmationText.
Expenses: ${jsonEncode(expensesJson)}
Message: $message
''';

    final result = await _callGemini(prompt);
    if (result == null) {
      return {
        'expenseId': null,
        'changes': null,
        'confirmationText': "Sorry, I couldn't parse your edit request."
      };
    }
    return {
      'expenseId': result['expenseId'],
      'changes': result['changes'],
      'confirmationText': result['confirmationText'] ?? "I'm not sure what you want to change."
    };
  }
}
