type Props = {
  message: string;
  onRetry: () => void;
  title?: string;
};

export function ErrorState({ message, onRetry, title = 'Something went wrong' }: Props) {
  return (
    <div className="mp-card border-red-100 bg-red-50 px-5 py-10 text-center sm:px-8 sm:py-12" role="alert">
      <p className="text-sm font-semibold text-red-800">{title}</p>
      <p className="mt-2 text-sm text-red-700">{message}</p>
      <button type="button" onClick={onRetry} className="mp-btn-primary mt-5 bg-red-600 hover:bg-red-700">
        Try again
      </button>
    </div>
  );
}
