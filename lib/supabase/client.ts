import { createClient } from "@supabase/supabase-js";

/**
 * Supabase client สำหรับใช้ฝั่ง Browser (Client Components)
 *
 * ทำไมต้องแยกไฟล์นี้ออกมา?
 * - เราต้องการ instance เดียว (singleton) ที่ใช้ร่วมกันทั้งแอป
 *   แทนที่จะสร้าง client ใหม่ทุกครั้งที่ import เพราะแต่ละ instance
 *   จะแยก auth session / realtime connection กัน ทำให้ state ไม่ sync กัน
 * - ทำให้ import ใช้งานได้ง่ายจากทุกที่: `import { supabase } from "@/lib/supabase/client"`
 *
 * ข้อจำกัดของไฟล์นี้ (สำคัญ ต้องรู้ไว้):
 * - ไฟล์นี้ใช้ @supabase/supabase-js ตรง ๆ ซึ่งเก็บ session ไว้ใน
 *   localStorage ของ browser เท่านั้น "ใช้ได้แค่ฝั่ง Client Component"
 * - ห้าม import ไฟล์นี้ไปใช้ใน Server Component, Route Handler, หรือ
 *   Middleware เพราะฝั่ง server จะมองไม่เห็น session ที่เก็บใน localStorage
 *   ของ browser เลย (คนละ context กัน) ทำให้ auth เพี้ยน/หลุด session
 * - เมื่อไหร่ที่ต้องอ่าน user/session ฝั่ง server (เช่น เช็คสิทธิ์ก่อน
 *   render หน้า dashboard, หรือใน middleware ป้องกันเส้นทาง) จะต้องใช้
 *   แพ็กเกจ `@supabase/ssr` แยกต่างหาก ซึ่งอ่าน/เขียน session ผ่าน cookies
 *   แทน — ตอนนี้ยังไม่ได้ติดตั้งให้ เพราะ scope งานนี้ระบุแค่ supabase-js
 *   แต่ควรเพิ่มก่อนเริ่มทำระบบ Auth จริงจัง
 */

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Missing Supabase environment variables. ตรวจสอบว่ามีไฟล์ .env.local " +
      "และตั้งค่า NEXT_PUBLIC_SUPABASE_URL กับ NEXT_PUBLIC_SUPABASE_ANON_KEY " +
      "ครบถ้วน (ดูตัวอย่างใน .env.example)"
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // เก็บ session ไว้ให้ user ไม่ต้อง login ใหม่ทุกครั้งที่ปิด browser
    persistSession: true,
    // refresh token อัตโนมัติก่อนหมดอายุ ไม่ต้องเขียน logic เอง
    autoRefreshToken: true,
  },
});
