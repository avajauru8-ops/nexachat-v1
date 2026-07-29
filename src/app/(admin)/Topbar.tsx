export function Topbar() {
  return (
    <header className="bg-white shadow-sm h-16 flex items-center justify-between px-6 border-b border-gray-200">
      <h2 className="text-xl font-semibold text-gray-800">Admin Control Panel</h2>
      <div className="flex items-center space-x-4">
        <div className="text-sm text-gray-600 font-medium px-3 py-1 bg-gray-100 rounded-full">
          Admin Mode
        </div>
      </div>
    </header>
  );
}
