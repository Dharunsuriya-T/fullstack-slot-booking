export default function Login() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="bg-white p-8 rounded-xl shadow-md w-full max-w-sm text-center">
        <h1 className="text-2xl font-semibold mb-6">
          Placement Portal
        </h1>

        <button
          onClick={() => {
            window.location.href =
              'http://localhost:3000/auth/google';
          }}
          className="
            w-full py-2 rounded-lg
            bg-indigo-600 text-white
            hover:bg-indigo-700
            transition
          "
        >
          Sign in with Google
        </button>
      </div>
    </div>
  );
}
