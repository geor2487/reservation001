import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen flex items-center justify-center relative">
      <div className="text-center space-y-8 p-8">
        <h1 className="text-4xl font-bold text-gray-800">POND</h1>
        <div>
          <Link
            href="/reserve"
            className="block w-64 mx-auto py-3 px-6 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition font-medium"
          >
            予約する
          </Link>
        </div>
      </div>
      <div className="absolute bottom-0 left-0 right-0 py-4 text-center">
        <Link
          href="/admin"
          className="text-xs text-gray-400 hover:text-gray-600 transition"
        >
          スタッフはこちら
        </Link>
      </div>
    </div>
  );
}
