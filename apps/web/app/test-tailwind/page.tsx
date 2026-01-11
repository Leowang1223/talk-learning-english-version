export default function TestTailwind() {
  return (
    <div className="min-h-screen bg-blue-500 flex items-center justify-center">
      <div className="bg-white p-8 rounded-lg shadow-lg">
        <h1 className="text-2xl font-bold text-gray-800 mb-4">Tailwind CSS 測試</h1>
        <p className="text-gray-600 mb-4">如果你看到這個頁面有樣式，表示 Tailwind CSS 正常工作。</p>
        <button className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
          測試按鈕
        </button>
      </div>
    </div>
  )
}
