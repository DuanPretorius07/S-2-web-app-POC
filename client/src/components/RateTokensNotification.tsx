import { useEffect, useState, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';

export default function RateTokensNotification() {
  const { user } = useAuth();
  const [showNotification, setShowNotification] = useState(false);
  const [showOutOfTokensModal, setShowOutOfTokensModal] = useState(false);
  const previousTokensRef = useRef<{ remaining: number | null; used: number | null } | null>(null);

  useEffect(() => {
    if (!user) {
      setShowNotification(false);
      setShowOutOfTokensModal(false);
      previousTokensRef.current = null;
      return;
    }

    const tokensRemaining = user.rateTokensRemaining ?? 3;
    const tokensUsed = user.rateTokensUsed ?? 0;
    const previousTokens = previousTokensRef.current;
    const isFirstLoad = previousTokens === null;
    const tokensChanged = previousTokens !== null && (previousTokens.remaining !== tokensRemaining || previousTokens.used !== tokensUsed);

    const shouldShow = isFirstLoad || tokensChanged;
    if (shouldShow) {
      previousTokensRef.current = { remaining: tokensRemaining, used: tokensUsed };
      setShowNotification(true);
      // On first load (login) with 0 tokens, show prominent modal immediately
      if (tokensRemaining === 0 && isFirstLoad) {
        setShowOutOfTokensModal(true);
      }
      if (tokensRemaining !== 0) {
        const timer = setTimeout(() => setShowNotification(false), 8000);
        return () => clearTimeout(timer);
      }
    }
  }, [user]);

  if (!user) return null;

  const tokensRemaining = user.rateTokensRemaining ?? 3;
  const tokensUsed = user.rateTokensUsed ?? 0;
  const isNewUser = tokensUsed === 0 && tokensRemaining === 3;
  const hasNoTokens = tokensRemaining === 0;

  // When user logged in with 0 tokens: show prominent modal (immediate pop-up)
  if (showOutOfTokensModal && hasNoTokens) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[100] p-4">
        <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 border-2 border-red-200">
          <div className="flex items-start gap-4">
            <span className="text-3xl flex-shrink-0" aria-hidden>⚠️</span>
            <div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Out of rate tokens</h3>
              <p className="text-gray-700 mb-4">
                You have used all of your rate request tokens. If you would like to request additional quotes or take this further, please contact S2 International directly. We will be happy to assist you.
              </p>
              <a
                href="https://www.s-2international.com/contact"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block text-s2-red font-semibold hover:underline mb-4"
              >
                Contact S2 International →
              </a>
              <button
                onClick={() => { setShowOutOfTokensModal(false); setShowNotification(false); }}
                className="w-full py-3 px-4 bg-gray-100 text-gray-800 rounded-lg font-semibold hover:bg-gray-200"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!showNotification) return null;

  return (
    <div className="fixed top-4 right-4 z-50 max-w-md animate-slide-in">
      <div
        className={`rounded-lg shadow-lg p-6 border-2 ${
          hasNoTokens
            ? 'bg-red-50 border-red-200'
            : isNewUser
            ? 'bg-blue-50 border-blue-200'
            : 'bg-yellow-50 border-yellow-200'
        }`}
      >
        <div className="flex items-start">
          <div className="flex-shrink-0">
            {hasNoTokens ? (
              <span className="text-2xl">⚠️</span>
            ) : isNewUser ? (
              <span className="text-2xl">ℹ️</span>
            ) : (
              <span className="text-2xl">📊</span>
            )}
          </div>
          <div className="ml-3 flex-1">
            <h3
              className={`text-lg font-semibold mb-2 ${
                hasNoTokens ? 'text-red-800' : isNewUser ? 'text-blue-800' : 'text-yellow-800'
              }`}
            >
              {hasNoTokens
                ? 'Rate Requests Exhausted'
                : isNewUser
                ? 'Welcome! Rate Request Limit'
                : 'Rate Requests Remaining'}
            </h3>
            <p
              className={`text-sm mb-3 ${
                hasNoTokens ? 'text-red-700' : isNewUser ? 'text-blue-700' : 'text-yellow-700'
              }`}
            >
              {hasNoTokens ? (
                <>
                  You have used all 3 rate requests. Please contact{' '}
                  <a
                    href="https://www.s-2international.com/contact"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline font-semibold"
                  >
                    S2 International
                  </a>{' '}
                  directly for additional quotes.
                </>
              ) : isNewUser ? (
                <>
                  You have <strong>3 rate requests</strong> available. Once you've used all 3, please
                  contact{' '}
                  <a
                    href="https://www.s-2international.com/contact"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline font-semibold"
                  >
                    S2 International
                  </a>{' '}
                  directly for additional quotes.
                </>
              ) : (
                <>
                  You have <strong>{tokensRemaining} rate request{tokensRemaining === 1 ? '' : 's'}</strong> remaining
                  out of 3 total.
                </>
              )}
            </p>
            <button
              onClick={() => setShowNotification(false)}
              className={`mt-2 px-4 py-2 rounded font-semibold text-sm ${
                hasNoTokens
                  ? 'bg-red-100 text-red-800 hover:bg-red-200'
                  : isNewUser
                  ? 'bg-blue-100 text-blue-800 hover:bg-blue-200'
                  : 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
              }`}
            >
              Got it
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
