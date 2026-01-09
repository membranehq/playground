import crypto from 'crypto';

// TODO: Move to environment variables
const SECRET_KEY = 'my-secret-key-#$';
export const WORKFLOW_EVENT_VERIFICATION_HASH_HEADER = 'x-workflow-event-verification-hash';

export function generateVerificationHashForWorkflowEvent(workflowId: string): string {
  return crypto.createHmac('sha256', SECRET_KEY).update(workflowId).digest('hex');
}

export function verifyVerificationHashForWorkflowEvent(workflowId: string, verificationHash: string): boolean {
  const generatedVerificationHash = generateVerificationHashForWorkflowEvent(workflowId);

  return crypto.timingSafeEqual(Buffer.from(verificationHash), Buffer.from(generatedVerificationHash));
}
