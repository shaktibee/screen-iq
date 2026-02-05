import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-4">ScreenIQ</h1>
      <p className="text-gray-600 mb-8">Data management & reporting for media & entertainment</p>
      <div className="flex gap-4">
        <Link
          href="/login"
          className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800"
        >
          Log in
        </Link>
        <Link
          href="/signup"
          className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100"
        >
          Sign up
        </Link>
      </div>
    </div>
  );
}
