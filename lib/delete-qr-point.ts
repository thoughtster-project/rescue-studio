import type { SupabaseClient } from '@supabase/supabase-js';

/** Preserve incident history while removing a QR point, using the caller's RLS permissions. */
export async function deleteQRPoint(client: SupabaseClient, pointId: string) {
  const remove = () => client.from('qr_points').delete().eq('id', pointId).select('id');
  let result = await remove();

  if (result.error?.code === '23503') {
    // Only detach the known incident relationship, never delete incident/action history.
    if (!result.error.message.includes('incidents_qr_point_id_fkey')) {
      throw new Error('จุดนี้มีข้อมูลอื่นอ้างอิงอยู่ จึงยังลบไม่ได้');
    }

    const { error } = await client
      .from('incidents')
      .update({ qr_point_id: null })
      .eq('qr_point_id', pointId);

    if (error) {
      throw new Error('ไม่สามารถแยกประวัติแจ้งเหตุออกจากจุด QR ได้: ' + error.message);
    }

    // Recheck on the database: RLS may silently affect zero rows, or a new incident
    // may arrive in between requests. The foreign key still protects these cases.
    result = await remove();
  }

  if (result.error) {
    throw new Error(
      result.error.code === '23503'
        ? 'ยังมีประวัติแจ้งเหตุอ้างอิงจุดนี้อยู่ กรุณาลองใหม่หรือตรวจสิทธิ์แก้ไขประวัติใน Supabase'
        : 'ลบจุดไม่สำเร็จ: ' + result.error.message
    );
  }

  if (!result.data?.some((point) => point.id === pointId)) {
    throw new Error('ฐานข้อมูลไม่ได้ยืนยันการลบ จุดนี้อาจถูกลบไปแล้วหรือคุณไม่มีสิทธิ์ลบ กรุณารีเฟรชและลองใหม่');
  }
}
