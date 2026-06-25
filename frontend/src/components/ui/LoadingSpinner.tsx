export function LoadingSpinner({ className = 'w-8 h-8' }: { className?: string }) {
  return (
    <div className={`${className} animate-spin rounded-full border-4 border-gray-200 border-t-blue-600`} />
  );
}

export function PageLoading() {
  return (
    <div className="flex items-center justify-center min-h-[40vh]">
      <LoadingSpinner />
    </div>
  );
}
