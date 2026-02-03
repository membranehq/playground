/**
 * Connectible entity - represents something the user can connect to.
 * Unifies integrations, apps, and connectors into a single searchable type.
 */
export interface Connectible {
  name: string;
  logoUri?: string;
  /**
   * Parameters to use for connecting.
   * Always has either integrationId or connectorId (items without either are filtered out).
   */
  connectParameters: {
    integrationId?: string;
    connectorId?: string;
  };
  /** Integration details if this is an existing integration */
  integration?: {
    id: string;
    key?: string;
    state?: string;
    connectorId?: string;
  };
  /** External app details if found */
  externalApp?: {
    id: string;
    key?: string;
    name?: string;
  };
  /** Connector details if found */
  connector?: {
    id: string;
    name?: string;
  };
}
