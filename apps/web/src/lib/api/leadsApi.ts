// SENT_TO_CRM_ADDRESS means a mail server accepted the email; CRM import is never confirmed.
export type LeadCrmDeliveryStatus = 'NOT_SENT' | 'SENDING' | 'SENT_TO_CRM_ADDRESS' | 'FAILED';

export type LeadCrmSendBlocker = 'NO_CRM_ADDRESS' | 'CRM_ADDRESS_NOT_EMAIL' | 'EMAIL_NOT_CONFIGURED' | 'SEND_IN_PROGRESS' | 'UNSUPPORTED_INVENTORY_TYPE';

export type LeadDeliveryAttemptItem = {
  id: string;
  destinationType: string;
  destinationLabel: string;
  destinationAddress: string;
  status: string;
  payloadFormat: string;
  attemptCount: number;
  lastAttemptAt: string | null;
  deliveredAt: string | null;
  errorMessage: string | null;
  createdAt: string;
};

export type LeadDeliveryDetailsDto = {
  leadId: string;
  deliveryStatus: LeadCrmDeliveryStatus;
  adfXmlPayload: string;
  crmEndpoint: string | null;
  canSend: boolean;
  sendBlocker: LeadCrmSendBlocker | null;
  sendBlockerMessage: string | null;
  attempts: LeadDeliveryAttemptItem[];
  vehicle: {
    stockNumber: string;
    year?: number | null;
    make?: string | null;
    model?: string | null;
  } | null;
  customer: {
    name: string | null;
    email: string | null;
    phone: string | null;
  };
};

export async function fetchLeadDeliveryDetails(
  dealershipId: string,
  leadId: string,
): Promise<LeadDeliveryDetailsDto> {
  const res = await fetch(`/api/dealers/${dealershipId}/leads/${leadId}/delivery`, {
    credentials: 'include',
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `HTTP ${res.status}`);
  }
  return res.json();
}

// Emails the lead to the dealership's configured CRM address. The server picks the address.
export async function sendLeadToCrm(
  dealershipId: string,
  leadId: string,
): Promise<LeadDeliveryDetailsDto> {
  const res = await fetch(`/api/dealers/${dealershipId}/leads/${leadId}/delivery/retry`, {
    method: 'POST',
    credentials: 'include',
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `HTTP ${res.status}`);
  }
  return res.json();
}
