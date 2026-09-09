import { useEffect, useState } from 'react';
import { acpReadDefaults } from '../../acp/providers';
import { Goose } from '../icons';
import { Button } from '../ui/button';
import { defineMessages, useIntl } from '../../i18n';

const i18n = defineMessages({
  welcomeTitle: {
    id: 'onboardingGuard.welcomeTitle',
    defaultMessage: 'Welcome to goose',
  },
  welcomeDescription: {
    id: 'onboardingGuard.welcomeDescription',
    defaultMessage: 'Your local AI agent. Connect an AI model provider to get started.',
  },
  checkProviderErrorTitle: {
    id: 'onboardingGuard.checkProviderErrorTitle',
    defaultMessage: 'Unable to connect to Goose server',
  },
  checkProviderErrorDescription: {
    id: 'onboardingGuard.checkProviderErrorDescription',
    defaultMessage: 'The server may be starting up or temporarily unavailable.',
  },
  retry: {
    id: 'onboardingGuard.retry',
    defaultMessage: 'Retry',
  },
});

interface OnboardingGuardProps {
  children: React.ReactNode;
}

export default function OnboardingGuard({ children }: OnboardingGuardProps) {
  const intl = useIntl();
  const [isCheckingProvider, setIsCheckingProvider] = useState(true);
  const [hasProvider, setHasProvider] = useState(false);
  const [checkProviderError, setCheckProviderError] = useState(false);

  const checkProvider = async (retries = 3, delay = 1000) => {
    setIsCheckingProvider(true);
    setCheckProviderError(false);
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        await acpReadDefaults();
        setHasProvider(true);
        setIsCheckingProvider(false);
        return;
      } catch (error) {
        console.error(`Error checking provider (attempt ${attempt + 1}/${retries + 1}):`, error);
        if (attempt < retries) {
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }
    setCheckProviderError(true);
    setIsCheckingProvider(false);
  };

  useEffect(() => {
    checkProvider();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (isCheckingProvider) {
    return null;
  }

  if (checkProviderError) {
    return (
      <div className="h-screen w-full bg-background-default flex flex-col items-center justify-center">
        <div className="text-center max-w-md">
          <div className="mb-4">
            <Goose className="size-8 mx-auto" />
          </div>
          <h1 className="text-xl font-light mb-3">
            {intl.formatMessage(i18n.checkProviderErrorTitle)}
          </h1>
          <p className="text-text-muted mb-6">
            {intl.formatMessage(i18n.checkProviderErrorDescription)}
          </p>
          <Button onClick={() => checkProvider()}>{intl.formatMessage(i18n.retry)}</Button>
        </div>
      </div>
    );
  }

  if (hasProvider) {
    return <>{children}</>;
  }

  return null;
}
