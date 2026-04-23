const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = 'https://xhumayakhvylygqtyihh.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhodW1heWFraHZ5bHlncXR5aWhoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Mzc1MzQzMSwiZXhwIjoyMDg5MzI5NDMxfQ.wXMrL_b3JBIdEB6haz8PMizk2gn6eh0r8ShCcq2Bh1E';

const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  const { data, error } = await supabase
    .from('reports')
    // First try the app's query
    .select('*, reporter:reporter_id(id, name, avatar), reported_user:reported_user_id(id, name, avatar)')
    .order('created_at', { ascending: false });
  console.log('Original Query Error:', error?.message || 'No error');
  console.log('Original Query Data:', data);

  if (error) {
    const { data: d2, error: e2 } = await supabase
      .from('reports')
      .select('*, reporter:users!reports_reporter_id_fkey(id, name, avatar), reported_user:users!reports_reported_user_id_fkey(id, name, avatar)')
      .order('created_at', { ascending: false });
    console.log('Fixed Query Error:', e2?.message || 'No error');
    console.log('Fixed Query Data:', d2);
  }
}
test();
