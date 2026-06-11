export type ValidatorInput = {
  dealershipId: string;
  platformSlug: string;
  config: Record<string, any>;
  secrets: Record<string, string | null>;
};

export type ValidatorOutput = {
  success: boolean;
  code: string;
  safeReason?: string;
};

export async function validateSftpStub(input: ValidatorInput): Promise<ValidatorOutput> {
  const { config, secrets } = input;
  const username = (config.sftpUsername || config.accountId || '').toString().toLowerCase();

  // Simulate network latency
  await new Promise(resolve => setTimeout(resolve, 800));

  if (username.includes('timeout')) {
    return {
      success: false,
      code: 'TIMEOUT',
      safeReason: 'Connection timed out. Please verify your IP is whitelisted or try again later.'
    };
  }

  if (username.includes('auth')) {
    return {
      success: false,
      code: 'AUTH_FAILED',
      safeReason: 'Authentication failed. Please verify your SFTP username and password.'
    };
  }

  if (username.includes('ok')) {
    return {
      success: true,
      code: 'SUCCESS'
    };
  }

  // Default to failure if it's not 'ok'
  return {
    success: false,
    code: 'NOT_CONFIGURED',
    safeReason: 'Could not establish a connection to the SFTP server.'
  };
}
