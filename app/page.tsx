export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-slate-950 px-6 text-center">
      <span className="mb-4 rounded-full border border-red-500/30 bg-red-500/10 px-4 py-1 text-sm font-medium text-red-400">
        Emergency Response Platform
      </span>
      <h1 className="text-4xl font-bold tracking-tight text-white sm:text-6xl">
        Rescue Studio
      </h1>
      <p className="mt-4 max-w-xl text-lg text-slate-400">
        แพลตฟอร์มสร้างระบบแจ้งเหตุฉุกเฉินผ่าน QR Code — Coming Soon
      </p>
    </main>
  );
}
