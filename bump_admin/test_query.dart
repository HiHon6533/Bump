import 'package:supabase/supabase.dart';

Future<void> main() async {
  final supabaseUrl = 'https://xhumayakhvylygqtyihh.supabase.co';
  final supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhodW1heWFraHZ5bHlncXR5aWhoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Mzc1MzQzMSwiZXhwIjoyMDg5MzI5NDMxfQ.wXMrL_b3JBIdEB6haz8PMizk2gn6eh0r8ShCcq2Bh1E';

  final client = SupabaseClient(supabaseUrl, supabaseKey);

  try {
    final data = await client
        .from('reports')
        .select('*, reporter:reporter_id(id, name, avatar), reported_user:reported_user_id(id, name, avatar)')
        .order('created_at', ascending: false);
    print('Data: $data');
  } catch (e) {
    print('Error 1: $e');
  }

  try {
    final data2 = await client
        .from('reports')
        .select('*, reporter:users!reports_reporter_id_fkey(id, name, avatar), reported_user:users!reports_reported_user_id_fkey(id, name, avatar)')
        .order('created_at', ascending: false);
    print('Data 2: $data2');
  } catch (e) {
    print('Error 2: $e');
  }
}
