
import { createHash } from 'node:crypto';
import { env } from '../config/env';
import { AppError } from '../utils/errors';

interface PayPalTokenResponse {
  access_token?: unknown;
  expires_in?: unknown;
}

interface PayPalOrderResponse {
  id?: string;
  status?: string;
  links?: Array<{
    href?: string;
    rel?: string;
  }>;
}

export interface PayPalCaptureResponse {
  id?: string;
  status?: string;
  purchase_units?: Array<{
    payments?: {
      captures?: Array<{
        id?: string;
        status?: string;
        amount?: {
          currency_code?: string;
          value?: string;
        };
      }>;
    };
  }>;
}

let cachedToken: {
  value: string;
  expiresAt: number;
} | null = null;

/**
 * Generate a stable idempotency key.
 * Retrying the same operation for a commitment uses the same key.
 */
function getIdempotencyKey(operation: string, commitmentId: string) {
  return createHash('sha256')
    .update(`commitmesh:${operation}:${commitmentId}`)
    .digest('hex')
    .slice(0, 32);
}

/**
 * Return the configured PayPal API base URL.
 */
function getBaseUrl() {
  return env.PAYPAL_BASE_URL.replace(/\/+$/, '');
}

/**
 * Authenticate with PayPal using client credentials.
 * Access tokens are cached until shortly before expiration.
 */
async function getAccessToken(): Promise<string> {
  const clientId = env.PAYPAL_CLIENT_ID;
  const clientSecret = env.PAYPAL_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new AppError(
      503,
      'PAYPAL_NOT_CONFIGURED',
      'PayPal credentials are not configured on the backend.',
    );
  }

  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) {
    return cachedToken.value;
  }

  let response: Response;

  try {
    response = await fetch(`${getBaseUrl()}/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(
          `${clientId}:${clientSecret}`,
        ).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
      },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
      }),
      signal: AbortSignal.timeout(15000),
    });
  } catch {
    throw new AppError(
      502,
      'PAYPAL_AUTH_UNAVAILABLE',
      'Could not connect to PayPal authentication.',
    );
  }

  const data = (await response.json().catch(() => null)) as
    | PayPalTokenResponse
    | null;

  if (
    !response.ok ||
    typeof data?.access_token !== 'string'
  ) {
    throw new AppError(
      502,
      'PAYPAL_AUTH_FAILED',
      'PayPal authentication failed. Check the Sandbox credentials.',
      {
        paypalStatus: response.status,
      },
    );
  }

  const expiresIn =
    typeof data.expires_in === 'number' ? data.expires_in : 300;

  cachedToken = {
    value: data.access_token,
    expiresAt: Date.now() + Math.max(0, expiresIn - 60) * 1000,
  };

  return cachedToken.value;
}

/**
 * Shared authenticated PayPal API request helper.
 */
async function paypalRequest<T>(
  path: string,
  method: 'POST',
  body: unknown,
  requestId: string,
): Promise<T> {
  const accessToken = await getAccessToken();

  let response: Response;

  try {
    response = await fetch(`${getBaseUrl()}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Prefer: 'return=representation',
        'PayPal-Request-Id': requestId,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(20000),
    });
  } catch {
    throw new AppError(
      502,
      'PAYPAL_UNAVAILABLE',
      'Could not connect to PayPal. Please retry safely.',
    );
  }

  const data: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    const errorData =
      typeof data === 'object' && data !== null
        ? (data as Record<string, unknown>)
        : {};

    throw new AppError(
      502,
      'PAYPAL_API_ERROR',
      `PayPal returned an error (HTTP ${response.status}).`,
      {
        paypalStatus: response.status,
        debugId:
          typeof errorData.debug_id === 'string'
            ? errorData.debug_id
            : undefined,
      },
    );
  }

  if (
    !data ||
    typeof data !== 'object' ||
    Array.isArray(data)
  ) {
    throw new AppError(
      502,
      'PAYPAL_INVALID_RESPONSE',
      'PayPal returned an invalid response.',
    );
  }

  return data as T;
}

/**
 * Create a PayPal checkout order.
 *
 * The buyer is redirected to the approval URL returned by PayPal.
 * After approval, PayPal redirects to the frontend return URL.
 */
export async function createPayPalOrder(input: {
  commitmentId: string;
  amountCents: number;
  description: string;
}) {
  const frontendUrl = env.FRONTEND_URL.replace(/\/+$/, '');

  const response = await paypalRequest<PayPalOrderResponse>(
    '/v2/checkout/orders',
    'POST',
    {
      intent: 'CAPTURE',

      payment_source: {
        paypal: {
          experience_context: {
            return_url:
              `${frontendUrl}/?paypal=return&commitmentId=${encodeURIComponent(input.commitmentId)}`,

            cancel_url:
              `${frontendUrl}/?paypal=cancel&commitmentId=${encodeURIComponent(input.commitmentId)}`,

            user_action: 'PAY_NOW',
            shipping_preference: 'NO_SHIPPING',
          },
        },
      },

      purchase_units: [
        {
          reference_id: input.commitmentId,
          custom_id: input.commitmentId,
          description: input.description.slice(0, 127),

          amount: {
            currency_code: 'USD',
            value: (input.amountCents / 100).toFixed(2),
          },
        },
      ],
    },
    getIdempotencyKey('order', input.commitmentId),
  );

  if (!response.id) {
    throw new AppError(
      502,
      'PAYPAL_ORDER_INVALID',
      'PayPal did not return an order ID.',
    );
  }

  const approvalLink = response.links?.find(
    (link) =>
      link.rel === 'approve' ||
      link.rel === 'payer-action',
  );

  if (!approvalLink?.href) {
    throw new AppError(
      502,
      'PAYPAL_APPROVAL_URL_MISSING',
      'PayPal did not return a buyer approval URL.',
    );
  }

  return {
    orderId: response.id,
    status: response.status ?? 'CREATED',
    approvalUrl: approvalLink.href,
  };
}

/**
 * Capture a buyer-approved PayPal order.
 *
 * The commitment ID generates a stable idempotency key so
 * retries do not accidentally create duplicate captures.
 */
export async function capturePayPalOrder(
  orderId: string,
  commitmentId: string,
) {
  return paypalRequest<PayPalCaptureResponse>(
    `/v2/checkout/orders/${encodeURIComponent(orderId)}/capture`,
    'POST',
    {},
    getIdempotencyKey('capture', commitmentId),
  );
}
