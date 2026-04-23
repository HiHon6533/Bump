import 'package:flutter/material.dart';
import 'package:cached_network_image/cached_network_image.dart';
import '../main.dart';

class UserDetailScreen extends StatefulWidget {
  final String userId;
  final Map<String, dynamic> userData;
  const UserDetailScreen({super.key, required this.userId, required this.userData});

  @override
  State<UserDetailScreen> createState() => _UserDetailScreenState();
}

class _UserDetailScreenState extends State<UserDetailScreen> {
  late TextEditingController _nameCtrl;
  late TextEditingController _emailCtrl;
  bool _saving = false;
  bool _modified = false;
  Map<String, dynamic> _user = {};

  @override
  void initState() {
    super.initState();
    _user = Map.from(widget.userData);
    _nameCtrl = TextEditingController(text: _user['name'] ?? '');
    _emailCtrl = TextEditingController(text: _user['email'] ?? '');
    _nameCtrl.addListener(() => setState(() => _modified = true));
  }

  @override
  void dispose() {
    _nameCtrl.dispose();
    _emailCtrl.dispose();
    super.dispose();
  }

  Future<void> _saveChanges() async {
    setState(() => _saving = true);
    try {
      await supabase.from('users').update({'name': _nameCtrl.text.trim()}).eq('id', widget.userId);
      setState(() { _modified = false; _saving = false; });
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('✅ Đã lưu thay đổi'), backgroundColor: Colors.green));
        Navigator.pop(context, true);
      }
    } catch (e) {
      setState(() => _saving = false);
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Lỗi: $e'), backgroundColor: Colors.red));
    }
  }

  String _formatDate(String? iso) {
    if (iso == null) return 'Không rõ';
    final d = DateTime.tryParse(iso);
    if (d == null) return iso;
    return '${d.day}/${d.month}/${d.year}';
  }

  Future<void> _toggleBan() async {
    final isBanned = _user['is_banned'] == true;
    final action = isBanned ? 'gỡ BAN' : 'BAN';
    final confirm = await showDialog<bool>(
      context: context,
      builder: (_) => AlertDialog(
        backgroundColor: const Color(0xFF1A1A2E),
        title: Text('Xác nhận $action', style: const TextStyle(color: Colors.white)),
        content: Text('Bạn có chắc muốn $action người dùng "${_user['name']}"?', style: const TextStyle(color: Color(0xFF9CA3AF))),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Hủy')),
          ElevatedButton(
            onPressed: () => Navigator.pop(context, true),
            style: ElevatedButton.styleFrom(backgroundColor: isBanned ? const Color(0xFF10B981) : const Color(0xFFEF4444)),
            child: Text(action, style: const TextStyle(color: Colors.white)),
          ),
        ],
      ),
    );
    if (confirm == true) {
      try {
        await supabase.from('users').update({'is_banned': !isBanned}).eq('id', widget.userId);
        setState(() => _user['is_banned'] = !isBanned);
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(SnackBar(
            content: Text(isBanned ? '✅ Đã gỡ BAN người dùng' : '🚫 Đã BAN người dùng'),
            backgroundColor: isBanned ? Colors.green : Colors.red,
          ));
        }
      } catch (e) {
        if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Lỗi: $e'), backgroundColor: Colors.red));
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final name = _user['name'] ?? 'Không tên';
    final avatar = _user['avatar'] as String?;
    final initial = name.isNotEmpty ? name[0].toUpperCase() : '?';

    return Scaffold(
      appBar: AppBar(
        title: const Text('Chi tiết người dùng', style: TextStyle(fontWeight: FontWeight.w800)),
        actions: [
          if (_modified)
            TextButton.icon(
              icon: _saving ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white)) : const Icon(Icons.check_rounded),
              label: const Text('Lưu'),
              onPressed: _saving ? null : _saveChanges,
              style: TextButton.styleFrom(foregroundColor: Colors.white),
            ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Avatar + basic info
            Center(
              child: Column(
                children: [
                  CircleAvatar(
                    radius: 48,
                    backgroundColor: const Color(0xFF6366F1).withOpacity(0.2),
                    backgroundImage: avatar != null ? CachedNetworkImageProvider(avatar) : null,
                    child: avatar == null ? Text(initial, style: const TextStyle(color: Color(0xFF6366F1), fontSize: 32, fontWeight: FontWeight.w800)) : null,
                  ),
                  const SizedBox(height: 14),
                  Text(name, style: const TextStyle(color: Colors.white, fontSize: 22, fontWeight: FontWeight.w800)),
                  Text(_user['email'] ?? '', style: const TextStyle(color: Color(0xFF9CA3AF), fontSize: 14)),
                  const SizedBox(height: 8),
                  _InfoChip(label: '📅 Tham gia ${_formatDate(_user['created_at'])}'),
                  if (_user['is_banned'] == true)
                    const _InfoChip(label: '🚫 Đã bị BAN', color: Colors.red),
                ],
              ),
            ),
            const SizedBox(height: 28),

            // Ban / Unban button
            SizedBox(
              width: double.infinity,
              height: 48,
              child: ElevatedButton.icon(
                onPressed: () => _toggleBan(),
                icon: Icon(_user['is_banned'] == true ? Icons.lock_open_rounded : Icons.block_rounded),
                label: Text(
                  _user['is_banned'] == true ? 'Gỡ BAN người dùng' : 'BAN người dùng này',
                  style: const TextStyle(fontWeight: FontWeight.w700),
                ),
                style: ElevatedButton.styleFrom(
                  backgroundColor: _user['is_banned'] == true ? const Color(0xFF10B981) : const Color(0xFFEF4444),
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                ),
              ),
            ),

            // Edit section
            _SectionTitle('Chỉnh sửa thông tin'),
            const SizedBox(height: 12),
            _FieldLabel('Tên hiển thị'),
            TextField(
              controller: _nameCtrl,
              style: const TextStyle(color: Colors.white),
              decoration: const InputDecoration(
                hintText: 'Nhập tên mới...',
                hintStyle: TextStyle(color: Color(0xFF9CA3AF)),
                prefixIcon: Icon(Icons.person_outline, color: Color(0xFF6366F1)),
              ),
            ),
            const SizedBox(height: 12),
            _FieldLabel('Email (chỉ đọc)'),
            TextField(
              controller: _emailCtrl,
              enabled: false,
              style: const TextStyle(color: Color(0xFF9CA3AF)),
              decoration: const InputDecoration(
                prefixIcon: Icon(Icons.email_outlined, color: Color(0xFF9CA3AF)),
              ),
            ),
            const SizedBox(height: 28),

            // User ID
            _SectionTitle('Thông tin hệ thống'),
            const SizedBox(height: 12),
            _InfoRow(label: 'User ID', value: widget.userId),
            _InfoRow(label: 'Ngày tạo', value: _formatDate(_user['created_at'])),

            const SizedBox(height: 28),
            // Save button
            if (_modified)
              SizedBox(
                width: double.infinity,
                height: 52,
                child: ElevatedButton.icon(
                  onPressed: _saving ? null : _saveChanges,
                  icon: _saving ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white)) : const Icon(Icons.save_rounded),
                  label: const Text('Lưu thay đổi', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF6366F1),
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }
}

class _SectionTitle extends StatelessWidget {
  final String text;
  const _SectionTitle(this.text);
  @override
  Widget build(BuildContext context) => Text(text, style: const TextStyle(color: Colors.white, fontSize: 15, fontWeight: FontWeight.w700));
}

class _FieldLabel extends StatelessWidget {
  final String text;
  const _FieldLabel(this.text);
  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.only(bottom: 6),
    child: Text(text, style: const TextStyle(color: Color(0xFF9CA3AF), fontSize: 12)),
  );
}

class _InfoRow extends StatelessWidget {
  final String label;
  final String value;
  const _InfoRow({required this.label, required this.value});
  @override
  Widget build(BuildContext context) => Container(
    margin: const EdgeInsets.only(bottom: 8),
    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
    decoration: BoxDecoration(
      color: const Color(0xFF1A1A2E),
      borderRadius: BorderRadius.circular(10),
      border: Border.all(color: const Color(0xFF2D2D4E)),
    ),
    child: Row(
      children: [
        Text(label, style: const TextStyle(color: Color(0xFF9CA3AF), fontSize: 13)),
        const Spacer(),
        Flexible(child: Text(value, style: const TextStyle(color: Colors.white, fontSize: 13), overflow: TextOverflow.ellipsis)),
      ],
    ),
  );
}

class _InfoChip extends StatelessWidget {
  final String label;
  final Color color;
  const _InfoChip({required this.label, this.color = const Color(0xFF6366F1)});
  @override
  Widget build(BuildContext context) => Container(
    margin: const EdgeInsets.only(top: 4),
    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
    decoration: BoxDecoration(
      color: color.withOpacity(0.12),
      borderRadius: BorderRadius.circular(20),
    ),
    child: Text(label, style: TextStyle(color: color, fontSize: 12, fontWeight: FontWeight.w600)),
  );
}
