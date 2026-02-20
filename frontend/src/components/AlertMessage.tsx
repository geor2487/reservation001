type Props = {
  error?: string;
  success?: string;
};

export function AlertMessage({ error, success }: Props) {
  return (
    <>
      {error && (
        <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4 text-sm">{error}</div>
      )}
      {success && (
        <div className="bg-green-50 text-green-600 p-3 rounded-lg mb-4 text-sm">{success}</div>
      )}
    </>
  );
}
