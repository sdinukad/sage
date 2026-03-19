import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import '../services/supabase_service.dart';
import '../services/gemini_service.dart';
import '../models/expense.dart';

class ChatScreen extends StatefulWidget {
  const ChatScreen({super.key});

  @override
  State<ChatScreen> createState() => _ChatScreenState();
}

enum ChatMode { ask, edit }

class _ChatScreenState extends State<ChatScreen> {
  ChatMode _mode = ChatMode.ask;
  final _controller = TextEditingController();
  final List<Map<String, dynamic>> _messages = [];
  bool _isLoading = false;

  // For Edit Confirmations
  String? _pendingExpenseId;
  Map<String, dynamic>? _pendingChanges;
  String? _pendingText;

  void _sendMessage() async {
    final text = _controller.text.trim();
    if (text.isEmpty) return;

    setState(() {
      _messages.add({'role': 'user', 'text': text});
      _isLoading = true;
      _controller.clear();
    });

    final supabase = Provider.of<SupabaseService>(context, listen: false);
    final gemini = Provider.of<GeminiService>(context, listen: false);
    final expenses = await supabase.getExpenses();

    if (_mode == ChatMode.ask) {
      final result = await gemini.parseNaturalQuery(text, expenses);
      setState(() {
        _messages.add({
          'role': 'ai',
          'text': result['answer'],
          'matchedIds': result['matchedIds']
        });
        _isLoading = false;
      });
    } else {
      final result = await gemini.parseEditIntent(text, expenses);
      setState(() {
        _pendingExpenseId = result['expenseId'];
        _pendingChanges = result['changes'];
        _pendingText = result['confirmationText'];
        _isLoading = false;
      });
    }
  }

  void _confirmEdit() async {
    if (_pendingExpenseId == null || _pendingChanges == null) return;
    final supabase = Provider.of<SupabaseService>(context, listen: false);
    await supabase.updateExpense(_pendingExpenseId!, _pendingChanges!);
    setState(() {
      _messages.add({'role': 'ai', 'text': 'Done! I\'ve updated that for you.'});
      _pendingExpenseId = null;
      _pendingChanges = null;
      _pendingText = null;
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Sage AI'),
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(50),
          child: Padding(
            padding: const EdgeInsets.only(bottom: 8),
            child: SegmentedButton<ChatMode>(
              segments: const [
                ButtonSegment(value: ChatMode.ask, label: Text('Ask'), icon: Icon(Icons.help_outline)),
                ButtonSegment(value: ChatMode.edit, label: Text('Edit'), icon: Icon(Icons.edit_note)),
              ],
              selected: {_mode},
              onSelectionChanged: (set) => setState(() => _mode = set.first),
            ),
          ),
        ),
      ),
      body: Column(
        children: [
          Expanded(
            child: ListView.builder(
              padding: const EdgeInsets.all(16),
              itemCount: _messages.length,
              itemBuilder: (context, index) {
                final m = _messages[index];
                return _buildMessageBubble(m);
              },
            ),
          ),
          if (_pendingText != null) _buildConfirmationCard(),
          if (_isLoading) const Padding(padding: EdgeInsets.all(8.0), child: CircularProgressIndicator()),
          _buildInputArea(),
        ],
      ),
    );
  }

  Widget _buildMessageBubble(Map<String, dynamic> m) {
    final isUser = m['role'] == 'user';
    return Align(
      alignment: isUser ? Alignment.centerRight : Alignment.centerLeft,
      child: Container(
        margin: const EdgeInsets.symmetric(vertical: 4),
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: isUser ? Colors.teal : Colors.grey[800],
          borderRadius: BorderRadius.circular(12),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(m['text']),
            if (m['matchedIds'] != null && (m['matchedIds'] as List).isNotEmpty)
              _buildMatchedExpenses(List<String>.from(m['matchedIds'])),
          ],
        ),
      ),
    );
  }

  Widget _buildMatchedExpenses(List<String> ids) {
    // This would ideally fetch these specific expenses, but for now we filter from local state if available.
    // In a real app, you'd probably have a Provider holding the expense list.
    return const SizedBox.shrink(); // Simplified for now
  }

  Widget _buildConfirmationCard() {
    return Card(
      margin: const EdgeInsets.all(16),
      color: Colors.yellow[900]!.withOpacity(0.3),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            Text(_pendingText!, style: const TextStyle(fontWeight: FontWeight.bold)),
            const SizedBox(height: 16),
            Row(
              mainAxisAlignment: MainAxisAlignment.end,
              children: [
                TextButton(
                  onPressed: () => setState(() => _pendingText = null),
                  child: const Text('Cancel', style: TextStyle(color: Colors.red)),
                ),
                ElevatedButton(
                  onPressed: _confirmEdit,
                  style: ElevatedButton.styleFrom(backgroundColor: Colors.green),
                  child: const Text('Confirm'),
                ),
              ],
            )
          ],
        ),
      ),
    );
  }

  Widget _buildInputArea() {
    return Padding(
      padding: const EdgeInsets.all(16),
      child: Row(
        children: [
          Expanded(
            child: TextField(
              controller: _controller,
              decoration: InputDecoration(
                hintText: _mode == ChatMode.ask ? 'Ask about your expenses...' : 'e.g. Change Uber to 1200',
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(30)),
              ),
              onSubmitted: (_) => _sendMessage(),
            ),
          ),
          const SizedBox(width: 8),
          FloatingActionButton.small(
            onPressed: _sendMessage,
            child: const Icon(Icons.send),
          ),
        ],
      ),
    );
  }
}
