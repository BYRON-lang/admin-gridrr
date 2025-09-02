export default function VerifyEmailPage() {
  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="border border-white/20 rounded-lg w-full max-w-md p-8 text-center">
        <h1 className="text-white text-2xl font-bold mb-4">Verify your email</h1>
        <p className="text-white/70 mb-6">
          We've sent a verification link to your email address.
        </p>
        <div className="h-16 w-16 mx-auto mb-6 border-2 border-white/20 rounded-full flex items-center justify-center">
          <svg
            className="w-8 h-8 text-white"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>
        <p className="text-white/50 text-sm">
          Didn't receive an email?{' '}
          <button className="text-white hover:underline">Resend</button>
        </p>
      </div>
    </div>
  );
}
